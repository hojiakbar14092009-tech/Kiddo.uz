import { isAdminPreview } from '@/app/preview/adminPreview'
import { useAnalyticsStore, type AnalyticsEvent } from '@/domain/analytics'
import { tashkentDay } from '@/lib/dates'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/services/supabase/config'

/*
 * Sends the device's anonymous analytics (Phase 37) in batches of up to 100
 * to the `analytics` Edge Function (Phase 53), which limits each IP and then
 * adds them with the server's `add_analytics_events`. Offline or failing:
 * the events wait and go with the next try; the server ignores an event it
 * already has, so a lost answer never counts twice. A batch the server
 * refuses for its content (never valid, e.g. a wrong device clock) and
 * events older than two days (the server would refuse them) are dropped, so
 * nothing blocks the queue.
 */

export const ANALYTICS_BATCH = 100
/** The server keeps events at most this many days old. */
export const MAX_EVENT_AGE_DAYS = 2

export type SendResult = 'ok' | 'retry' | 'drop'
export type AnalyticsSender = (events: readonly AnalyticsEvent[]) => Promise<SendResult>

let sending = false

function tooOld(event: AnalyticsEvent, today: string): boolean {
  const age = (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${event.day}T00:00:00Z`)) / 86_400_000
  return !(age <= MAX_EVENT_AGE_DAYS)
}

export async function flushAnalytics(
  send: AnalyticsSender,
  now: Date = new Date(),
): Promise<number> {
  if (sending) return 0
  sending = true
  let total = 0
  try {
    const today = tashkentDay(now)
    const stale = useAnalyticsStore
      .getState()
      .queue.filter((event) => tooOld(event, today))
      .map((event) => event.id)
    if (stale.length > 0) useAnalyticsStore.getState().sent(stale)
    for (;;) {
      const batch = useAnalyticsStore.getState().queue.slice(0, ANALYTICS_BATCH)
      if (batch.length === 0) break
      const result = await send(batch).catch((): SendResult => 'retry')
      if (result === 'retry') break
      useAnalyticsStore.getState().sent(batch.map((event) => event.id))
      if (result === 'ok') total += batch.length
      if (batch.length < ANALYTICS_BATCH) break
    }
  } finally {
    sending = false
  }
  return total
}

const rowOf = (event: AnalyticsEvent) => ({
  id: event.id,
  install: event.install,
  name: event.name,
  day: event.day,
  at: event.at,
  ...(event.screen ? { screen: event.screen } : {}),
})

/**
 * The page is being hidden or closed: hand the waiting events to the browser
 * with `keepalive`, so they arrive even if this is the family's last visit.
 * Nothing is removed (the answer may never come); the next normal send
 * repeats them and the server ignores the ones it already has.
 */
export function sendOnLeave(
  url: string = SUPABASE_URL,
  key: string = SUPABASE_ANON_KEY,
  now: Date = new Date(),
): boolean {
  if (!url || !key || typeof fetch !== 'function' || isAdminPreview()) return false
  const today = tashkentDay(now)
  const events = useAnalyticsStore
    .getState()
    .queue.filter((event) => !tooOld(event, today))
    .slice(-ANALYTICS_BATCH)
  if (events.length === 0) return false
  void postEvents(url, key, events, true).catch(() => undefined)
  return true
}

/** The address of the `analytics` Edge Function. */
export function analyticsEndpoint(url: string): string {
  return `${url.replace(/\/$/, '')}/functions/v1/analytics`
}

function postEvents(
  url: string,
  key: string,
  events: readonly AnalyticsEvent[],
  keepalive = false,
): Promise<Response> {
  return fetch(analyticsEndpoint(url), {
    method: 'POST',
    keepalive,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ events: events.map(rowOf) }),
  })
}

/**
 * The function's answer: 400 is a refusal for the data itself (sending again
 * will not help); anything else that is not OK (offline, 429 for a busy
 * address, 5xx) waits for the next try.
 */
export function resultOf(status: number): SendResult {
  if (status >= 200 && status < 300) return 'ok'
  return status === 400 ? 'drop' : 'retry'
}

/** The cloud sender (only when the cloud is configured). */
export function cloudAnalyticsSender(
  url: string = SUPABASE_URL,
  key: string = SUPABASE_ANON_KEY,
): AnalyticsSender | null {
  // the admin's sandbox tab is never counted (Phase 51)
  if (!url || !key || isAdminPreview() || typeof fetch !== 'function') return null
  return async (events) => resultOf((await postEvents(url, key, events)).status)
}

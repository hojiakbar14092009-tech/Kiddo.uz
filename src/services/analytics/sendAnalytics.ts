import { useAnalyticsStore, type AnalyticsEvent } from '@/domain/analytics'
import { tashkentDay } from '@/lib/dates'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/services/supabase/config'

/*
 * Sends the device's anonymous analytics (Phase 37) in batches of up to 100
 * through the server's `add_analytics_events` function. Offline or failing:
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
  if (!url || !key || typeof fetch !== 'function') return false
  const today = tashkentDay(now)
  const events = useAnalyticsStore
    .getState()
    .queue.filter((event) => !tooOld(event, today))
    .slice(-ANALYTICS_BATCH)
  if (events.length === 0) return false
  void fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/add_analytics_events`, {
    method: 'POST',
    keepalive: true,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_events: events.map(rowOf) }),
  }).catch(() => undefined)
  return true
}

/**
 * Errors about the data itself (a check, a bad value, the server's own
 * refusal such as `bad_batch`): sending again will not help.
 */
const CONTENT_ERRORS = /^(22|23|P0001$)/

/** The Supabase sender (loaded on demand, only when the cloud is configured). */
export async function supabaseAnalyticsSender(): Promise<AnalyticsSender | null> {
  const { getSupabase } = await import('@/services/supabase/client')
  const supabase = getSupabase()
  if (!supabase) return null
  return async (events) => {
    const { error } = await supabase.rpc('add_analytics_events', {
      p_events: events.map(rowOf),
    })
    if (!error) return 'ok'
    return CONTENT_ERRORS.test(error.code ?? '') ? 'drop' : 'retry'
  }
}

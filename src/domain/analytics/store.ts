import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { newId } from '@/lib/id'
import { tashkentDay } from '@/lib/dates'
import {
  ANALYTICS_EVENTS,
  ANALYTICS_ONCE,
  onceKey,
  returnEventsFor,
  type AnalyticsEvent,
  type AnalyticsEventName,
} from './analytics'

/* The device's analytics queue (Phase 37): events wait here until sent. */

/** Unsent events kept at most (oldest dropped first). */
export const MAX_QUEUE = 300
/** Events kept on the device for the device admin's view. */
export const MAX_LOG = 1000
/** "Already recorded today" keys kept at most ("ever" keys are kept for good). */
const MAX_DAILY = 200

interface AnalyticsState {
  /** The parent may switch the anonymous statistics off (nothing is recorded or sent then). */
  enabled: boolean
  install: string
  /** The local day the app was first opened on this device. */
  firstDay: string | null
  /** Events recorded once ever: never trimmed. */
  ever: string[]
  /** Events recorded once a day: the latest days only. */
  once: string[]
  queue: AnalyticsEvent[]
  log: AnalyticsEvent[]
  track: (name: AnalyticsEventName, options?: { screen?: string; at?: Date }) => void
  /** Removes events the server has accepted. */
  sent: (ids: readonly string[]) => void
  setEnabled: (enabled: boolean) => void
}

export const useAnalyticsStore = create<AnalyticsState>()(
  persist(
    (set) => ({
      enabled: true,
      install: newId(),
      firstDay: null,
      ever: [],
      once: [],
      queue: [],
      log: [],
      track: (name, options = {}) =>
        set((state) => {
          if (!state.enabled) return state
          if (!(ANALYTICS_EVENTS as readonly string[]).includes(name)) return state
          const at = options.at ?? new Date()
          const day = tashkentDay(at)
          const key = onceKey(name, day)
          const forever = ANALYTICS_ONCE[name] === 'ever'
          if (key && (forever ? state.ever : state.once).includes(key)) return state
          const event: AnalyticsEvent = {
            id: newId(),
            name,
            install: state.install,
            day,
            at: at.toISOString(),
            ...(options.screen ? { screen: options.screen } : {}),
          }
          // only the day's last leaving counts: an earlier one of the same day is replaced,
          // so frequent app switches never push the first steps out of the queue or the log
          const earlier = (e: AnalyticsEvent) =>
            name === 'app_closed' && e.name === name && e.day === day
          return {
            ...(key && forever ? { ever: [...state.ever, key] } : {}),
            ...(key && !forever ? { once: [...state.once, key].slice(-MAX_DAILY) } : {}),
            queue: [...state.queue.filter((e) => !earlier(e)), event].slice(-MAX_QUEUE),
            log: [...state.log.filter((e) => !earlier(e)), event].slice(-MAX_LOG),
          }
        }),
      sent: (ids) =>
        set((state) => {
          const done = new Set(ids)
          return { queue: state.queue.filter((event) => !done.has(event.id)) }
        }),
      // switched off: nothing waits to be sent either
      setEnabled: (enabled) => set(enabled ? { enabled } : { enabled, queue: [] }),
    }),
    { name: 'kiddo.analytics', version: 1 },
  ),
)

/**
 * The app was opened (or came back to the front on a new day): the first
 * open ever (never for a family that already has children when analytics
 * starts), the day's open and, on the right days, the return.
 */
export function trackAppOpened(
  at: Date = new Date(),
  { existingFamily = false }: { existingFamily?: boolean } = {},
): void {
  const store = useAnalyticsStore.getState()
  if (!store.enabled) return
  const today = tashkentDay(at)
  if (!store.firstDay) {
    useAnalyticsStore.setState({ firstDay: today })
    // a family that used Kiddo before analytics existed is not a new install
    if (!existingFamily) store.track('first_opened', { at })
  }
  const firstDay = useAnalyticsStore.getState().firstDay ?? today
  store.track('app_opened', { at })
  for (const name of returnEventsFor(firstDay, today)) store.track(name, { at })
}

export function track(name: AnalyticsEventName, options?: { screen?: string; at?: Date }): void {
  useAnalyticsStore.getState().track(name, options)
}

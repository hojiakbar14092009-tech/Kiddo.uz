import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/*
 * The attention helper (Phase 58, docs/architecture/attention.md): a grown-up is
 * asked once on this device whether the robot may notice when the child looks away
 * or leaves, and remind them. The answer is kept here; a parent changes it later in
 * Settings. Nothing about what the camera sees is ever stored.
 */

export type AttentionConsent = 'unasked' | 'granted' | 'denied'

/** What the helper did on one day for one child (Phase 71, the parent's report). Counts only. */
export interface AttentionDay {
  /** The robot called the child back (looking away, no touch). */
  reminders: number
  /** The child left the app and came back. */
  away: number
  /** Games were offered. */
  offers: number
  /** A game was picked from the offer. */
  games: number
}
export type AttentionEvent = keyof AttentionDay

/** Days kept per child. */
export const LOG_DAYS = 14
const EMPTY_DAY: AttentionDay = { reminders: 0, away: 0, offers: 0, games: 0 }

interface AttentionState {
  consent: AttentionConsent
  /** When the grown-up answered (ISO), for the parent's settings line. */
  answeredAt: string | null
  /** The camera may be used too (only with consent; off when the browser refused it). */
  camera: boolean
  /** Per child (its key), per day `YYYY-MM-DD`: what happened. */
  log: Record<string, Record<string, AttentionDay>>
  answer: (granted: boolean, camera: boolean, now?: Date) => void
  setCamera: (on: boolean) => void
  note: (childKey: string, day: string, event: AttentionEvent) => void
  forgetChild: (childKey: string) => void
}

export const useAttentionStore = create<AttentionState>()(
  persist(
    (set) => ({
      consent: 'unasked',
      answeredAt: null,
      camera: false,
      log: {},
      answer: (granted, camera, now = new Date()) =>
        set({
          consent: granted ? 'granted' : 'denied',
          camera: granted && camera,
          answeredAt: now.toISOString(),
        }),
      setCamera: (on) => set((state) => ({ camera: state.consent === 'granted' && on })),
      note: (childKey, day, event) =>
        set((state) => {
          const days = { ...state.log[childKey] }
          const today = days[day] ?? EMPTY_DAY
          days[day] = { ...today, [event]: today[event] + 1 }
          // only the latest days are kept (ISO days sort as text)
          const kept = Object.keys(days).sort().slice(-LOG_DAYS)
          return {
            log: { ...state.log, [childKey]: Object.fromEntries(kept.map((d) => [d, days[d]!])) },
          }
        }),
      forgetChild: (childKey) =>
        set((state) => {
          const log = { ...state.log }
          delete log[childKey]
          return { log }
        }),
    }),
    { name: 'kiddo.attention', version: 1 },
  ),
)

/** The helper runs only after a grown-up said yes. */
export function attentionOn(state: Pick<AttentionState, 'consent'>): boolean {
  return state.consent === 'granted'
}

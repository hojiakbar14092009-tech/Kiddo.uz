import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** A child leaving Kiddo (closing it, switching apps, locking the tablet) or coming back. */
export interface ActivityEvent {
  id: string
  childId: string
  kind: 'left' | 'returned'
  /** ISO time. */
  at: string
}

/** Only the latest events are kept on the device. */
export const MAX_EVENTS = 200

interface ActivityState {
  events: ActivityEvent[]
  /** When the parent last looked at the list; newer “left” events count as unseen. */
  seenAt: string | null
  record: (childId: string, kind: ActivityEvent['kind'], at?: Date) => void
  markSeen: (at?: Date) => void
}

let counter = 0

export const useActivityStore = create<ActivityState>()(
  persist(
    (set) => ({
      events: [],
      seenAt: null,
      record: (childId, kind, at = new Date()) =>
        set((state) => {
          const last = [...state.events].reverse().find((event) => event.childId === childId)
          // “Returned” only makes sense after “left”, and two “left” in a row are one.
          if (kind === 'returned' && last?.kind !== 'left') return state
          if (kind === 'left' && last?.kind === 'left') return state
          counter += 1
          const event: ActivityEvent = {
            id: `${at.getTime().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 6)}`,
            childId,
            kind,
            at: at.toISOString(),
          }
          return { events: [...state.events, event].slice(-MAX_EVENTS) }
        }),
      markSeen: (at = new Date()) => set({ seenAt: at.toISOString() }),
    }),
    { name: 'kiddo.activity', version: 1 },
  ),
)

export function unseenExits(events: readonly ActivityEvent[], seenAt: string | null) {
  return events.filter((event) => event.kind === 'left' && (!seenAt || event.at > seenAt))
}

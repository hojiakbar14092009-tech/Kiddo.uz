import { create } from 'zustand'
import type { MascotEvent, MascotMessage, MascotMood } from './types'

/** The mood each event puts the robot in. */
export const EVENT_MOOD: Record<MascotEvent, MascotMood> = {
  greet: 'wave',
  peek: 'wave',
  instruct: 'talk',
  correct: 'happy',
  wrong: 'oops',
  rest: 'sleepy',
  locked: 'talk',
  celebrate: 'celebrate',
}

/**
 * How long the mood and bubble stay before the robot relaxes back to idle.
 * `null` keeps them until the next event (an instruction stays while the
 * question is on screen; rest stays until the parent closes the rest screen).
 */
export const EVENT_DURATION_MS: Record<MascotEvent, number | null> = {
  greet: 3500,
  peek: 6500,
  instruct: null,
  correct: 2200,
  wrong: 2600,
  rest: null,
  locked: 3200,
  celebrate: 6000,
}

interface MascotState {
  mood: MascotMood
  message: MascotMessage | null
  /** Bumped on every event so a repeated reaction replays and bubbles re-animate. */
  reactionKey: number
  lastEvent: MascotEvent | null
  react: (event: MascotEvent, message: MascotMessage | null) => void
  /** Back to idle with no bubble (e.g. when leaving a screen). */
  reset: () => void
}

let relaxTimer: ReturnType<typeof setTimeout> | undefined

export const useMascotStore = create<MascotState>()((set) => ({
  mood: 'idle',
  message: null,
  reactionKey: 0,
  lastEvent: null,

  react: (event, message) => {
    clearTimeout(relaxTimer)
    set((state) => ({
      mood: EVENT_MOOD[event],
      message,
      lastEvent: event,
      reactionKey: state.reactionKey + 1,
    }))
    const duration = EVENT_DURATION_MS[event]
    if (duration !== null) {
      relaxTimer = setTimeout(() => set({ mood: 'idle', message: null, lastEvent: null }), duration)
    }
  },

  reset: () => {
    clearTimeout(relaxTimer)
    set({ mood: 'idle', message: null, lastEvent: null })
  },
}))

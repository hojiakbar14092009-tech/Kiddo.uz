import { create } from 'zustand'
import type { MascotMood } from './types'

/** How long a reaction is shown before the robot relaxes back to idle. */
export const REACTION_MS: Record<'happy' | 'oops', number> = { happy: 1900, oops: 2200 }

interface MascotState {
  mood: MascotMood
  /** Bumped on every reaction so the same reaction can replay. */
  reactionKey: number
  react: (reaction: 'happy' | 'oops') => void
  setMood: (mood: MascotMood) => void
}

let relaxTimer: ReturnType<typeof setTimeout> | undefined

export const useMascotStore = create<MascotState>()((set) => ({
  mood: 'idle',
  reactionKey: 0,

  react: (reaction) => {
    clearTimeout(relaxTimer)
    set((state) => ({ mood: reaction, reactionKey: state.reactionKey + 1 }))
    relaxTimer = setTimeout(() => set({ mood: 'idle' }), REACTION_MS[reaction])
  },

  setMood: (mood) => {
    clearTimeout(relaxTimer)
    set({ mood })
  },
}))

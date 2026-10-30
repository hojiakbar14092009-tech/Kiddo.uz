import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language } from '@/content/languages'

interface SettingsState {
  /** `null` until the first language is chosen on the welcome screen. */
  language: Language | null
  /** Master volume for clicks, effects and voice, 0–1. */
  volume: number
  setLanguage: (language: Language) => void
  setVolume: (volume: number) => void
  /** The welcome tour (Phase 25) was seen or skipped on this device. */
  onboarded: boolean
  setOnboarded: (done: boolean) => void
  /** The guided tours seen by a guest (no profile); a profile keeps its own (ChildProfile.tours). */
  guestTours: Partial<Record<string, number>>
  setGuestTours: (tours: Partial<Record<string, number>>) => void
}

export const DEFAULT_VOLUME = 0.8

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: null,
      volume: DEFAULT_VOLUME,
      setLanguage: (language) => set({ language }),
      setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
      onboarded: false,
      setOnboarded: (done) => set({ onboarded: done }),
      guestTours: {},
      setGuestTours: (tours) => set({ guestTours: tours }),
    }),
    {
      name: 'kiddo.settings',
      version: 2,
      // v1 had no tour: a device already in use (a language chosen) skips it
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<SettingsState>
        return version < 2 ? { ...state, onboarded: state.language != null } : state
      },
    },
  ),
)

/** The active language for child screens (they are only reachable once one is chosen). */
export function useLanguage(): Language {
  return useSettingsStore((state) => state.language) ?? 'uz'
}

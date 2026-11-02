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
  /** A slower voice: longer pauses between a letter and its word (Phase 41). */
  slowVoice: boolean
  setSlowVoice: (slow: boolean) => void
  /** Instructions and questions are read out on their own (Phase 41); off: only on a tap. */
  autoVoice: boolean
  /**
   * The cloud accounts (user ids) whose parent keeps the children's photos in the cloud
   * (private, Phase 44), so they come back on another device. Per account: another parent
   * signing in on this device has not turned it on. Otherwise a photo never leaves the device.
   */
  cloudPhotosFor: string[]
  setCloudPhotos: (userId: string, on: boolean) => void
  /** Cloud photos still to be removed, as `<parent id>/<child id>` (done when that account signs in). */
  photoRemovals: string[]
  setPhotoRemovals: (ids: string[]) => void
  setAutoVoice: (on: boolean) => void
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
      slowVoice: false,
      setSlowVoice: (slow) => set({ slowVoice: slow }),
      autoVoice: true,
      setAutoVoice: (on) => set({ autoVoice: on }),
      cloudPhotosFor: [],
      setCloudPhotos: (userId, on) =>
        set((state) => ({
          cloudPhotosFor: on
            ? [...new Set([...state.cloudPhotosFor, userId])]
            : state.cloudPhotosFor.filter((id) => id !== userId),
        })),
      photoRemovals: [],
      setPhotoRemovals: (ids) => set({ photoRemovals: [...new Set(ids)].slice(-50) }),
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

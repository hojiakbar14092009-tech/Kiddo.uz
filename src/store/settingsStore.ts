import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language } from '@/content/languages'

interface SettingsState {
  /** `null` until the first language is chosen on the welcome screen. */
  language: Language | null
  setLanguage: (language: Language) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: null,
      setLanguage: (language) => set({ language }),
    }),
    { name: 'kiddo.settings', version: 1 },
  ),
)

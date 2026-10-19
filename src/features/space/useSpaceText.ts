import type { Language } from '@/content/languages'
import { useSettingsStore } from '@/store/settingsStore'
import { TEXT } from './content'

/** The current app language (the section speaks and writes in it). */
export function useSpaceLanguage(): Language {
  return useSettingsStore((state) => state.language) ?? 'uz'
}

export function useSpaceText() {
  return TEXT[useSpaceLanguage()]
}

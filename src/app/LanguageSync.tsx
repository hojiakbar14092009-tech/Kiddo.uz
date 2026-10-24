import { useEffect } from 'react'
import { applyLanguage } from '@/i18n'
import { useSettingsStore } from '@/store/settingsStore'

/** Keeps i18next and `<html lang>` in step with the stored language. */
export function LanguageSync() {
  const language = useSettingsStore((state) => state.language)
  const setLanguage = useSettingsStore((state) => state.setLanguage)

  useEffect(() => {
    // texts that could not load: the stored choice goes back to the language on screen
    if (language) applyLanguage(language, setLanguage)
  }, [language, setLanguage])

  return null
}

import { useEffect } from 'react'
import { applyLanguage } from '@/i18n'
import { useSettingsStore } from '@/store/settingsStore'

/** Keeps i18next and `<html lang>` in step with the stored language. */
export function LanguageSync() {
  const language = useSettingsStore((state) => state.language)

  useEffect(() => {
    if (language) applyLanguage(language)
  }, [language])

  return null
}

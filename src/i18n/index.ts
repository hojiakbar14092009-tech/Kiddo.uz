import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { LANGUAGE_INFO, type Language } from '@/content/languages'
import { en } from './locales/en'
import { ru } from './locales/ru'
import { uz } from './locales/uz'

export const resources = {
  uz: { translation: uz },
  ru: { translation: ru },
  en: { translation: en },
} as const

void i18n.use(initReactI18next).init({
  resources,
  lng: 'uz',
  fallbackLng: 'uz',
  interpolation: { escapeValue: false },
  returnNull: false,
})

/** Switches interface texts and the document language in one place. */
export function applyLanguage(language: Language): void {
  if (i18n.language !== language) {
    void i18n.changeLanguage(language)
  }
  document.documentElement.lang = LANGUAGE_INFO[language].code
}

export default i18n

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { LANGUAGE_INFO, type Language } from '@/content/languages'
import { uz, type Translation } from './locales/uz'

/*
 * Interface texts. Uzbek (the source and the fallback) ships in the first
 * chunk; Russian and English are their own chunks, loaded when they are the
 * child's language (main.tsx waits for it before the first render) or chosen
 * later. Each is about 50–65 KB of text that a child using one language never
 * needs. Worlds add their own words with addResourceBundle, as before.
 */

const LOADERS: Record<Exclude<Language, 'uz'>, () => Promise<Translation>> = {
  ru: () => import('./locales/ru').then((module) => module.ru),
  en: () => import('./locales/en').then((module) => module.en),
}

/** Languages whose interface texts are in i18next (a world's words alone do not count). */
const loaded = new Set<Language>(['uz'])
const pending = new Map<Language, Promise<void>>()

void i18n.use(initReactI18next).init({
  resources: { uz: { translation: uz } },
  lng: 'uz',
  fallbackLng: 'uz',
  interpolation: { escapeValue: false },
  returnNull: false,
})

/** Adds a language's interface texts (the loader, and tests that need every language at once). */
export function registerLanguage(language: Language, texts: Translation): void {
  // deep merge, no overwrite: a world may already have added its own words for this language
  i18n.addResourceBundle(language, 'translation', texts, true, false)
  loaded.add(language)
}

/** Loads a language's interface texts once; later calls share the same request. */
export function loadLanguage(language: Language): Promise<void> {
  if (loaded.has(language) || language === 'uz') return Promise.resolve()
  const running = pending.get(language)
  if (running) return running
  const request = LOADERS[language]()
    .then((texts) => registerLanguage(language, texts))
    .finally(() => pending.delete(language))
  pending.set(language, request)
  return request
}

let latest: Language = 'uz'

/**
 * Switches interface texts and the document language in one place. The texts
 * switch once loaded; when the child changes language twice quickly, the last
 * choice wins. If the texts cannot load (offline before they were cached),
 * the screen keeps the language it has and `onFail` gets that language, so the
 * caller can put the stored choice back in step with what is on screen (a
 * browser does not retry a failed chunk before a reload).
 */
export function applyLanguage(language: Language, onFail?: (onScreen: Language) => void): void {
  latest = language
  document.documentElement.lang = LANGUAGE_INFO[language].code
  const switchTo = () => {
    if (latest === language && i18n.language !== language) void i18n.changeLanguage(language)
  }
  if (loaded.has(language)) {
    switchTo()
    return
  }
  loadLanguage(language).then(switchTo, () => {
    if (latest !== language) return
    const onScreen = (i18n.language as Language | undefined) ?? 'uz'
    latest = onScreen
    document.documentElement.lang = LANGUAGE_INFO[onScreen].code
    onFail?.(onScreen)
  })
}

export default i18n

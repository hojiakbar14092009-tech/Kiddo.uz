export const LANGUAGES = ['uz', 'ru', 'en'] as const

export type Language = (typeof LANGUAGES)[number]

export interface LanguageInfo {
  code: Language
  /** Language name written in that language, so a parent can recognise it. */
  nativeName: string
  /** Short label for the switcher in the top bar. */
  shortLabel: string
  /** BCP-47 tag used for speech and the document `lang` attribute. */
  locale: string
}

export const LANGUAGE_INFO: Record<Language, LanguageInfo> = {
  uz: { code: 'uz', nativeName: 'O‘zbekcha', shortLabel: 'UZ', locale: 'uz-UZ' },
  ru: { code: 'ru', nativeName: 'Русский', shortLabel: 'RU', locale: 'ru-RU' },
  en: { code: 'en', nativeName: 'English', shortLabel: 'EN', locale: 'en-US' },
}

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value)
}

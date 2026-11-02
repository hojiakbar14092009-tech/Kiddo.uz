import type { Language } from '@/content/languages'
import { TRI_WORDS } from './content'

/**
 * Every word the three-language cards can say, per language (for the voice
 * recorder): each word is said in its own language, as written in content.ts.
 */
export const SPOKEN: Record<Language, readonly string[]> = {
  uz: TRI_WORDS.map((item) => item.words.uz),
  ru: TRI_WORDS.map((item) => item.words.ru),
  en: TRI_WORDS.map((item) => item.words.en),
}

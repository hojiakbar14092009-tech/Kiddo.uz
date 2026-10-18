import type { Language } from '@/content/languages'
import { enAlphabet } from './en'
import { ruAlphabet } from './ru'
import type { Alphabet, LetterEntry } from './types'
import { uzAlphabet } from './uz'

export type { Alphabet, LetterEntry } from './types'

const ALPHABETS: Record<Language, Alphabet> = {
  uz: uzAlphabet,
  ru: ruAlphabet,
  en: enAlphabet,
}

export function getAlphabet(language: Language): Alphabet {
  return ALPHABETS[language]
}

export function findLetter(language: Language, letterId: string): LetterEntry | undefined {
  return ALPHABETS[language].letters.find((letter) => letter.id === letterId)
}

export interface WordParts {
  before: string
  match: string
  after: string
}

/**
 * Splits a word around the first place the letter appears, so the letter can be
 * coloured inside the word (e.g. “de|ng|iz”, “с|ы|р”, “bo|x|”).
 * Falls back to highlighting the first character when the letter is absent.
 */
export function splitWordByLetter(word: string, letter: LetterEntry): WordParts {
  const index = word.toLocaleLowerCase().indexOf(letter.lower)
  if (index === -1) {
    return { before: '', match: word.slice(0, 1), after: word.slice(1) }
  }
  const end = index + letter.lower.length
  return { before: word.slice(0, index), match: word.slice(index, end), after: word.slice(end) }
}

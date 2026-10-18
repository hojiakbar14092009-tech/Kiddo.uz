import type { Language } from '@/content/languages'

export interface LetterEntry {
  /** URL-safe, stable id used in routes and saved progress (e.g. `sh`, `o2`). */
  id: string
  upper: string
  lower: string
  /** A1-level example word, written in lower case. */
  word: string
  /** Placeholder picture until illustrated artwork is added. */
  emoji: string
  /** What the voice says for the letter itself (e.g. “мягкий знак” for Ь). */
  spoken: string
}

export interface Alphabet {
  language: Language
  letters: readonly LetterEntry[]
}

/** `[id, upper-case letter, word, emoji, spoken name?]` – the compact source form of a letter. */
export type LetterRow = readonly [
  id: string,
  upper: string,
  word: string,
  emoji: string,
  spoken?: string,
]

export function createAlphabet(language: Language, rows: readonly LetterRow[]): Alphabet {
  return {
    language,
    letters: rows.map(([id, upper, word, emoji, spoken]) => ({
      id,
      upper,
      lower: upper.toLocaleLowerCase(),
      word,
      emoji,
      spoken: spoken ?? upper,
    })),
  }
}

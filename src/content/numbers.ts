import type { Language } from '@/content/languages'

export interface NumberEntry {
  /** Route- and storage-safe id, e.g. `num-3`. */
  id: string
  value: number
  words: Record<Language, string>
  /** Picture repeated `value` times so the child can count it. */
  emoji: string
}

const ROWS: readonly [value: number, uz: string, ru: string, en: string, emoji: string][] = [
  [1, 'bir', 'один', 'one', '🍎'],
  [2, 'ikki', 'два', 'two', '🐥'],
  [3, 'uch', 'три', 'three', '🎈'],
  [4, 'toʻrt', 'четыре', 'four', '⭐'],
  [5, 'besh', 'пять', 'five', '🍓'],
  [6, 'olti', 'шесть', 'six', '🐟'],
  [7, 'yetti', 'семь', 'seven', '🌸'],
  [8, 'sakkiz', 'восемь', 'eight', '🍪'],
  [9, 'toʻqqiz', 'девять', 'nine', '🚗'],
  [10, 'oʻn', 'десять', 'ten', '🦋'],
]

export const NUMBERS: readonly NumberEntry[] = ROWS.map(([value, uz, ru, en, emoji]) => ({
  id: `num-${value}`,
  value,
  words: { uz, ru, en },
  emoji,
}))

export function findNumber(id: string): NumberEntry | undefined {
  return NUMBERS.find((entry) => entry.id === id)
}

export function isNumberId(id: string): boolean {
  return id.startsWith('num-')
}

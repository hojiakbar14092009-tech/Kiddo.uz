import type { Language } from '@/content/languages'

/*
 * The word train (Phase 66): a picture, a train of empty wagons, and letters to
 * put in, one by one, in order. Short everyday words in each language (Uzbek
 * words without two-letter sounds, so one tile is one letter). Pure.
 */

export interface TrainWord {
  word: string
  /** The app's 3D picture of it. */
  picture: string
}

export const TRAIN_WORDS: Readonly<Record<Language, readonly TrainWord[]>> = {
  uz: [
    { word: 'ari', picture: 'bee' },
    { word: 'non', picture: 'bread' },
    { word: 'olma', picture: 'apple' },
    { word: 'qor', picture: 'snowflake' },
    { word: 'baliq', picture: 'fish' },
  ],
  ru: [
    { word: 'кот', picture: 'cat' },
    { word: 'дом', picture: 'house' },
    { word: 'сыр', picture: 'cheese' },
    { word: 'мяч', picture: 'ball' },
    { word: 'рыба', picture: 'fish' },
  ],
  en: [
    { word: 'cat', picture: 'cat' },
    { word: 'sun', picture: 'sun' },
    { word: 'bee', picture: 'bee' },
    { word: 'dog', picture: 'dog' },
    { word: 'fish', picture: 'fish' },
  ],
}

/** Letters that are never in a word as extra tiles (easy to tell apart). */
const EXTRAS: Readonly<Record<Language, readonly string[]>> = {
  uz: ['m', 'e', 's', 'k', 'u', 'd'],
  ru: ['а', 'л', 'п', 'е', 'н', 'у'],
  en: ['a', 'm', 't', 'p', 'o', 'r'],
}

export interface Tile {
  id: number
  letter: string
}

/**
 * The tiles of a word: its letters plus two extras not in it, mixed by `random`
 * (a fixed source in tests). Each tile has its own id, so a letter can be twice.
 */
export function tilesFor(
  language: Language,
  word: string,
  random: () => number = Math.random,
): Tile[] {
  const extras = EXTRAS[language].filter((letter) => !word.includes(letter)).slice(0, 2)
  const letters = [...word, ...extras]
  for (let i = letters.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[letters[i], letters[j]] = [letters[j]!, letters[i]!]
  }
  return letters.map((letter, id) => ({ id, letter }))
}

/** Is this letter the next one the word needs? */
export function fits(word: string, filled: number, letter: string): boolean {
  return word[filled] === letter
}

import { getAlphabet, type LetterEntry } from '@/content/alphabet'
import type { Language } from '@/content/languages'
import type { GameType } from './games'

/**
 * Signs without a sound of their own (Uzbek ʼ, Russian Ъ and Ь) cannot be
 * “found in a picture”, and ʼ is too small to trace with a finger.
 */
const SIGNS = new Set(['tutuq', 'hard', 'soft'])

export function isPlayable(game: GameType | 'exam', letter: LetterEntry): boolean {
  switch (game) {
    case 'find-letter':
      return true
    case 'trace':
      return letter.id !== 'tutuq'
    case 'find-picture':
    case 'memory':
    case 'exam':
      return !SIGNS.has(letter.id)
  }
}

/** The letters a game may ask about in a language. */
export function playableLetters(language: Language, game: GameType | 'exam'): LetterEntry[] {
  return getAlphabet(language).letters.filter((letter) => isPlayable(game, letter))
}

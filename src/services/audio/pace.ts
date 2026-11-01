import type { AgeLevel } from '@/features/age/ageLevel'

/*
 * Voice first (Phase 41): a letter is said, then a pause, then its word
 * ("B … banan"), so a young child hears the sound apart from the word. The
 * pause is longest at four and shorter as the child grows; a parent can make
 * the voice slower (Parent area → Settings), which lengthens every pause.
 */

export const LETTER_PAUSE_MS: Record<AgeLevel, number> = { 4: 1100, 5: 850, 6: 650 }
export const SLOW_FACTOR = 1.6

/** The pause between a letter and its word, in ms. */
export function letterPauseMs(level: AgeLevel, slow: boolean): number {
  return Math.round(LETTER_PAUSE_MS[level] * (slow ? SLOW_FACTOR : 1))
}

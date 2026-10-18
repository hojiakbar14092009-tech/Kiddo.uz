import type { RandomSource } from '@/lib/random'

export interface MathQuestion {
  a: number
  b: number
  answer: number
}

const MIN_FACTOR = 3
const MAX_FACTOR = 9

function factor(random: RandomSource): number {
  return MIN_FACTOR + Math.floor(random() * (MAX_FACTOR - MIN_FACTOR + 1))
}

/**
 * A multiplication a 3–6 year old cannot solve (3×3 … 9×9) but any adult can.
 * The question is never spoken aloud, so a child cannot just repeat it.
 */
export function createMathQuestion(random: RandomSource = Math.random): MathQuestion {
  const a = factor(random)
  const b = factor(random)
  return { a, b, answer: a * b }
}

/** Answers have at most two digits. */
export const MAX_ANSWER_DIGITS = 2

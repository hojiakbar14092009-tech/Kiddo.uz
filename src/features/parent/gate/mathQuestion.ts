import type { RandomSource } from '@/lib/random'

export interface MathQuestion {
  a: number
  b: number
  answer: number
}

/** The first factor: a two-digit number (Phase 46: 3–9 left only 26 answers, "24" won 1 in 12). */
const A_RANGE = [12, 19] as const
/** The second factor: one digit. */
const B_RANGE = [3, 9] as const

function pick([min, max]: readonly [number, number], random: RandomSource): number {
  return min + Math.floor(random() * (max - min + 1))
}

/**
 * A multiplication a 4–6 year old cannot solve (12×3 … 19×9) but any adult can in their head.
 * 56 questions, no answer comes up more than twice, so typing the same number wins at most
 * 1 time in 28. The question is never spoken aloud, so a child cannot just repeat it.
 */
export function createMathQuestion(random: RandomSource = Math.random): MathQuestion {
  const a = pick(A_RANGE, random)
  const b = pick(B_RANGE, random)
  return { a, b, answer: a * b }
}

/** Answers have at most three digits (19 × 9 = 171). */
export const MAX_ANSWER_DIGITS = 3

import type { PathScore } from './pathScoring'

/*
 * When a written letter counts (Phase 42b). Every stroke of the letter must be
 * covered (a missing stroke is not the letter) and most of the child's line
 * must lie on the letter (a scribble over it is not the letter either).
 * "done": the child pressed Done; "auto": praised at once, without waiting.
 */
export type LetterPassLevel = 'done' | 'auto'

// a real trace inside the band scores about 0.95: these keep a close letter (C for O,
// R for P, E for F) or a scribble over the letter from passing
const PRECISION: Record<LetterPassLevel, number> = { done: 0.85, auto: 0.9 }
const STROKE_SHARE: Record<LetterPassLevel, number> = { done: 0.86, auto: 0.9 }

export function letterTracePasses(
  score: PathScore,
  total: number,
  level: LetterPassLevel,
): boolean {
  if (total === 0 || score.strokes.length !== total) return false
  return (
    score.strokes.every((coverage) => coverage >= STROKE_SHARE[level]) &&
    score.precision >= PRECISION[level]
  )
}

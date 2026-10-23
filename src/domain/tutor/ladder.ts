import type { ChallengeLevel } from '@/domain/learner'
import type { HintLevel } from '@/domain/learningMemory'
import type { Band, TutorHintLevel } from './types'

/*
 * The adaptive hint ladder (docs/architecture/ai-tutor.md §4): the lowest
 * help that is enough. Each mistake on the same question climbs one step;
 * the child can also ask for the next step. The full answer comes only at
 * step 4, never after the first mistake.
 */

export function hintForMisses(misses: number): HintLevel {
  if (misses <= 0) return 0
  return Math.min(4, Math.floor(misses)) as HintLevel
}

/** One step more help (asked for by the child), never above 4. */
export function nextHint(current: HintLevel): TutorHintLevel {
  return Math.min(4, Math.max(1, current + 1)) as TutorHintLevel
}

/** Explanation depth from the challenge level, not from age. */
export function bandForLevel(level: ChallengeLevel): Band {
  if (level <= 2) return 'early'
  if (level <= 4) return 'intermediate'
  return 'advanced'
}

/**
 * Is an AI reply worth a request here? Only from the visual step up, and only
 * for tasks written in symbols (a picture task is better helped by the
 * picture itself). Correct answers, praise and scores never go to an AI.
 */
export function aiWorthAsking(level: HintLevel, symbolic: boolean): boolean {
  return symbolic && level >= 2
}

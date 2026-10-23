import type { ChallengeLevel } from '@/domain/learner'
import type { ActivityCompleted } from '@/domain/universe'

/*
 * What a finished dig or quiz reports to the universe: once per run (a new
 * id), strand 'science', with the level it was played at. Only a run at the
 * child's current level moves the LearnerProfile.
 */

export type DinoActivityKind = 'dig' | 'quiz'

/** `dino:<kind>:L<level>`: the same for every run at a level, so stars compare with the best. */
export function dinoActivityName(kind: DinoActivityKind, level: ChallengeLevel): string {
  return `dino:${kind}:L${level}`
}

export interface DinoScore {
  total: number
  /** Answered right on the first try (there is no help button: these are independent). */
  firstTry: number
}

export function dinoActivity(
  id: string,
  childKey: string,
  kind: DinoActivityKind,
  level: ChallengeLevel,
  score: DinoScore,
): ActivityCompleted {
  const firstTry = Math.max(0, Math.min(score.total, score.firstTry))
  return {
    id,
    childKey,
    activity: dinoActivityName(kind, level),
    strand: 'science',
    correct: firstTry,
    total: score.total,
    independent: firstTry,
    level,
  }
}

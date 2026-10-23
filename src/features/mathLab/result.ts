import type { ChallengeLevel } from '@/domain/learner'
import type { ActivityCompleted } from '@/domain/universe'
import type { SessionSheet, SessionSummary } from '@/features/learn/session'
import { summarize } from '@/features/learn/session'

/*
 * What a finished Math Lab session reports. Pure: the page calls
 * `emitActivity(labActivity(...))` once, with a new run id.
 */

/** The theme of a level's session, used in the activity id. */
export const LEVEL_KIND: Record<ChallengeLevel, string> = {
  1: 'count',
  2: 'objects',
  3: 'within10',
  4: 'within20',
  5: 'mixed',
}

/** `math-lab:<kind>:L<level>`: the same for every run at a level, so stars compare with the best. */
export function labActivityName(level: ChallengeLevel): string {
  return `math-lab:${LEVEL_KIND[level]}:L${level}`
}

/**
 * Skills whose first answer was wrong in this session (each once, in the
 * order they happened), e.g. `sub:within10`, `missing:add`. Help used
 * before answering is not a mistake. Kept for the Mistake Garden.
 */
export function mistakeSkills(sheet: SessionSheet): string[] {
  const out: string[] = []
  for (const answer of Object.values(sheet.answers)) {
    if (!answer.firstCorrect && !out.includes(answer.skill)) out.push(answer.skill)
  }
  return out
}

export interface LabSummary extends SessionSummary {
  level: ChallengeLevel
  mistakeSkills: string[]
}

export function labSummary(sheet: SessionSheet, total: number, level: ChallengeLevel): LabSummary {
  return { ...summarize(sheet, total), level, mistakeSkills: mistakeSkills(sheet) }
}

/**
 * The universe event of a finished session. `level` is the level the session
 * was played at: only a run at the child's current level moves the
 * LearnerProfile (a stale run, e.g. from a second tab, only counts for stars).
 */
export function labActivity(id: string, childKey: string, summary: LabSummary): ActivityCompleted {
  return {
    id,
    childKey,
    activity: labActivityName(summary.level),
    strand: 'number',
    correct: Math.max(0, summary.total - summary.wrong),
    total: summary.total,
    independent: summary.independent,
    level: summary.level,
  }
}

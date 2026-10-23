import type { Strand } from './types'

/*
 * Two small, capped logs per child in the universe store. Pure helpers, no
 * store import, so they are tested alone:
 * - `recent`: finished activity runs (what was played, when, how well), for
 *   the parent dashboard ("What Kiddo played", "This week");
 * - `mistakes`: skills whose first answer was wrong (`mistake.made` events,
 *   Math Lab today), for gentle practice suggestions and, later, the Mistake
 *   Garden (Phase 16).
 * Both are newest first and forget the oldest entries past their cap. A
 * removed child loses both with the rest of its universe (`clearUniverseChild`).
 */

export const MAX_RECENT_RUNS = 200
export const MAX_MISTAKES = 200

export interface RecentRun {
  /** The run id (unique per finished run, the same id `emitActivity` counts once). */
  id: string
  /** What was played, e.g. `math-lab:count:L1`, `story:lost-lamb`. */
  activity: string
  strand: Strand
  /** ISO time the run finished. */
  at: string
  stars: number
  independent: number
  total: number
}

export interface MistakeRecord {
  /** E.g. `sub:within10`, `missing:add`. */
  skill: string
  strand: Strand
  /** ISO time. */
  at: string
  /** The run it happened in; one record per (run, skill). */
  activityId?: string
}

/** Adds a run in front, once per id, keeping at most `max`. */
export function appendRecentRun(
  list: readonly RecentRun[] | undefined,
  run: RecentRun,
  max: number = MAX_RECENT_RUNS,
): RecentRun[] {
  const current = list ?? []
  if (current.some((item) => item.id === run.id)) return [...current]
  return [run, ...current].slice(0, Math.max(0, max))
}

/**
 * Adds a mistake in front, keeping at most `max`. A repeat of the same skill
 * in the same run is ignored (a run reports each skill once); an empty skill
 * is refused.
 */
export function appendMistake(
  list: readonly MistakeRecord[] | undefined,
  record: MistakeRecord,
  max: number = MAX_MISTAKES,
): MistakeRecord[] {
  const current = list ?? []
  if (!record.skill) return [...current]
  if (
    record.activityId &&
    current.some((item) => item.activityId === record.activityId && item.skill === record.skill)
  ) {
    return [...current]
  }
  return [record, ...current].slice(0, Math.max(0, max))
}

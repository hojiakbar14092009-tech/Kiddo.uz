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
 * Is this journal entry still an open learning need (its skill has an active
 * misconception in the learning memory)? Entries of skills the child got past
 * are low value and go first when the journal is full.
 */
export type OpenNeed = (record: MistakeRecord) => boolean

/**
 * Keeps at most `max` entries (newest first). Deterministic: the oldest
 * entries whose skill is no longer an open need go first; only when every
 * remaining entry is an open need do the oldest of those go.
 */
export function compactMistakes(
  list: readonly MistakeRecord[],
  max: number = MAX_MISTAKES,
  isOpen: OpenNeed = () => false,
): MistakeRecord[] {
  const limit = Math.max(0, max)
  if (list.length <= limit) return [...list]
  let over = list.length - limit
  const drop = new Set<number>()
  for (let index = list.length - 1; index >= 0 && over > 0; index -= 1) {
    if (!isOpen(list[index]!)) {
      drop.add(index)
      over -= 1
    }
  }
  const kept = list.filter((_, index) => !drop.has(index))
  return kept.slice(0, limit)
}

/**
 * Adds a mistake in front, keeping at most `max` (see `compactMistakes`). A
 * repeat of the same skill in the same run is ignored (a run reports each
 * skill once); an empty skill is refused.
 */
export function appendMistake(
  list: readonly MistakeRecord[] | undefined,
  record: MistakeRecord,
  max: number = MAX_MISTAKES,
  isOpen?: OpenNeed,
): MistakeRecord[] {
  const current = list ?? []
  if (!record.skill) return [...current]
  if (
    record.activityId &&
    current.some((item) => item.activityId === record.activityId && item.skill === record.skill)
  ) {
    return [...current]
  }
  return compactMistakes([record, ...current], max, isOpen)
}

const SKILL_RE = /^[a-z0-9-]{1,16}(:[a-z0-9-]{1,24}){0,2}$/

function isMistakeRecord(value: unknown, strands: readonly string[]): value is MistakeRecord {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Record<string, unknown>
  return (
    typeof item.skill === 'string' &&
    SKILL_RE.test(item.skill) &&
    typeof item.strand === 'string' &&
    strands.includes(item.strand) &&
    typeof item.at === 'string' &&
    !Number.isNaN(new Date(item.at).getTime()) &&
    (item.activityId === undefined || typeof item.activityId === 'string')
  )
}

/**
 * A saved journal from any older or damaged state, made safe: entries that
 * are not well formed are dropped, a repeated (run, skill) is kept once, the
 * order is newest first and the size is capped. Never throws.
 */
export function normalizeMistakes(
  raw: unknown,
  strands: readonly string[],
  max: number = MAX_MISTAKES,
  isOpen?: OpenNeed,
): MistakeRecord[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const valid: MistakeRecord[] = []
  for (const value of raw) {
    if (!isMistakeRecord(value, strands)) continue
    const key = value.activityId ? `${value.activityId}|${value.skill}` : null
    if (key && seen.has(key)) continue
    if (key) seen.add(key)
    valid.push({
      skill: value.skill,
      strand: value.strand,
      at: value.at,
      ...(value.activityId ? { activityId: value.activityId } : {}),
    })
  }
  // newest first; equal times keep their saved order (a stable sort)
  valid.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  return compactMistakes(valid, max, isOpen)
}

/** The learning-memory skill key of a journal entry (Math Lab entries are `math:` skills). */
export function memorySkillOf(record: Pick<MistakeRecord, 'skill' | 'strand'>): string | null {
  return record.strand === 'number' ? `math:${record.skill}` : null
}

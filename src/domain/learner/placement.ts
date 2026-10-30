import { MAX_CHALLENGE, type ChallengeLevel, type StrandState } from './profile'

/*
 * Placement (Phase 22): where an older learner who is new to a strand starts,
 * from a few answers instead of from their age. Pure and deterministic: the
 * same answers give the same start; no clock, no randomness, no AI.
 *
 * The probe climbs one rung at a time. An item not answered on their own
 * (wrong, "I don't know yet" or with a hint) gets a second item of the same
 * rung, so one slip never decides (two such second chances in the whole
 * probe, six items at most). A rung missed twice ends it:
 *
 *   easy (a level-2 item)   missed → start at 1  (the foundations)
 *   medium (a level-4 item) missed → start at 3
 *   hard (a level-5 item)   missed → start at 4
 *   stretch (mastery 2)     missed → start at 5
 *                           passed → start at 5, mastery 2
 *
 * A start is never above what was shown, and after it the usual rule holds:
 * a level moves only after two runs in a row (no jump down after one wrong
 * answer).
 */

export const PLACEMENT_RUNGS = ['easy', 'medium', 'hard', 'stretch'] as const
export type PlacementRung = (typeof PLACEMENT_RUNGS)[number]

/** The item each rung asks: a level and, above level 5, a mastery step. */
export const RUNG_ITEM: Record<PlacementRung, { level: ChallengeLevel; mastery: number }> = {
  easy: { level: 2, mastery: 0 },
  medium: { level: 4, mastery: 0 },
  hard: { level: 5, mastery: 0 },
  stretch: { level: 5, mastery: 2 },
}

/** Where a learner starts when a rung was not answered on their own. */
const START_BELOW: Record<PlacementRung, { level: ChallengeLevel; mastery: number }> = {
  easy: { level: 1, mastery: 0 },
  medium: { level: 3, mastery: 0 },
  hard: { level: 4, mastery: 0 },
  stretch: { level: 5, mastery: 0 },
}

export interface PlacementAnswer {
  rung: PlacementRung
  /** Right on the first try, without a hint. */
  independent: boolean
}

export interface Placement {
  level: ChallengeLevel
  mastery: number
  /** How many items were asked (for the strand's evidence). */
  asked: number
  independent: number
}

/** Second items a whole probe may give (one slip never decides). */
export const PLACEMENT_RETRIES = 2

interface Walk {
  /** The rung that ended the probe (missed twice), or null when all passed. */
  stoppedAt: PlacementRung | null
  /** The rung to ask next, with its attempt (0 or 1); null when decided. */
  next: { rung: PlacementRung; attempt: number } | null
  asked: number
  independent: number
}

/** Reads the answers in order: which rungs passed, where it stopped, what comes next. */
function walk(answers: readonly PlacementAnswer[]): Walk {
  let rungIndex = 0
  let missedHere = false
  let retries = 0
  let independent = 0
  for (const answer of answers) {
    const rung = PLACEMENT_RUNGS[rungIndex]
    if (!rung || answer.rung !== rung) break
    if (answer.independent) {
      independent += 1
      rungIndex += 1
      missedHere = false
      continue
    }
    if (!missedHere && retries < PLACEMENT_RETRIES) {
      missedHere = true
      retries += 1
      continue
    }
    return { stoppedAt: rung, next: null, asked: answers.length, independent }
  }
  const rung = PLACEMENT_RUNGS[rungIndex]
  return {
    stoppedAt: null,
    next: rung ? { rung, attempt: missedHere ? 1 : 0 } : null,
    asked: answers.length,
    independent,
  }
}

/** The next item to ask (its rung and attempt), or null when the placement is decided. */
export function nextItem(
  answers: readonly PlacementAnswer[],
): { rung: PlacementRung; attempt: number } | null {
  const state = walk(answers)
  return state.stoppedAt ? null : state.next
}

/** The next rung to ask, or null when the placement is decided. */
export function nextRung(answers: readonly PlacementAnswer[]): PlacementRung | null {
  return nextItem(answers)?.rung ?? null
}

/**
 * The start the answers show (answers in the order asked). A probe left
 * before the end places from the rung it was on (never above what was shown).
 */
export function placementOf(answers: readonly PlacementAnswer[]): Placement {
  const state = walk(answers)
  const stopped = state.stoppedAt ?? state.next?.rung ?? null
  const start = stopped ? START_BELOW[stopped] : RUNG_ITEM.stretch
  return { ...start, asked: state.asked, independent: state.independent }
}

/** The strand state a placement writes (the learner's own start, not the age prior). */
export function placedState(placement: Placement): StrandState {
  return {
    level: placement.level,
    mastery: placement.level === MAX_CHALLENGE ? placement.mastery : 0,
    streak: 0,
    runs: 0,
    independent: placement.independent,
    total: placement.asked,
    placed: true,
  }
}

import { priorLevel, priorMastery } from '@/domain/adaptive/ageProfile'
import type { Strand } from '@/domain/universe/types'

/*
 * LearnerProfile (docs/architecture/universe.md §4). Pure logic, no store.
 *
 * Every strand has a challenge level 1–5. Age only picks where a strand starts
 * (the age profile's prior: 4 → 1, 5 → 2, 6 → 3, 7–9 → 4, 10+ → 5, guest → 2;
 * a placement replaces it); after that the child's own results move it:
 * two strong runs in a row at a level → one level up, two weak runs in a row →
 * one level down (never below 1, never announced as failure). Age never locks
 * anything: a strong four-year-old reaches level 5, a struggling six-year-old
 * gets level 1.
 */

export const MIN_CHALLENGE = 1
export const MAX_CHALLENGE = 5
export type ChallengeLevel = 1 | 2 | 3 | 4 | 5

export interface StrandState {
  /** Current level; missing means "start from age". */
  level: ChallengeLevel
  /**
   * Mastery steps above the top level (Phase 22): 0 until level 5 is mastered,
   * then one more for every two strong runs in a row, with no ceiling; two
   * weak runs take one back before the level itself moves down.
   */
  mastery?: number
  /** Strong (+n) or weak (−n) runs in a row at this level. */
  streak: number
  runs: number
  /** Independent answers / questions over every run. */
  independent: number
  total: number
  /**
   * Set by a placement (placement.ts): the level and mastery came from the
   * learner's own answers, so they hold from the first run (not the age prior).
   */
  placed?: boolean
}

export type LearnerStrands = Partial<Record<Strand, StrandState>>

/** A run is strong at ≥ 80 % independent answers, weak below 50 %. */
export const STRONG_RATIO = 0.8
export const WEAK_RATIO = 0.5
/** Runs in a row needed to move. */
export const MOVE_AFTER = 2

export function clampLevel(n: number): ChallengeLevel {
  return Math.min(MAX_CHALLENGE, Math.max(MIN_CHALLENGE, Math.round(n))) as ChallengeLevel
}

/** A guard against corrupt saves only: far beyond any real progress (two strong runs a step). */
export const MAX_MASTERY = 10_000

/**
 * Where mastery starts for an age before any evidence: the age profile's
 * prior (domain/adaptive/ageProfile). A placement or the learner's runs
 * replace it, both ways.
 */
export function startMastery(age: number | null): number {
  return priorMastery(age)
}

/** Mastery steps of one strand state (0 below the top level). */
export function stateMastery(stored: StrandState | undefined, age: number | null): number {
  if (!stored || !settled(stored)) return startLevel(age) === MAX_CHALLENGE ? startMastery(age) : 0
  if (stateLevel(stored, age) < MAX_CHALLENGE) return 0
  const m = Math.floor(Number(stored.mastery))
  // a corrupt or absurd save never reaches the generators
  return Number.isFinite(m) && m > 0 ? Math.min(m, MAX_MASTERY) : 0
}

export function masteryOf(
  strands: LearnerStrands | undefined,
  strand: Strand,
  age: number | null,
): number {
  return stateMastery(strands?.[strand], age)
}

/**
 * Where a strand starts for an age (years; null = guest): the age profile's
 * prior (domain/adaptive/ageProfile). A placement replaces it; the learner's
 * answers decide from there.
 */
export function startLevel(age: number | null): ChallengeLevel {
  return priorLevel(age)
}

/** Did the learner's own answers (runs, or a placement) set this strand? */
function settled(stored: StrandState): boolean {
  return stored.runs >= MOVE_AFTER || stored.placed === true
}

export function levelOf(
  strands: LearnerStrands | undefined,
  strand: Strand,
  age: number | null,
): ChallengeLevel {
  return stateLevel(strands?.[strand], age)
}

/** The level of one strand state (see levelOf). */
export function stateLevel(stored: StrandState | undefined, age: number | null): ChallengeLevel {
  // Until a level has moved (fewer than two runs), the age still decides, so a
  // corrected birthday re-seeds the strand. Stored values are never trusted raw.
  if (!stored || !settled(stored)) return startLevel(age)
  return clampLevel(Number(stored.level) || startLevel(age))
}

export type RunQuality = 'strong' | 'weak' | 'ok'

export function runQuality(run: { independent: number; total: number }): RunQuality {
  if (run.total <= 0) return 'ok'
  const ratio = Math.max(0, Math.min(run.independent, run.total)) / run.total
  if (ratio >= STRONG_RATIO) return 'strong'
  if (ratio < WEAK_RATIO) return 'weak'
  return 'ok'
}

/** The strand after one finished run. Pure; the caller makes it idempotent. */
export function applyRun(
  previous: StrandState | undefined,
  run: { independent: number; total: number },
  age: number | null,
): StrandState {
  const fresh: StrandState = {
    level: startLevel(age),
    mastery: startLevel(age) === MAX_CHALLENGE ? startMastery(age) : 0,
    streak: 0,
    runs: 0,
    independent: 0,
    total: 0,
  }
  const base: StrandState = previous
    ? {
        ...fresh,
        ...previous,
        level: stateLevel(previous, age),
        mastery: stateMastery(previous, age),
        streak: Number(previous.streak) || 0,
        runs: Number(previous.runs) || 0,
      }
    : fresh
  const total = Math.max(0, Math.floor(run.total))
  const independent = Math.max(0, Math.min(Math.floor(run.independent), total))
  const quality = runQuality({ independent, total })
  let streak =
    quality === 'strong'
      ? Math.max(0, base.streak) + 1
      : quality === 'weak'
        ? Math.min(0, base.streak) - 1
        : 0
  let level = base.level
  let mastery = base.mastery ?? 0
  if (streak >= MOVE_AFTER && level < MAX_CHALLENGE) {
    level = clampLevel(level + 1)
    streak = 0
  } else if (streak >= MOVE_AFTER) {
    // the top level is mastered: one more mastery step, with no ceiling
    mastery = Math.min(MAX_MASTERY, mastery + 1)
    streak = 0
  } else if (streak <= -MOVE_AFTER && mastery > 0) {
    mastery -= 1
    streak = 0
  } else if (streak <= -MOVE_AFTER && level > MIN_CHALLENGE) {
    level = clampLevel(level - 1)
    streak = 0
  }
  return {
    level,
    mastery: level === MAX_CHALLENGE ? mastery : 0,
    streak,
    runs: base.runs + 1,
    independent: base.independent + independent,
    total: base.total + total,
    // a placed start stays the learner's own after the first run
    ...(previous?.placed === true ? { placed: true } : {}),
  }
}

/** Overall accuracy of a strand, 0–1 (null before any question). */
export function accuracy(state: StrandState | undefined): number | null {
  if (!state || state.total === 0) return null
  return state.independent / state.total
}

// ------------------------------------------------------------ age lookup

/**
 * The child's age in years (null for a guest or an unknown child). The family
 * store registers it at load, so this module needs no store import.
 */
let ageResolver: (childKey: string) => number | null = () => null

export function setAgeResolver(resolver: (childKey: string) => number | null): void {
  ageResolver = resolver
}

export function childAgeFor(childKey: string): number | null {
  try {
    return ageResolver(childKey)
  } catch {
    return null
  }
}

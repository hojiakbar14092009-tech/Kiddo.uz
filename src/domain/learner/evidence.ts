import { applyRun, MAX_CHALLENGE, type ChallengeLevel, type StrandState } from './profile'

/*
 * Progression evidence (Phase 22): what a finished run may change. One table,
 * read by the universe store when a run is counted; screens only say what
 * kind of run they were. Success in easy content builds confidence (stars,
 * streaks), but only evidence meant to measure a level moves it.
 *
 * - assessment: an adaptive run at the strand's own level (Math Lab, the
 *   Dinosaur, Story, Feelings and Uzbekistan games). Moves the level both
 *   ways and, at the top, mastery.
 * - practice: a Learn section or a letter/memory game, whose items follow
 *   the young content tier (levels 1–3 at most). Moves the level only within
 *   those levels: two strong runs at level 3 do not make level 4, and at
 *   levels 4–5 it changes nothing. Never mastery.
 * - learn: being taught (worked examples, help). Nothing.
 * - tracing: hand precision, not the letters' level. Nothing.
 * - exam: the big letter test, a gate of its own (all letters learned). Nothing.
 * - placement: written once by placeStrand, never through a run.
 */
export const EVIDENCE_KINDS = [
  'assessment',
  'practice',
  'learn',
  'tracing',
  'exam',
  'placement',
] as const
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number]

export interface EvidenceRule {
  /** May a run of this kind move the level at all? */
  moves: boolean
  /** The highest level it may move from or to (its content is at most this level). */
  maxLevel: ChallengeLevel
  /** May it change mastery steps above level 5? */
  mastery: boolean
}

/** The young content tiers cover levels 1–3 (contentTier: 1 → 4, 2 → 5, 3+ → 6). */
export const TIER_TOP_LEVEL: ChallengeLevel = 3

export const EVIDENCE_POLICY: Record<EvidenceKind, EvidenceRule> = {
  assessment: { moves: true, maxLevel: MAX_CHALLENGE, mastery: true },
  practice: { moves: true, maxLevel: TIER_TOP_LEVEL, mastery: false },
  learn: { moves: false, maxLevel: 1, mastery: false },
  tracing: { moves: false, maxLevel: 1, mastery: false },
  exam: { moves: false, maxLevel: 1, mastery: false },
  placement: { moves: false, maxLevel: 1, mastery: false },
}

/**
 * The strand after one run of a kind of evidence, or null when that run may
 * not change it (then the caller keeps the state as it was). `level` is the
 * strand's current level.
 */
export function applyEvidence(
  previous: StrandState | undefined,
  run: { independent: number; total: number },
  age: number | null,
  kind: EvidenceKind,
  level: ChallengeLevel,
): StrandState | null {
  const rule = EVIDENCE_POLICY[kind]
  if (!rule.moves || level > rule.maxLevel) return null
  const next = applyRun(previous, run, age)
  // at the top of what this evidence may show, a strong run proves this level,
  // not the next: no promotion and no half-step toward it. A positive streak
  // earned by assessment is kept as it was; a weak run still counts (down).
  if (
    level === rule.maxLevel &&
    rule.maxLevel < MAX_CHALLENGE &&
    next.level >= level &&
    next.streak >= 0
  ) {
    const earned = Math.max(0, Number(previous?.streak) || 0)
    return { ...next, level, streak: earned, mastery: 0 }
  }
  return next
}

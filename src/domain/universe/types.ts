/*
 * Shared types of the Kiddo Universe (docs/architecture/universe.md).
 * A leaf module at run time: type-only imports, so every universe file and
 * every store can use it.
 */
import type { EvidenceKind } from '@/domain/learner/evidence'

export const RESOURCE_IDS = ['star', 'crystal', 'seed', 'part', 'scroll', 'key'] as const
export type ResourceId = (typeof RESOURCE_IDS)[number]

export function isResourceId(value: unknown): value is ResourceId {
  return typeof value === 'string' && (RESOURCE_IDS as readonly string[]).includes(value)
}

/** One change of one resource; negative only for spending. */
export interface ResourceEntry {
  id: string
  childKey: string
  resource: ResourceId
  amount: number
  /** Why: 'activity', 'three-stars', 'number-3star', 'tale', 'quest', 'upgrade', … */
  reason: string
  /** What was rewarded or bought; unique per (resource, reason). */
  refId: string
  at: string
}

export const STRANDS = [
  'letters',
  'reading',
  'number',
  'logic',
  'language',
  'science',
  'space',
  'art',
  'social',
] as const
export type Strand = (typeof STRANDS)[number]

/**
 * A finished activity (game, exam, learning session, tale, creative work).
 * `id` is unique per finished run (result or session id) and makes
 * `emitActivity` idempotent; `activity` names what was played, the same for
 * every run of it (e.g. `math:4`, `tale:fox`, `find-letter:uz`), so stars can
 * be compared with the child's previous best.
 */
export interface ActivityCompleted {
  id: string
  childKey: string
  activity: string
  strand: Strand
  correct: number
  total: number
  /** First answers right without help. */
  independent: number
  /** ISO time; defaults to now. Decides the day for daily caps. */
  at?: string
  /**
   * Challenge level (1–5) the run was played at. Only adaptive activities set
   * it, and only a run at the child's current level moves the LearnerProfile.
   */
  level?: number
  /**
   * What kind of evidence the run is (domain/learner EVIDENCE_POLICY decides
   * what it may move). Missing: an assessment (an adaptive run at its level).
   */
  evidence?: EvidenceKind
  /**
   * A repeatable activity (a story read again): only its first run of the
   * day counts for the achievements and moves the LearnerProfile; later runs
   * that day still get their stars (only an improvement pays), never twice.
   */
  oncePerDay?: boolean
}

/** What one finished activity (or a claimed quest) earned. Zeros when it was counted before. */
export interface AwardSummary {
  /** The activity's star rating, 1–3 (0 on a repeat or for a quest). */
  stars: number
  crystals: number
  parts: number
  scrolls: number
  /** Achievement tiers reached now, as `${achievementId}|${tier}`. */
  achievements: string[]
  /**
   * Star resource actually added: only the improvement over the previous best
   * for this activity. Optional for callers that build summaries by hand.
   */
  starGain?: number
}

export type Tier = 'bronze' | 'silver' | 'gold'
export const TIERS: readonly Tier[] = ['bronze', 'silver', 'gold']

export interface UniverseEvent {
  type: string
  childKey: string
  [key: string]: unknown
}

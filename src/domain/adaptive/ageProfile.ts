/*
 * The age profiles (contract §17, Phase 22): one typed table, the only place
 * that says what a real age means for presentation and for the start of
 * learning. Every other module asks it (ageProfile) or the adaptive resolver
 * built on it; no screen keeps its own `if (age > 10)`.
 *
 * Three things stay apart:
 * - chronological age: the birth date (store `childAge`, Tashkent day);
 * - visual maturity: how the screen looks for that age (`visual`);
 * - cognitive difficulty: the strand's challenge level (domain/learner),
 *   which starts at `startLevel` (or a placement) and then follows the
 *   learner's own answers, with no ceiling. Age never caps it.
 *
 * No profile is an access rule: there is no maximum age and nothing is locked.
 * Leaf module: it imports types only, so domain/learner can use it too.
 */

/** Challenge level 1–5 (the same union as domain/learner `ChallengeLevel`). */
type Level = 1 | 2 | 3 | 4 | 5

export const AGE_BANDS = ['3-4', '5-6', '7-9', '10-12', '13-15', '16+'] as const
export type AgeBand = (typeof AGE_BANDS)[number]

export type Aids = 'full' | 'partial' | 'minimal'
export type Vocabulary = 'simple' | 'standard' | 'rich'
/** How the screen looks (never how hard the work is). */
export type VisualMaturity = 'toy' | 'garden' | 'workbook' | 'calm' | 'grown'
/** How much the robot speaks without being asked. */
export type Narration = 'full' | 'prompted' | 'on-demand'
/** How many things a screen shows at once. */
export type InteractionDensity = 'sparse' | 'standard' | 'dense'

export interface AgeProfile {
  id: AgeBand
  minAge: number
  /** null: no upper limit. */
  maxAge: number | null
  visual: VisualMaturity
  /** Picture help before the learner's own answers say otherwise. */
  defaultScaffolding: Aids
  vocabulary: Vocabulary
  narration: Narration
  interactionDensity: InteractionDensity
  /** The strand level before any evidence (or placement). */
  baseComplexity: Level
  /** A year within the band that starts elsewhere (e.g. 6 starts at 3). */
  startByAge?: Readonly<Partial<Record<number, Level>>>
  /**
   * A new learner of this age is offered a short placement instead of the
   * prior: an older beginner is not sent through every early level, and age
   * is never taken for mastery.
   */
  placement: boolean
}

export const AGE_PROFILES: readonly AgeProfile[] = [
  {
    id: '3-4',
    minAge: 0,
    maxAge: 4,
    visual: 'toy',
    defaultScaffolding: 'full',
    vocabulary: 'simple',
    narration: 'full',
    interactionDensity: 'sparse',
    baseComplexity: 1,
    placement: false,
  },
  {
    id: '5-6',
    minAge: 5,
    maxAge: 6,
    visual: 'garden',
    defaultScaffolding: 'full',
    vocabulary: 'simple',
    narration: 'full',
    interactionDensity: 'sparse',
    baseComplexity: 2,
    startByAge: { 6: 3 },
    placement: false,
  },
  {
    id: '7-9',
    minAge: 7,
    maxAge: 9,
    visual: 'workbook',
    defaultScaffolding: 'partial',
    vocabulary: 'standard',
    narration: 'prompted',
    interactionDensity: 'standard',
    baseComplexity: 4,
    placement: true,
  },
  {
    id: '10-12',
    minAge: 10,
    maxAge: 12,
    visual: 'calm',
    defaultScaffolding: 'minimal',
    vocabulary: 'standard',
    narration: 'on-demand',
    interactionDensity: 'standard',
    baseComplexity: 5,
    placement: true,
  },
  {
    id: '13-15',
    minAge: 13,
    maxAge: 15,
    visual: 'grown',
    defaultScaffolding: 'minimal',
    vocabulary: 'rich',
    narration: 'on-demand',
    interactionDensity: 'dense',
    baseComplexity: 5,
    placement: true,
  },
  {
    id: '16+',
    minAge: 16,
    maxAge: null,
    visual: 'grown',
    defaultScaffolding: 'minimal',
    vocabulary: 'rich',
    narration: 'on-demand',
    interactionDensity: 'dense',
    baseComplexity: 5,
    placement: true,
  },
]

/** A guest, or an unreadable birth date, is presented as 5–6 (young, not the youngest). */
export const GUEST_BAND: AgeBand = '5-6'

/** The profile of an age (years; null = guest). Never a ceiling. */
export function ageProfile(age: number | null): AgeProfile {
  const profiles = AGE_PROFILES
  if (age === null || !Number.isFinite(age)) return profiles.find((p) => p.id === GUEST_BAND)!
  return (
    profiles.find((p) => age >= p.minAge && (p.maxAge === null || age <= p.maxAge)) ?? profiles[0]!
  )
}

/** The band of an age: presentation guidance, never a ceiling. */
export function ageBand(age: number | null): AgeBand {
  return ageProfile(age).id
}

/** The two preschool bands (3–4, 5–6): full pictures, simple words, a speaking guide. */
export function isYoungBand(band: AgeBand): boolean {
  return band === '3-4' || band === '5-6'
}

/** Where a strand starts for a real age before any evidence (guest: 2, gently). */
export function priorLevel(age: number | null): Level {
  if (age === null || !Number.isFinite(age)) return 2
  const profile = ageProfile(age)
  return profile.startByAge?.[Math.floor(age)] ?? profile.baseComplexity
}

/**
 * Mastery steps above level 5 before any evidence: none, at any age. Age is
 * never taken for mastery (contract Phase 22): an older learner starts at the
 * top young level (mature in look, not in claimed mastery), and a placement
 * or their own strong runs earn the steps above it, with no ceiling.
 */
export function priorMastery(_age: number | null): number {
  return 0
}

/** Is a short placement offered to a new learner of this age? */
export function offersPlacement(age: number | null): boolean {
  return age !== null && Number.isFinite(age) && ageProfile(age).placement
}

/**
 * The young content tier (4/5/6: picture-first, fewer answers … workbook
 * items) a screen shows, resolved from the strand's challenge level, never
 * from age: a strong four-year-old moves up as their level does, and a
 * fourteen-year-old placed at the foundations gets the foundational items
 * (in their own grown-up look, which `visual` decides).
 */
export type ContentTier = 4 | 5 | 6

export function contentTier(level: Level): ContentTier {
  if (level <= 1) return 4
  if (level === 2) return 5
  return 6
}

/** Guest play (no profile) shows the full young version, as it always has. */
export const GUEST_TIER: ContentTier = 6

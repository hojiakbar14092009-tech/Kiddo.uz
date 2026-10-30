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

/**
 * How sizes and distances are spoken about (Phase 33 Scale Portal): pictures
 * and bigger/smaller, then rough ratios with everyday units, then orders of
 * magnitude, then scientific notation and AU / light-years.
 */
export type ScaleDetail = 'compare' | 'ratio' | 'magnitude' | 'scientific'

/**
 * How spatial puzzles are built (Phase 34 Shadow Lab): one object and one
 * light, then turning and moving the light, then several constraints at
 * once and viewpoint reasoning.
 */
export type PuzzleDepth = 'simple' | 'spatial' | 'multi'

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
  scaleDetail: ScaleDetail
  puzzleDepth: PuzzleDepth
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
    scaleDetail: 'compare',
    puzzleDepth: 'simple',
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
    scaleDetail: 'compare',
    puzzleDepth: 'simple',
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
    scaleDetail: 'ratio',
    puzzleDepth: 'spatial',
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
    scaleDetail: 'magnitude',
    puzzleDepth: 'multi',
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
    scaleDetail: 'scientific',
    puzzleDepth: 'multi',
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
    scaleDetail: 'scientific',
    puzzleDepth: 'multi',
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

/*
 * Character maturity (Phase 31): how Kiddo's robot looks and moves for a
 * learner's visual maturity — by real age only, never by level, so an
 * advanced young learner keeps a young robot and an older beginner never gets
 * a preschool one. One model, three variants of posture, gesture, idle style,
 * proportions and outfit presentation; the robot is never just scaled taller.
 */
export type CharacterStage = 'young' | 'middle' | 'older'

export interface CharacterStyle {
  stage: CharacterStage
  /** How outfit colours are shown (shop/outfits.ts OutfitTone). */
  tone: 'bright' | 'rich' | 'muted'
  /** Wardrobe categories shown first ("for you"); every item stays open. */
  featured: readonly string[]
  /** Breathing bob of the 2D robot, px. */
  breath: number
  /** Slow head sway, degrees. */
  sway: number
  /** Happy jump height, px. */
  jump: number
  /** Celebration hop height, px. */
  hop: number
  /** Arms at rest, degrees from the body (younger: out and playful). */
  armRest: number
  /** Head size against the body (younger: big-headed; older: closer to the body). */
  headScale: number
  /** Posture: a playful head tilt at rest (younger) or an upright head (older); degrees. */
  headTilt: number
  /** 3D: speed of the idle loop (1 = as authored). */
  idleTempo: number
  /** 3D: spontaneous idle gestures come this many times less often. */
  idleCalm: number
  /** How big a body reaction is (squash, shake, sway of a dance): 1 = full. */
  reactionScale: number
  /** Small celebrations become a calm encouraging gesture (big moments stay). */
  composedReactions: boolean
}

export const CHARACTER_STYLES: Readonly<Record<CharacterStage, CharacterStyle>> = {
  young: {
    stage: 'young',
    tone: 'bright',
    featured: ['creative', 'casual', 'seasonal', 'space'],
    breath: 4,
    sway: 2.5,
    jump: 34,
    hop: 10,
    armRest: 10,
    headScale: 1,
    headTilt: -3,
    idleTempo: 1,
    idleCalm: 1,
    reactionScale: 1,
    composedReactions: false,
  },
  middle: {
    stage: 'middle',
    tone: 'rich',
    featured: ['sport', 'explorer', 'science', 'space'],
    breath: 3,
    sway: 1.6,
    jump: 24,
    hop: 7,
    armRest: 7,
    headScale: 0.95,
    headTilt: -1.5,
    idleTempo: 0.9,
    idleCalm: 1.3,
    reactionScale: 0.75,
    composedReactions: false,
  },
  older: {
    stage: 'older',
    tone: 'muted',
    featured: ['smart', 'tech', 'traditional', 'casual'],
    breath: 2,
    sway: 0.8,
    jump: 14,
    hop: 4,
    armRest: 4,
    headScale: 0.9,
    headTilt: 0,
    idleTempo: 0.8,
    idleCalm: 1.7,
    reactionScale: 0.5,
    composedReactions: true,
  },
}

const STAGE_OF: Readonly<Record<VisualMaturity, CharacterStage>> = {
  toy: 'young',
  garden: 'young',
  workbook: 'middle',
  calm: 'older',
  grown: 'older',
}

/** The robot's style for a real age (null = guest, presented as 5–6). */
export function characterStyle(age: number | null): CharacterStyle {
  return CHARACTER_STYLES[STAGE_OF[ageProfile(age).visual]]
}

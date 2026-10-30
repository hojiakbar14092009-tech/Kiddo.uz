import { stateLevel, type ChallengeLevel, type StrandState } from '@/domain/learner/profile'
import {
  AGE_BANDS,
  AGE_PROFILES,
  ageBand,
  isYoungBand,
  type AgeBand,
  type Aids,
  type Vocabulary,
} from './ageProfile'
import {
  dueReviews,
  isActive,
  MEMORY_POLICY,
  skillStatus,
  type SkillMemory,
} from '@/domain/learningMemory/memory'

/*
 * AdaptiveLearningService (Phase 15). Pure and deterministic: the same
 * evidence and the same clock give the same plan. No store, no React, no AI.
 *
 * What it decides for the next session of one strand (Math Lab first):
 * complexity (the challenge level), number range, how many answer cards, how
 * much picture help, when hints come, how long a session is, how deep the
 * explanations go, which skills to practise and which to review.
 *
 * Age is only a starting point and a presentation hint (age bands). Evidence
 * overrides it gradually: with little evidence the age band decides; the more
 * the child has answered, the more their own answers decide. A struggling
 * older child gets more pictures and fewer options; a strong young child gets
 * harder work. Nothing here is a label for the child: the plan names skills
 * and reasons, never traits. It never pays anything either: adaptation is
 * published as an event, rewards stay with the universe rules.
 */

export { AGE_BANDS, ageBand, isYoungBand, type AgeBand, type Aids, type Vocabulary }

export type HintTiming = 'picture-first' | 'step-by-step'
export type Explanation = 'show' | 'short' | 'why'

/** Why the plan looks like this (shown to parents in plain words; never a trait). */
export type AdaptReason =
  | 'age-start'
  | 'own-answers'
  | 'strong-runs'
  | 'needs-support'
  | 'hint-reliant'
  | 'confirmed-mistake'
  | 'review-due'

export interface AdaptivePolicy {
  /** Answers after which the child's own evidence fully decides (gradual before). */
  fullEvidence: number
  /** Below this weight the age band alone shapes the presentation. */
  minWeight: number
  /** Independent share at or above which help can be reduced. */
  strongShare: number
  /** Independent share below which help is added. */
  supportShare: number
  /** Share of recent questions that needed a hint, from which hints come picture-first. */
  hintReliance: number
  /** Retrieval practice: at most this many reviews per session. */
  maxReviews: number
  /** The support decision looks at this many latest runs of the strand (not the whole history). */
  recentRuns: number
}

export const ADAPTIVE_POLICY: AdaptivePolicy = {
  fullEvidence: 20,
  minWeight: 0.25,
  strongShare: 0.85,
  supportShare: 0.5,
  hintReliance: 0.5,
  maxReviews: 2,
  recentRuns: 5,
}

export interface AdaptiveInput {
  /** Years; null for a guest. */
  age: number | null
  /** The strand's learner state (level, runs, independent / total). */
  strand: StrandState | undefined
  /** Learning memory of this strand's skills (keys with the namespace, e.g. `math:add:within10`). */
  skills: Readonly<Record<string, SkillMemory>>
  /** ISO time; the only clock the service sees. */
  now: string
  /**
   * The strand's latest finished runs, newest first (universe `recent`). Help
   * follows how the child does now, not their whole history; without them the
   * strand's lifetime share is used.
   */
  recent?: readonly { independent: number; total: number }[]
}

export interface AdaptivePlan {
  band: AgeBand
  /** Complexity 1–5 (the learner level: age start, then the child's runs). */
  level: ChallengeLevel
  /** 0–1: how much the child's own answers decide (vs the age band). */
  weight: number
  numberMax: number
  options: 2 | 3 | 4
  aids: Aids
  hints: HintTiming
  vocabulary: Vocabulary
  explanation: Explanation
  sessionLength: number
  /** Skills to practise now (an active misconception), most urgent first. */
  focus: string[]
  /** Due spaced reviews (retrieval practice), at most `maxReviews`. */
  reviews: string[]
  /** Skills mastered (score and evidence over the memory's threshold). */
  mastered: string[]
  /** Skills whose next review comes within three days. */
  reviewSoon: string[]
  reasons: AdaptReason[]
}

const AIDS_ORDER: readonly Aids[] = ['minimal', 'partial', 'full']

/** The age profile's default help and words (domain/adaptive/ageProfile). */
function bandAids(band: AgeBand): Aids {
  return AGE_PROFILES.find((profile) => profile.id === band)!.defaultScaffolding
}

function bandVocabulary(band: AgeBand): Vocabulary {
  return AGE_PROFILES.find((profile) => profile.id === band)!.vocabulary
}

function shiftAids(aids: Aids, by: number): Aids {
  const index = Math.min(2, Math.max(0, AIDS_ORDER.indexOf(aids) + by))
  return AIDS_ORDER[index]!
}

export function numberMaxFor(level: ChallengeLevel): number {
  if (level === 1) return 5
  if (level <= 3) return 10
  return 20
}

/** Share of the recent questions that needed a hint (null with too few). */
export function hintShare(skills: readonly SkillMemory[]): number | null {
  const recent = skills.flatMap((skill) => skill.hintsRecent)
  if (recent.length < 4) return null
  return recent.filter((level) => level > 0).length / recent.length
}

const DAY_MS = 86_400_000

/** The plan for the next session of one strand. */
export function adaptivePlan(
  input: AdaptiveInput,
  policy: AdaptivePolicy = ADAPTIVE_POLICY,
): AdaptivePlan {
  const band = ageBand(input.age)
  const level = stateLevel(input.strand, input.age)
  const reasons: AdaptReason[] = []
  const total = Math.max(0, input.strand?.total ?? 0)
  const weight = Math.min(1, total / policy.fullEvidence)
  const latest = (input.recent ?? []).slice(0, policy.recentRuns)
  const latestTotal = latest.reduce((sum, run) => sum + Math.max(0, run.total), 0)
  const share =
    latestTotal > 0
      ? Math.min(
          1,
          latest.reduce((sum, run) => sum + Math.max(0, run.independent), 0) / latestTotal,
        )
      : total > 0
        ? Math.min(1, (input.strand?.independent ?? 0) / total)
        : null
  reasons.push((input.strand?.runs ?? 0) >= 2 ? 'own-answers' : 'age-start')

  const skills = Object.values(input.skills)
  const nowMs = new Date(input.now).getTime()

  // gradual: the age band's presentation until there is enough evidence
  let aids = bandAids(band)
  let vocabulary = bandVocabulary(band)
  let options: 2 | 3 | 4 = level <= 2 ? 3 : 4
  const evidenceCounts = weight >= policy.minWeight && share !== null
  if (evidenceCounts && share < policy.supportShare) {
    aids = shiftAids(aids, 1)
    // fewer cards from level 3; never two (a blind guess would count as knowing)
    options = 3
    if (vocabulary === 'rich') vocabulary = 'standard'
    reasons.push('needs-support')
  } else if (evidenceCounts && share >= policy.strongShare) {
    aids = shiftAids(aids, -1)
    reasons.push('strong-runs')
  }

  // hint dependency: help that worked is not independence; hints come picture-first
  const reliance = hintShare(skills)
  const hintReliant = reliance !== null && reliance >= policy.hintReliance
  if (hintReliant) {
    aids = shiftAids(aids, 1)
    reasons.push('hint-reliant')
  }

  const focus = skills
    .filter((skill) => Object.values(skill.misconceptions).some(isActive))
    .filter((skill) => skillStatus(skill) === 'confirmed' || skillStatus(skill) === 'improving')
    .sort((a, b) => {
      const rank = (s: SkillMemory) => (skillStatus(s) === 'confirmed' ? 0 : 1)
      return rank(a) - rank(b) || b.lastPracticedAt.localeCompare(a.lastPracticedAt)
    })
    .map((skill) => skill.skill)
  if (focus.length > 0) {
    reasons.push('confirmed-mistake')
    // a skill with a real misconception gets the pictures back (at least partial)
    if (aids === 'minimal') aids = 'partial'
  }

  // retrieval practice: due reviews, never above today's level; more from level 3
  // every due one first, then the level filter, then the limit (none is starved)
  const maxReviews = level >= 3 ? policy.maxReviews : 1
  const reviews = dueReviews(input.skills, input.now, Number.MAX_SAFE_INTEGER)
    .filter((skill) => (skill.level ?? 1) <= level)
    .map((skill) => skill.skill)
    .slice(0, maxReviews)
  // a confirmed difficulty not due yet still gets one similar exercise (targeted practice)
  const practice = focus.find(
    (key) => !reviews.includes(key) && (input.skills[key]?.level ?? 1) <= level,
  )
  if (practice && reviews.length < maxReviews) reviews.push(practice)
  if (reviews.length > 0) reasons.push('review-due')

  const mastered = skills
    .filter(
      (skill) =>
        skill.masteredAt !== null &&
        skill.mastery >= MEMORY_POLICY.unmasterScore &&
        !focus.includes(skill.skill),
    )
    .map((skill) => skill.skill)
    .sort()

  const reviewSoon = skills
    .filter((skill) => {
      if (!skill.nextReviewAt || reviews.includes(skill.skill)) return false
      const at = new Date(skill.nextReviewAt).getTime()
      return at - nowMs <= 3 * DAY_MS
    })
    .map((skill) => skill.skill)
    .sort()

  return {
    band,
    level,
    weight,
    numberMax: numberMaxFor(level),
    options,
    aids,
    // the ladder starts with the lowest help (a clue); only evidence that the
    // child needs pictures (relying on hints, or struggling) starts it at the picture
    hints: hintReliant || reasons.includes('needs-support') ? 'picture-first' : 'step-by-step',
    vocabulary,
    explanation: level <= 2 ? 'show' : level <= 4 ? 'short' : 'why',
    sessionLength: level <= 2 ? 5 : 6,
    focus,
    reviews,
    mastered,
    reviewSoon,
    reasons,
  }
}

/** Only the skills of one namespace (`math:`), for one strand's plan. */
export function skillsOf(
  skills: Readonly<Record<string, SkillMemory>>,
  namespace: string,
): Record<string, SkillMemory> {
  const prefix = `${namespace}:`
  return Object.fromEntries(Object.entries(skills).filter(([key]) => key.startsWith(prefix)))
}

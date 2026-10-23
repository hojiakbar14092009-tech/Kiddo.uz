import type { ChallengeLevel } from '@/domain/learner/profile'
import { shuffle, type RandomSource } from '@/lib/random'
import {
  areClose,
  BASIC_FEELINGS,
  FEELING_TEXT,
  FEELINGS,
  MORE_FEELINGS,
  SCENES,
  SITUATIONS,
  SUBTLE_FEELINGS,
  type FeelingId,
  type Text,
} from './content'

/*
 * Pure logic of the Emotions & Social Skills section: what a challenge level
 * (domain/learner, strand 'social') means, and the questions of one run.
 *
 * L1–2: the four basic feelings; three faces to choose from (four questions),
 *       two answers for stories and situations (five questions), so tapping
 *       at random rarely earns three stars. Every situation answer has a
 *       picture, and the speaker reads the question and the answers.
 * L3:   six feelings (+ surprised, calm), three answers everywhere; a kind
 *       idea that is not the kindest one counts as found too.
 * L4–5: the subtler feelings too and a "why" after every answer. L5 asks
 *       mostly about the subtler feelings.
 * From L3 every face has the same colour, so only the face itself tells.
 * Age never locks anything: the level only chooses the content.
 */

export const SCORED_KINDS = ['faces', 'scenes', 'kindness'] as const
export type ScoredKind = (typeof SCORED_KINDS)[number]
export type FeelingsKind = ScoredKind | 'calm'

export function isFeelingsKind(value: string | undefined): value is FeelingsKind {
  return value === 'calm' || (SCORED_KINDS as readonly string[]).includes(value ?? '')
}

export interface LevelPlan {
  level: ChallengeLevel
  feelings: readonly FeelingId[]
  /** Faces per "Find the … face!" question. */
  faceChoices: 2 | 3
  /** Answers per story question. */
  feelingChoices: 2 | 3
  /** Answers per "What could you do?" question. */
  kindnessChoices: 2 | 3
  /** Questions of a face run. */
  faceQuestions: number
  /** Questions of a story or situation run. */
  questions: number
  /** Show a "why" sentence after each face or story answer. */
  why: boolean
  /** L5: prefer the subtler feelings as the asked ones. */
  preferSubtle: boolean
  /** A kind (not the kindest) idea counts as found, on the first try as independent. */
  goodIsSuccess: boolean
  /** Draw every face in one colour, so the colour does not give the answer away. */
  neutralFaces: boolean
}

export function levelPlan(level: ChallengeLevel): LevelPlan {
  if (level <= 2) {
    return {
      level,
      feelings: BASIC_FEELINGS,
      faceChoices: 3,
      feelingChoices: 2,
      kindnessChoices: 2,
      faceQuestions: BASIC_FEELINGS.length,
      questions: 5,
      why: false,
      preferSubtle: false,
      goodIsSuccess: false,
      neutralFaces: false,
    }
  }
  if (level === 3) {
    return {
      level,
      feelings: [...BASIC_FEELINGS, ...MORE_FEELINGS],
      faceChoices: 3,
      feelingChoices: 3,
      kindnessChoices: 3,
      faceQuestions: 5,
      questions: 5,
      why: false,
      preferSubtle: false,
      goodIsSuccess: true,
      neutralFaces: true,
    }
  }
  return {
    level,
    feelings: FEELINGS,
    faceChoices: 3,
    feelingChoices: 3,
    kindnessChoices: 3,
    faceQuestions: 5,
    questions: 5,
    why: true,
    preferSubtle: level === 5,
    goodIsSuccess: true,
    neutralFaces: true,
  }
}

export interface Option {
  id: string
  /** A face to draw (feeling questions). */
  feeling?: FeelingId
  label: Text
  /** Shown after the child picks it ("what could you do?" choices, every one). */
  explain?: Text
  /** A "what could you do?" choice: its picture (see choiceArt.tsx). */
  picture?: string
  /** The fitting face or story feeling, or the kindest idea. */
  best: boolean
  /** Picking it ends the question: the best answer, from L3 also a kind idea. */
  accepted: boolean
}

export interface Question {
  id: string
  kind: ScoredKind
  /** For stories: the child's name in the question. */
  name?: Text
  prompt: Text
  /** A 3D picture of the story or situation (faces have none: the faces are the task). */
  picture?: string
  options: Option[]
  /** L4–5: why the answer fits. */
  why?: Text
}

function feelingOption(feeling: FeelingId, best: boolean): Option {
  return { id: feeling, feeling, label: FEELING_TEXT[feeling].label, best, accepted: best }
}

/**
 * `count` different items in random order; with `preferred`, about 60 % of
 * them come from the preferred ones (L5: the subtler feelings).
 */
export function pickTargets<T>(
  items: readonly T[],
  count: number,
  random: RandomSource,
  preferred: (item: T) => boolean = () => false,
): T[] {
  const first = shuffle(
    items.filter((item) => preferred(item)),
    random,
  )
  const rest = shuffle(
    items.filter((item) => !preferred(item)),
    random,
  )
  const share = Math.ceil(count * 0.6)
  const ordered = [...first.slice(0, share), ...rest, ...first.slice(share)]
  return shuffle(ordered.slice(0, count), random)
}

function distractors(
  answer: FeelingId,
  pool: readonly FeelingId[],
  count: number,
  random: RandomSource,
  avoidClose: boolean,
): FeelingId[] {
  const allowed = pool.filter(
    (feeling) => feeling !== answer && !(avoidClose && areClose(feeling, answer)),
  )
  return shuffle(allowed, random).slice(0, count)
}

const isSubtle = (feeling: FeelingId) => (SUBTLE_FEELINGS as readonly string[]).includes(feeling)

export function buildFaceQuestions(plan: LevelPlan, random: RandomSource): Question[] {
  const targets = pickTargets(plan.feelings, plan.faceQuestions, random, (feeling) =>
    plan.preferSubtle ? isSubtle(feeling) : false,
  )
  return targets.map((feeling, index) => {
    // faces are drawn to be told apart, so close feelings may stand side by side
    const others = distractors(feeling, plan.feelings, plan.faceChoices - 1, random, false)
    return {
      id: `faces-${index}-${feeling}`,
      kind: 'faces',
      prompt: FEELING_TEXT[feeling].find,
      options: shuffle(
        [feelingOption(feeling, true), ...others.map((f) => feelingOption(f, false))],
        random,
      ),
      why: plan.why ? FEELING_TEXT[feeling].clue : undefined,
    }
  })
}

export function buildSceneQuestions(plan: LevelPlan, random: RandomSource): Question[] {
  const scenes = SCENES.filter((scene) => plan.feelings.includes(scene.feeling))
  const targets = pickTargets(scenes, plan.questions, random, (scene) =>
    plan.preferSubtle ? isSubtle(scene.feeling) : false,
  )
  return targets.map((scene, index) => {
    const others = distractors(scene.feeling, plan.feelings, plan.feelingChoices - 1, random, true)
    return {
      id: `scenes-${index}-${scene.id}`,
      kind: 'scenes',
      name: scene.name,
      prompt: scene.text,
      picture: scene.picture,
      options: shuffle(
        [feelingOption(scene.feeling, true), ...others.map((f) => feelingOption(f, false))],
        random,
      ),
      why: plan.why ? scene.why : undefined,
    }
  })
}

export function buildKindnessQuestions(plan: LevelPlan, random: RandomSource): Question[] {
  const targets = pickTargets(SITUATIONS, plan.questions, random)
  return targets.map((situation, index) => {
    // with two answers: the kindest idea and the one to talk about
    const choices =
      plan.kindnessChoices === 3
        ? situation.choices
        : situation.choices.filter((choice) => choice.kind !== 'good')
    return {
      id: `kindness-${index}-${situation.id}`,
      kind: 'kindness',
      prompt: situation.text,
      picture: situation.picture,
      options: shuffle(
        choices.map((choice) => ({
          id: choice.id,
          label: choice.text,
          explain: choice.explain,
          picture: choice.id,
          best: choice.kind === 'best',
          accepted: choice.kind === 'best' || (choice.kind === 'good' && plan.goodIsSuccess),
        })),
        random,
      ),
    }
  })
}

export function buildQuestions(
  kind: ScoredKind,
  level: ChallengeLevel,
  random: RandomSource = Math.random,
): Question[] {
  const plan = levelPlan(level)
  if (kind === 'faces') return buildFaceQuestions(plan, random)
  if (kind === 'scenes') return buildSceneQuestions(plan, random)
  return buildKindnessQuestions(plan, random)
}

/**
 * What a finished run reports to the universe: every question ends with an
 * accepted answer found (`correct` = total); `independent` counts those found
 * on the first try.
 */
export function runResult(firstTries: readonly boolean[]) {
  const total = firstTries.length
  return { correct: total, total, independent: firstTries.filter(Boolean).length }
}

export type ContentTier = 'basic' | 'mid' | 'full'

/**
 * Which content a level plays: levels with the same questions share a tier,
 * so their stars are one record (L1 and L2 are the same game).
 */
export function contentTier(kind: ScoredKind, level: ChallengeLevel): ContentTier {
  if (level <= 2) return 'basic'
  // situations: the same three answers from L3 on (the "why" is for feelings only)
  if (kind === 'kindness') return 'full'
  return level === 3 ? 'mid' : 'full'
}

/** The activity id: `feelings:<kind>:<tier>`, e.g. `feelings:faces:basic`. */
export function feelingsActivity(kind: ScoredKind, level: ChallengeLevel): string {
  return `feelings:${kind}:${contentTier(kind, level)}`
}

// ------------------------------------------------------------ calm corner

/** Four slow breaths: in for 4 s, out for 4 s (no score, no reward). */
export const BREATHS = 4
export const BREATH_IN_MS = 4000
export const BREATH_OUT_MS = 4000

export interface BreathPosition {
  breath: number
  half: 'in' | 'out'
}

export const FIRST_BREATH: BreathPosition = { breath: 0, half: 'in' }

/** The next half-breath, or null after the last breath out. */
export function nextPosition(pos: BreathPosition): BreathPosition | null {
  if (pos.half === 'in') return { breath: pos.breath, half: 'out' }
  if (pos.breath + 1 >= BREATHS) return null
  return { breath: pos.breath + 1, half: 'in' }
}

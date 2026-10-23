import type { ChallengeLevel } from '@/domain/learner'
import { DINO_IDS, DINOS, type Diet, type DinoId, type Feature } from './content'

/*
 * The Dino quiz, generated per challenge level (domain/learner, 'science'):
 * level 1 asks 4 questions with 2 pictures each; higher levels ask more,
 * show more pictures and add harder kinds (features, "which was longer?",
 * "which one is not a dinosaur?", fish as food). Pure, with an injectable
 * random source, so tests can check every level.
 */

export type QuizKind =
  'eat' | 'whoMeat' | 'whoPlant' | 'biggest' | 'flew' | 'feature' | 'longer' | 'notDino'

export interface QuizQuestion {
  id: string
  kind: QuizKind
  /** 'dino': pictures of animals; 'diet': plant / meat / fish. */
  optionType: 'dino' | 'diet'
  options: string[]
  answer: string
  /** The animal asked about ('eat'). */
  subject?: DinoId
  feature?: Feature
}

interface LevelPlan {
  options: number
  kinds: readonly QuizKind[]
  features: readonly Feature[]
  /** Fish is a third food choice (and Pteranodon can be asked about). */
  fish: boolean
}

export const QUIZ_LEVELS: Record<ChallengeLevel, LevelPlan> = {
  1: { options: 2, kinds: ['eat', 'flew', 'biggest', 'whoMeat'], features: [], fish: false },
  2: {
    options: 3,
    kinds: ['eat', 'flew', 'biggest', 'whoPlant', 'feature'],
    features: ['horns', 'neck', 'plates'],
    fish: false,
  },
  3: {
    options: 3,
    kinds: ['eat', 'whoMeat', 'feature', 'feature', 'flew'],
    features: ['horns', 'neck', 'plates', 'club', 'arms'],
    fish: false,
  },
  4: {
    options: 4,
    kinds: ['eat', 'whoMeat', 'feature', 'feature', 'longer', 'biggest'],
    features: ['horns', 'neck', 'plates', 'club', 'arms', 'crest'],
    fish: true,
  },
  5: {
    options: 4,
    kinds: ['eat', 'notDino', 'feature', 'feature', 'longer', 'whoPlant'],
    features: ['plates', 'club', 'arms', 'crest'],
    fish: true,
  },
}

/** Differences smaller than this (metres) are not asked: the answer must be clear. */
export const LONGER_MIN_GAP = 3

type Random = () => number

export function shuffle<T>(items: readonly T[], random: Random): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const a = out[i] as T
    out[i] = out[j] as T
    out[j] = a
  }
  return out
}

function pick<T>(items: readonly T[], random: Random): T {
  const item = items[Math.floor(random() * items.length)]
  if (item === undefined) throw new Error('nothing to pick from')
  return item
}

/** The answer plus distractors (none of which is also right), shuffled. */
function dinoOptions(
  answer: DinoId,
  wrong: readonly DinoId[],
  count: number,
  random: Random,
): string[] {
  const distractors = shuffle(
    wrong.filter((id) => id !== answer),
    random,
  ).slice(0, Math.max(1, count - 1))
  return shuffle([answer, ...distractors], random)
}

const ALL = DINO_IDS
const isPlant = (id: DinoId) => DINOS[id].diet === 'plant'
const ownerOf = (feature: Feature): DinoId =>
  ALL.find((id) => DINOS[id].feature === feature) ?? 'trex'

function question(
  kind: QuizKind,
  plan: LevelPlan,
  used: Set<string>,
  random: Random,
): QuizQuestion | null {
  const n = plan.options
  switch (kind) {
    case 'eat': {
      const subjects = ALL.filter((id) => plan.fish || DINOS[id].diet !== 'fish')
      const subject = pick(
        subjects.filter((id) => !used.has(`eat-${id}`)),
        random,
      )
      const diets: Diet[] = plan.fish ? ['plant', 'meat', 'fish'] : ['plant', 'meat']
      return {
        id: `eat-${subject}`,
        kind,
        optionType: 'diet',
        subject,
        answer: DINOS[subject].diet,
        options: shuffle(diets, random),
      }
    }
    case 'whoMeat':
      return {
        id: 'whoMeat',
        kind,
        optionType: 'dino',
        answer: 'trex',
        options: dinoOptions('trex', ALL.filter(isPlant), n, random),
      }
    case 'whoPlant': {
      const answer = pick(ALL.filter(isPlant), random)
      return {
        id: 'whoPlant',
        kind,
        optionType: 'dino',
        answer,
        options: dinoOptions(
          answer,
          ALL.filter((id) => !isPlant(id)),
          n,
          random,
        ),
      }
    }
    case 'biggest':
      return {
        id: 'biggest',
        kind,
        optionType: 'dino',
        answer: 'brachiosaurus',
        // the flying reptile is no dinosaur (and a wingspan is not a length)
        options: dinoOptions(
          'brachiosaurus',
          ALL.filter((id) => DINOS[id].dinosaur),
          n,
          random,
        ),
      }
    case 'flew':
      return {
        id: 'flew',
        kind,
        optionType: 'dino',
        answer: 'pteranodon',
        options: dinoOptions('pteranodon', ALL, n, random),
      }
    case 'notDino':
      return {
        id: 'notDino',
        kind,
        optionType: 'dino',
        answer: 'pteranodon',
        options: dinoOptions('pteranodon', ALL, n, random),
      }
    case 'feature': {
      const free = plan.features.filter((f) => !used.has(`feature-${f}`))
      if (free.length === 0) return null
      const feature = pick(free, random)
      const answer = ownerOf(feature)
      return {
        id: `feature-${feature}`,
        kind,
        optionType: 'dino',
        feature,
        answer,
        options: dinoOptions(answer, ALL, n, random),
      }
    }
    case 'longer': {
      const measured = ALL.filter((id) => DINOS[id].lengthM > 0)
      const pairs: [DinoId, DinoId][] = []
      for (const a of measured) {
        for (const b of measured) {
          if (DINOS[a].lengthM - DINOS[b].lengthM >= LONGER_MIN_GAP) pairs.push([a, b])
        }
      }
      const [long, short] = pick(pairs, random)
      return {
        id: 'longer',
        kind,
        optionType: 'dino',
        answer: long,
        options: shuffle([long, short], random),
      }
    }
  }
}

/** The questions of one quiz run at a level (each kind once, features never repeated). */
export function planQuiz(level: ChallengeLevel, random: Random = Math.random): QuizQuestion[] {
  const plan = QUIZ_LEVELS[level]
  const used = new Set<string>()
  const out: QuizQuestion[] = []
  for (const kind of shuffle(plan.kinds, random)) {
    const q = question(kind, plan, used, random)
    if (!q || used.has(q.id)) continue
    used.add(q.id)
    out.push(q)
  }
  return out
}

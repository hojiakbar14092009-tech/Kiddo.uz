import type { Language } from '@/content/languages'
import type { LearnChild } from '@/features/learn/learnStore'
import { makeOptions, sample, shuffle, type Rng } from '@/features/learn/random'
import { mixWithReview, notSameOrder } from '@/features/learn/review'
import { testLength } from '@/features/learn/session'
import {
  KIND,
  LESSONS,
  PLANETS,
  SPACE_IDS,
  TEXT,
  isPlanet,
  orderOfPlanet,
  type AgeLevel,
  type Lesson,
  type PlanetId,
  type SpaceId,
} from './content'

/*
 * Question generators of the Koinot section. Every question has exactly one
 * right answer, different options in a changing order, and a skill name
 * ("identify:earth", "order:3", "kind:star") for the learning record.
 */

/** Answer cards per question: 2 big ones at 4, 3 at 5, 4 at 6. */
export const OPTION_COUNT: Record<AgeLevel, number> = { 4: 2, 5: 3, 6: 4 }

export type SeedType = 'find' | 'feature' | 'name' | 'first' | 'after' | 'kind'

/** What a question is about, before options are chosen. */
export interface Seed {
  type: SeedType
  /** The right answer. */
  target: SpaceId
  /** For "after": the planet that comes before the answer. */
  from?: PlanetId
}

export interface SpaceQuestion {
  id: string
  skill: string
  type: SeedType
  prompt: string
  help: string
  /** Show the planet order strip with the help. */
  helpOrder: boolean
  options: SpaceId[]
  correct: SpaceId
  /** A picture shown with the prompt ("Which planet is this?"). */
  show?: SpaceId
  /** Answer cards show names instead of pictures. */
  asNames: boolean
}

export const seedId = (seed: Seed) =>
  seed.type === 'after' ? `after:${seed.from}` : `${seed.type}:${seed.target}`

export function skillOf(seed: Seed): string {
  switch (seed.type) {
    case 'find':
    case 'name':
      return `identify:${seed.target}`
    case 'feature':
      return `feature:${seed.target}`
    case 'first':
    case 'after':
      return `order:${orderOfPlanet(seed.target as PlanetId)}`
    case 'kind':
      return `kind:${KIND[seed.target]}`
  }
}

const next = (planet: PlanetId): PlanetId | undefined => PLANETS[orderOfPlanet(planet)]

/** The questions a lesson can bring (and, once it is done, a test). */
export function seedsOfLesson(lesson: Lesson): Seed[] {
  switch (lesson.kind) {
    case 'meet':
      return lesson.teaches.flatMap((target): Seed[] =>
        isPlanet(target) && lesson.level >= 5
          ? [
              { type: 'find', target },
              { type: 'feature', target },
            ]
          : [{ type: 'find', target }],
      )
    case 'order': {
      const planets = lesson.teaches.filter(isPlanet)
      const seeds: Seed[] = planets.map((target) => ({ type: 'name', target }))
      if (planets.includes('mercury')) seeds.push({ type: 'first', target: 'mercury' })
      for (const from of planets) {
        const after = next(from)
        if (after && planets.includes(after)) seeds.push({ type: 'after', target: after, from })
      }
      return seeds
    }
    case 'kinds':
      return [
        { type: 'kind', target: 'sun' },
        { type: 'kind', target: 'moon' },
        { type: 'kind', target: 'earth' },
      ]
  }
}

/** Lessons of this age the child has done. */
export function taughtLessons(level: AgeLevel, stages: readonly string[]): Lesson[] {
  return LESSONS.filter((lesson) => lesson.level === level && stages.includes(lesson.stage))
}

/** Everything a test may ask: only what was taught. */
export function testPool(level: AgeLevel, stages: readonly string[]): Seed[] {
  const lessons = taughtLessons(level, stages)
  const seeds = lessons.flatMap(seedsOfLesson)
  const taught = new Set(lessons.flatMap((lesson) => lesson.teaches))
  // the step between the two halves (Mars → Jupiter) once both are taught
  if (level === 6 && taught.has('mars') && taught.has('jupiter')) {
    seeds.push({ type: 'after', target: 'jupiter', from: 'mars' })
  }
  // "which one is a planet?" with every planet the child knows
  if (level === 6 && lessons.some((lesson) => lesson.kind === 'kinds')) {
    for (const planet of PLANETS) {
      if (planet !== 'earth' && taught.has(planet)) seeds.push({ type: 'kind', target: planet })
    }
  }
  const seen = new Set<string>()
  return seeds.filter((seed) => {
    const id = seedId(seed)
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

/** Objects the child has met at this age (used first for wrong answer cards). */
export function knownObjects(level: AgeLevel, stages: readonly string[]): SpaceId[] {
  return [...new Set(taughtLessons(level, stages).flatMap((lesson) => lesson.cards))]
}

/** Wrong answer cards: known objects of the right sort first, then any of that sort. */
function distractors(seed: Seed, known: readonly SpaceId[], rng: Rng): SpaceId[] {
  const fits = (id: SpaceId): boolean => {
    if (id === seed.target) return false
    switch (seed.type) {
      case 'find':
        // never the Sun next to "stars" (the Sun is a star too)
        return !(KIND[seed.target] === 'star' && KIND[id] === 'star')
      case 'kind':
        return KIND[id] !== KIND[seed.target] && !(KIND[seed.target] === 'star' && id === 'stars')
      default:
        return isPlanet(id)
    }
  }
  const first = shuffle(known.filter(fits), rng)
  const rest = shuffle(
    SPACE_IDS.filter((id) => fits(id) && !first.includes(id)),
    rng,
  )
  return [...first, ...rest]
}

export function buildQuestion(
  seed: Seed,
  level: AgeLevel,
  language: Language,
  known: readonly SpaceId[],
  rng: Rng = Math.random,
): SpaceQuestion {
  const pack = TEXT[language]
  const target = pack.objects[seed.target]
  const count = OPTION_COUNT[level]
  // 4-year-olds pick between the two things they met; never anything new
  const pool = distractors(seed, known, rng)
  const options = makeOptions(seed.target, level === 4 ? pool.slice(0, 1) : pool, count, rng)
  const base = {
    id: seedId(seed),
    skill: skillOf(seed),
    type: seed.type,
    options,
    correct: seed.target,
    helpOrder: false,
    asNames: false,
    help: target.look,
  }
  switch (seed.type) {
    case 'find':
      return { ...base, prompt: target.find }
    case 'feature':
      return { ...base, prompt: target.feature ?? target.find }
    case 'name':
      return { ...base, prompt: pack.say.whichPlanet, show: seed.target, asNames: true }
    case 'first':
      return { ...base, prompt: pack.say.firstPlanet, help: pack.say.orderHelp, helpOrder: true }
    case 'after': {
      const from = pack.objects[seed.from ?? 'mercury']
      return { ...base, prompt: from.after ?? '', help: pack.say.orderHelp, helpOrder: true }
    }
    case 'kind': {
      const kind = KIND[seed.target]
      const prompt =
        kind === 'star'
          ? pack.say.whichStar
          : kind === 'moon'
            ? pack.say.whichMoon
            : pack.say.whichIsPlanet
      return { ...base, prompt, help: pack.say.kindHelp }
    }
  }
}

/** Practice questions at the end of a lesson (learning mode). */
export function lessonQuestions(
  lesson: Lesson,
  language: Language,
  rng: Rng = Math.random,
): SpaceQuestion[] {
  const seeds = seedsOfLesson(lesson)
  let chosen: Seed[]
  if (lesson.level === 4) {
    // «Yerni top», «Quyosh qani?» and one more
    const must = seeds.filter((seed) => seed.target === 'earth' || seed.target === 'sun')
    const more = sample(
      seeds.filter((seed) => !must.includes(seed)),
      1,
      rng,
    )
    chosen = shuffle([...must, ...more], rng)
  } else if (lesson.kind === 'order') {
    chosen = sample(
      seeds.filter((seed) => seed.type !== 'name'),
      1,
      rng,
    ).concat(
      sample(
        seeds.filter((seed) => seed.type === 'name'),
        1,
        rng,
      ),
    )
  } else if (lesson.kind === 'kinds') {
    chosen = shuffle(seeds, rng)
  } else {
    // one feature question per planet, plus finding one of them
    const features = seeds.filter((seed) => seed.type === 'feature')
    const finds = sample(
      seeds.filter((seed) => seed.type === 'find'),
      Math.max(0, 3 - features.length),
      rng,
    )
    chosen = shuffle([...features, ...finds], rng).slice(0, 3)
  }
  const known = lesson.level === 6 && lesson.kind !== 'kinds' ? lesson.teaches : lesson.cards
  return chosen.map((seed) => buildQuestion(seed, lesson.level, language, known, rng))
}

/** Number of test questions: 3, 4 or 5 – fewer only if fewer things were taught. */
export function testCount(level: AgeLevel, stages: readonly string[]): number {
  return Math.min(testLength(level), testPool(level, stages).length)
}

/** The short check: only taught things, weak skills mixed back in, never the same order twice. */
export function testQuestions(
  level: AgeLevel,
  language: Language,
  stages: readonly string[],
  learn: LearnChild,
  lastOrder: string | undefined,
  rng: Rng = Math.random,
): SpaceQuestion[] {
  const pool = testPool(level, stages)
  const count = testCount(level, stages)
  const known = knownObjects(level, stages)
  const picked = mixWithReview(pool, skillOf, learn, 'space', language, count, rng, seedId)
  const ordered = notSameOrder(picked, seedId, lastOrder, rng)
  return ordered.map((seed) => buildQuestion(seed, level, language, known, rng))
}

/** The planets of an order lesson, as the child should tap them. */
export function orderSequence(lesson: Lesson): PlanetId[] {
  return lesson.teaches.filter(isPlanet).sort((a, b) => orderOfPlanet(a) - orderOfPlanet(b))
}

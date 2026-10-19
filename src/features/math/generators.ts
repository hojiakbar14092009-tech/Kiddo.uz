import type { AgeLevel } from '@/features/age/ageLevel'
import { makeOptions, pick, shuffle, type Rng } from '@/features/learn/random'

/*
 * Addition examples for each age, and the stages they are taught in.
 * Age 4: sums to 3, then to 5 – shown as groups of objects, two picture answers.
 * Age 5: sums to 5, then to 10 – numbers, three numeric answers.
 * Age 6: addends 1–9, sums 2–18: to 10, making 10, then over 10.
 */

export type StageId =
  '4-sum3' | '4-sum5' | '5-sum5' | '5-sum10' | '6-to10' | '6-make10' | '6-over10'

export interface Stage {
  id: StageId
  level: AgeLevel
  /** Skill name used for review. */
  skill: string
}

export const STAGES: Record<AgeLevel, readonly Stage[]> = {
  4: [
    { id: '4-sum3', level: 4, skill: 'add:sum3' },
    { id: '4-sum5', level: 4, skill: 'add:sum5' },
  ],
  5: [
    { id: '5-sum5', level: 5, skill: 'add:sum5' },
    { id: '5-sum10', level: 5, skill: 'add:sum10' },
  ],
  6: [
    { id: '6-to10', level: 6, skill: 'add:to10' },
    { id: '6-make10', level: 6, skill: 'add:make10' },
    { id: '6-over10', level: 6, skill: 'add:over10' },
  ],
}

export function findStage(id: StageId): Stage {
  for (const stages of Object.values(STAGES)) {
    const found = stages.find((stage) => stage.id === id)
    if (found) return found
  }
  throw new Error(`unknown stage ${id}`)
}

export interface Fact {
  a: number
  b: number
  sum: number
}

const fact = (a: number, b: number): Fact => ({ a, b, sum: a + b })

/** Every example of a stage. */
export function factsFor(stage: StageId): Fact[] {
  const out: Fact[] = []
  for (let a = 1; a <= 9; a += 1) {
    for (let b = 1; b <= 9; b += 1) {
      const sum = a + b
      const keep =
        stage === '4-sum3'
          ? sum <= 3
          : stage === '4-sum5' || stage === '5-sum5'
            ? sum <= 5 && (stage === '5-sum5' || sum >= 3)
            : stage === '5-sum10'
              ? sum >= 6 && sum <= 10
              : stage === '6-to10'
                ? sum <= 9
                : stage === '6-make10'
                  ? sum === 10
                  : sum >= 11 && sum <= 18
      if (keep) out.push(fact(a, b))
    }
  }
  return out
}

/** Objects used in picture examples: one kind per example, easy to count. */
export const OBJECTS = [
  'apple',
  'pear',
  'strawberry',
  'tangerine',
  'ball',
  'cookie',
  'balloon',
  'carrot',
] as const
export type MathObject = (typeof OBJECTS)[number]

export interface MathQuestion extends Fact {
  /** "a+b", unique per example. */
  id: string
  stage: StageId
  skill: string
  /** Answer options (sums), exactly one right, in a random order. */
  options: number[]
  /** The kind of object drawn (age 4 groups, help pictures). */
  object: MathObject
}

/** How many answers a question shows. */
export function optionCount(level: AgeLevel, mode: 'learn' | 'test'): number {
  if (level === 4) return 2
  if (level === 5) return 3
  return mode === 'test' ? 4 : 3
}

/** Wrong answers a child could really give: one off, two off, and for over 10 the ones digit. */
function distractors(f: Fact, level: AgeLevel): number[] {
  const near = [f.sum - 1, f.sum + 1, f.sum - 2, f.sum + 2, f.sum + 3, f.sum - 3]
  const typical = f.sum > 10 ? [f.sum - 10, f.sum + 10] : []
  const max = level === 4 ? 6 : level === 5 ? 11 : 19
  return [...typical, ...near].filter((n) => n >= 1 && n <= max && n !== f.sum)
}

export function makeQuestion(
  f: Fact,
  stage: StageId,
  level: AgeLevel,
  mode: 'learn' | 'test',
  rng: Rng = Math.random,
): MathQuestion {
  const count = optionCount(level, mode)
  const pool = distractors(f, level)
  // for the youngest, the wrong group is a near number so the choice is about counting
  const options = makeOptions(f.sum, level === 4 ? pool.slice(0, 2) : pool, count, rng)
  return {
    ...f,
    id: `${f.a}+${f.b}`,
    stage,
    skill: findStage(stage).skill,
    options,
    object: pick(OBJECTS, rng),
  }
}

/** Why a wrong answer was wrong (for review and the parent area). */
export function errorTypeFor(q: Fact, answer: number): string {
  if (answer === q.sum) return 'none'
  if (Math.abs(answer - q.sum) === 1) return 'off-by-one'
  if (q.sum > 10 && answer === q.sum - 10) return 'forgot-ten'
  if (answer === Math.abs(q.a - q.b)) return 'subtracted'
  return 'added-wrong'
}

/** Test questions only come from stages that were taught. */
export function testPool(level: AgeLevel, taught: readonly string[]): StageId[] {
  return STAGES[level].map((stage) => stage.id).filter((id) => taught.includes(id))
}

/**
 * Builds a question list from the given stages: examples spread over the
 * stages, no example twice, a fresh object each time.
 */
export function buildQuestions(
  stages: readonly StageId[],
  level: AgeLevel,
  mode: 'learn' | 'test',
  count: number,
  rng: Rng = Math.random,
  /** Examples to put first (review); their stage must be in `stages`. */
  prefer: readonly MathQuestion[] = [],
): MathQuestion[] {
  const seen = new Set<string>()
  const out: MathQuestion[] = []
  for (const q of prefer) {
    if (out.length >= count) break
    if (!stages.includes(q.stage) || seen.has(q.id)) continue
    seen.add(q.id)
    out.push(makeQuestion(q, q.stage, level, mode, rng))
  }
  const fill = (round: number) => {
    const pools = stages.map((stage) => shuffle(factsFor(stage), rng).map((f) => ({ f, stage })))
    let turn = 0
    while (out.length < count && pools.some((pool) => pool.length > 0)) {
      const pool = pools[turn % pools.length]!
      turn += 1
      const next = pool.shift()
      if (!next) continue
      // a small stage (1+1, 1+2, 2+1) comes round again, with another object
      const id = round === 0 ? `${next.f.a}+${next.f.b}` : `${next.f.a}+${next.f.b}#${round + 1}`
      if (seen.has(id)) continue
      seen.add(id)
      out.push({ ...makeQuestion(next.f, next.stage, level, mode, rng), id })
    }
  }
  for (let round = 0; out.length < count && round < 4; round += 1) fill(round)
  return varyObjects(out)
}

/** Never the same object in two questions in a row. */
export function varyObjects(questions: readonly MathQuestion[]): MathQuestion[] {
  const out = [...questions]
  for (let i = 1; i < out.length; i += 1) {
    if (out[i]!.object === out[i - 1]!.object) {
      const next = OBJECTS[(OBJECTS.indexOf(out[i]!.object) + 1) % OBJECTS.length]!
      out[i] = { ...out[i]!, object: next }
    }
  }
  return out
}

/** Questions in a learning run: two done together, then the rest on one's own. */
export const LEARN_COUNT: Record<AgeLevel, number> = { 4: 4, 5: 5, 6: 5 }
export const GUIDED_COUNT = 2

/** The example id without a repeat mark ("2+1#2" → "2+1"). */
export const factId = (id: string) => id.split('#')[0]!

/** Every question a stage can produce (used for review mixing). */
export function allQuestions(stage: StageId, level: AgeLevel, rng: Rng = Math.random) {
  return factsFor(stage).map((f) => makeQuestion(f, stage, level, 'learn', rng))
}

/** The worked example shown first in each stage. */
export const DEMO: Record<StageId, Fact> = {
  '4-sum3': fact(1, 1),
  '4-sum5': fact(2, 2),
  '5-sum5': fact(2, 1),
  '5-sum10': fact(4, 3),
  '6-to10': fact(4, 3),
  '6-make10': fact(4, 6),
  '6-over10': fact(8, 5),
}

/** Making 10 first: 8 + 5 → 8 + 2 = 10, 3 left, 13. */
export function bridge(f: Fact): { toTen: number; rest: number } {
  const big = Math.max(f.a, f.b)
  const toTen = 10 - big
  return { toTen, rest: f.sum - 10 }
}

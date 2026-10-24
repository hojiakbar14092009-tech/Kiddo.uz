import { beforeEach, describe, expect, it } from 'vitest'
import { getChallengeLevel, type ChallengeLevel } from '@/domain/learner'
import { setAgeResolver } from '@/domain/learner/profile'
import { clearUniverseChild, emitActivity } from '@/domain/universe'
import { newSheet, recordAnswer } from '@/features/learn/session'
import { seeded } from '@/features/learn/random'
import {
  errorOf,
  isRight,
  levelMax,
  lineWindow,
  numberOptions,
  planSession,
  sessionLength,
  type LabQuestion,
  type Token,
} from './generators'
import { labActivity, labActivityName, labSummary, mistakeSkills } from './result'

const LEVELS: ChallengeLevel[] = [1, 2, 3, 4, 5]
const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1)

/** Computes the hidden number of a written example from its tokens (an independent check). */
function solveEquation(tokens: Token[]): number {
  const eq = tokens.indexOf('=')
  const left = tokens.slice(0, eq)
  const right = tokens.slice(eq + 1)
  const evaluate = (side: Token[], x: number) => {
    let value = side[0] === '?' ? x : (side[0] as number)
    for (let i = 1; i < side.length; i += 2) {
      const n = side[i + 1] === '?' ? x : (side[i + 1] as number)
      value = side[i] === '+' ? value + n : value - n
    }
    return value
  }
  const answers = []
  for (let x = 0; x <= 40; x += 1) if (evaluate(left, x) === evaluate(right, x)) answers.push(x)
  expect(answers).toHaveLength(1)
  return answers[0]!
}

/** Every intermediate value of an example with its hidden number filled in. */
function steps(tokens: Token[], answer: number): number[] {
  const filled = tokens.map((t) => (t === '?' ? answer : t))
  const eq = filled.indexOf('=')
  const out: number[] = []
  for (const side of [filled.slice(0, eq), filled.slice(eq + 1)]) {
    let value = side[0] as number
    out.push(value)
    for (let i = 1; i < side.length; i += 2) {
      value = side[i] === '+' ? value + (side[i + 1] as number) : value - (side[i + 1] as number)
      out.push(value)
    }
  }
  return out
}

/** The right answer worked out again from what the child sees (not from `q.answer`). */
function expected(q: LabQuestion): string {
  const s = q.scene
  switch (s.type) {
    case 'basket':
      return String(s.target)
    case 'group':
      return String(s.count + (s.change ?? 0))
    case 'objects':
      return String(s.op === '+' ? s.a + s.b : s.a - s.b)
    case 'equation':
      return String(solveEquation(s.tokens))
    case 'compare':
      return s.a < s.b ? '<' : s.a > s.b ? '>' : '='
    case 'sequence': {
      const i = s.cells.indexOf('?')
      const prev = s.cells[i - 1]
      const next = s.cells[i + 1]
      return String(typeof prev === 'number' ? prev + 1 : (next as number) - 1)
    }
    case 'none':
      return String(Math.max(...q.options.map((o) => o.value as number)))
    case 'word': {
      const { a, b } = q.prompt.params as { a: number; b: number }
      return String(q.prompt.key === 'wordAdd' ? a + b : a - b)
    }
  }
}

function numbersOf(q: LabQuestion): number[] {
  const s = q.scene
  const out: number[] = []
  if (s.type === 'equation') out.push(...steps(s.tokens, Number(q.answer)))
  if (s.type === 'objects') out.push(s.a, s.b, Number(q.answer))
  if (s.type === 'group') out.push(s.count, Number(q.answer))
  if (s.type === 'compare') out.push(s.a, s.b)
  if (s.type === 'sequence') out.push(...s.cells.filter((c): c is number => typeof c === 'number'))
  if (s.type === 'basket') out.push(s.target, s.available)
  if (s.type === 'word') out.push(s.a, Number(q.answer))
  for (const o of q.options) if (typeof o.value === 'number') out.push(o.value)
  return out
}

describe('Math Lab generators', () => {
  for (const level of LEVELS) {
    it(`level ${level}: one right option, no negatives, numbers in range, no repeats`, () => {
      for (const seed of SEEDS) {
        const questions = planSession(level, seeded(seed))
        expect(questions).toHaveLength(sessionLength(level))
        expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length)
        for (const q of questions) {
          expect(q.level).toBe(level)
          expect(q.answer).toBe(expected(q))
          if (q.kind === 'drag') {
            expect(q.options).toEqual([])
          } else {
            const right = q.options.filter((o) => isRight(q, o.id))
            expect(right).toHaveLength(1)
            expect(new Set(q.options.map((o) => o.id)).size).toBe(q.options.length)
            expect(q.options.length).toBeGreaterThanOrEqual(2)
          }
          // no negative number anywhere: in the example, its steps or the options
          for (const n of numbersOf(q)) expect(n).toBeGreaterThanOrEqual(0)
          // the example itself stays within the level, and so do the wrong options
          for (const o of q.options) {
            if (typeof o.value === 'number') expect(o.value).toBeLessThanOrEqual(levelMax(level))
          }
          const answer = Number(q.answer)
          if (!Number.isNaN(answer)) expect(answer).toBeLessThanOrEqual(levelMax(level))
          if (q.scene.type === 'equation') {
            for (const n of steps(q.scene.tokens, answer)) {
              expect(n).toBeLessThanOrEqual(levelMax(level))
            }
          }
          if (q.scene.type === 'basket') expect(q.scene.available).toBeGreaterThan(q.scene.target)
        }
      }
    })
  }

  it('uses the kinds each level promises', () => {
    const kinds = (level: ChallengeLevel) =>
      new Set(SEEDS.flatMap((seed) => planSession(level, seeded(seed)).map((q) => q.kind)))
    expect([...kinds(1)].sort()).toEqual(['compare-groups', 'count', 'drag', 'one-more'])
    expect([...kinds(2)].sort()).toEqual(['add', 'drag', 'one-less', 'sub'])
    expect([...kinds(3)].sort()).toEqual(['add', 'compare', 'missing', 'sub'])
    expect([...kinds(4)].sort()).toEqual(['add', 'after', 'before', 'between', 'missing', 'sub'])
    expect([...kinds(5)].sort()).toEqual(['add', 'missing', 'sub', 'two-step', 'word'])
  })

  it('level 1 counts to 5, level 2 stays within 10 with objects, level 4 crosses 10', () => {
    for (const seed of SEEDS) {
      for (const q of planSession(1, seeded(seed))) {
        if (q.scene.type === 'group')
          expect(q.scene.count + (q.scene.change ?? 0)).toBeLessThanOrEqual(5)
        if (q.scene.type === 'basket') expect(q.scene.target).toBeLessThanOrEqual(5)
      }
      for (const q of planSession(2, seeded(seed))) {
        if (q.scene.type === 'objects')
          expect(Math.max(q.scene.a, Number(q.answer))).toBeLessThanOrEqual(10)
      }
      const four = planSession(4, seeded(seed)).find((q) => q.kind === 'add')!
      expect(Number(four.answer)).toBeGreaterThan(10)
    }
  })

  it('levels 1–2 start with the basket task', () => {
    for (const seed of SEEDS) {
      expect(planSession(1, seeded(seed))[0]!.kind).toBe('drag')
      expect(planSession(2, seeded(seed))[0]!.kind).toBe('drag')
    }
  })

  it('offers real mistakes as distractors: one off and the other operation', () => {
    const add = planSession(3, seeded(7)).find((q) => q.kind === 'add')!
    expect(add.scene.type).toBe('equation')
    const errors = Object.values(add.errors)
    expect(errors).toContain('off-by-one')
    expect(errors.some((e) => e === 'wrong-operation' || e === 'kept-number')).toBe(true)
    const two = planSession(5, seeded(3)).find((q) => q.kind === 'two-step')!
    expect(Object.values(two.errors)).toContain('stopped-after-first-step')
  })

  it('keeps every distractor inside its level: no 15 at level 2, missing numbers within the level', () => {
    for (const seed of SEEDS) {
      for (const q of planSession(2, seeded(seed))) {
        if (q.kind === 'sub' || q.kind === 'add') {
          for (const o of q.options) expect(o.value as number).toBeLessThanOrEqual(10)
        }
      }
      for (const level of [3, 4, 5] as const) {
        for (const q of planSession(level, seeded(seed)).filter((x) => x.kind === 'missing')) {
          for (const o of q.options) expect(o.value as number).toBeLessThanOrEqual(levelMax(level))
        }
      }
    }
    // the biggest level-2 subtraction (10 − 5): a + b = 15 is no longer offered
    for (const seed of SEEDS) {
      const sub = planSession(2, seeded(seed)).find((q) => q.kind === 'sub')
      if (sub?.scene.type === 'objects' && sub.scene.a + sub.scene.b > 10) {
        expect(sub.options.map((o) => o.value)).not.toContain(sub.scene.a + sub.scene.b)
      }
    }
  })

  it('works with a constant random source (no endless retries)', () => {
    for (const level of LEVELS) {
      const questions = planSession(level, () => 0)
      expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length)
    }
  })

  it('numberOptions pads with neighbours and never goes below 0', () => {
    const { options } = numberOptions(0, [{ value: -1, error: 'x' }], 4, 10, seeded(1))
    expect(options.map((o) => o.value).sort()).toEqual([0, 1, 2, 3])
  })

  it('names the error of a wrong answer', () => {
    const drag = planSession(1, seeded(2))[0]!
    expect(errorOf(drag, String(Number(drag.answer) + 1))).toBe('too-many')
    expect(errorOf(drag, drag.answer)).toBeNull()
  })

  it('keeps the number line window inside 0–20 and at least 6 long', () => {
    expect(lineWindow([0, 1])).toEqual({ from: 0, to: 5 })
    expect(lineWindow([19, 20])).toEqual({ from: 15, to: 20 })
    expect(lineWindow([4, 12])).toEqual({ from: 3, to: 13 })
  })
})

describe('Math Lab result', () => {
  it('lists the skills whose first answer was wrong, once each', () => {
    let sheet = newSheet('test')
    sheet = recordAnswer(sheet, { id: 'q1', skill: 'sub:within10' }, '3', false, 'off-by-one')
    sheet = recordAnswer(sheet, { id: 'q1', skill: 'sub:within10' }, '4', true)
    sheet = recordAnswer(sheet, { id: 'q2', skill: 'missing:add' }, '5', false)
    sheet = recordAnswer(sheet, { id: 'q3', skill: 'sub:within10' }, '1', false)
    sheet = recordAnswer(sheet, { id: 'q4', skill: 'add:within10' }, '7', true)
    expect(mistakeSkills(sheet)).toEqual(['sub:within10', 'missing:add'])

    const summary = labSummary(sheet, 6, 3)
    expect(summary).toMatchObject({ total: 6, independent: 1, wrong: 3, level: 3 })
    expect(labActivity('run-1', 'kid', summary)).toEqual({
      id: 'run-1',
      childKey: 'kid',
      activity: 'math-lab:within10:L3',
      strand: 'number',
      correct: 3,
      total: 6,
      independent: 1,
      // the level the session was played at: only a run at the current level moves the profile
      level: 3,
    })
    expect(labActivityName(1)).toBe('math-lab:count:L1')
  })
})

describe('Math Lab adaptation', () => {
  beforeEach(() => {
    clearUniverseChild('lab-kid')
    setAgeResolver((key) => (key === 'lab-kid' ? 4 : null))
  })

  it('two strong sessions move the next session up a level; two weak ones down, quietly', () => {
    const run = (id: string, level: ChallengeLevel, independent: number) => {
      const total = sessionLength(level)
      let sheet = newSheet('test')
      for (let i = 0; i < total; i += 1) {
        sheet = recordAnswer(sheet, { id: `q${i}`, skill: 's' }, 'x', i < independent)
      }
      emitActivity(labActivity(id, 'lab-kid', labSummary(sheet, total, level)))
    }
    expect(getChallengeLevel('lab-kid', 'number', 4)).toBe(1)
    run('a', 1, 5)
    expect(getChallengeLevel('lab-kid', 'number', 4)).toBe(1)
    run('b', 1, 5)
    const next = getChallengeLevel('lab-kid', 'number', 4)
    expect(next).toBe(2)
    expect(planSession(next, seeded(1))[0]!.level).toBe(2)
    run('c', 2, 1)
    run('d', 2, 0)
    expect(getChallengeLevel('lab-kid', 'number', 4)).toBe(1)
  })

  it('a session played at an old level (e.g. in another tab) does not move the level', () => {
    const strong = (id: string, level: ChallengeLevel) => {
      const total = sessionLength(level)
      let sheet = newSheet('test')
      for (let i = 0; i < total; i += 1) {
        sheet = recordAnswer(sheet, { id: `q${i}`, skill: 's' }, 'x', true)
      }
      const event = labActivity(id, 'lab-kid', labSummary(sheet, total, level))
      expect(event.level).toBe(level)
      emitActivity(event)
    }
    strong('a', 1)
    strong('b', 1)
    expect(getChallengeLevel('lab-kid', 'number', 4)).toBe(2)
    // two more strong runs, but still at level 1: they bring stars, not a new level
    strong('c', 1)
    strong('d', 1)
    expect(getChallengeLevel('lab-kid', 'number', 4)).toBe(2)
  })
})

describe('the adaptive plan shapes a session', () => {
  it('asks for fewer answer cards when the plan says so, at every level', () => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      for (const seed of SEEDS.slice(0, 10)) {
        for (const q of planSession(level, seeded(seed), null, { options: 2 })) {
          if (q.kind === 'drag' || q.kind === 'compare-groups' || q.kind === 'compare') continue
          expect(q.options.length, `${level} ${q.id}`).toBe(2)
          expect(q.options.some((o) => String(o.value) === q.answer || o.id === q.answer)).toBe(
            true,
          )
        }
      }
    }
  })

  it('takes up to two due reviews (retrieval practice), never two in a row', () => {
    const questions = planSession(4, seeded(3), [
      { skill: 'sub:within10', level: 3, avoid: [] },
      { skill: 'missing:add', level: 3, avoid: [] },
      { skill: 'add:within10', level: 3, avoid: [] },
    ])
    const at = questions.flatMap((q, i) => (q.review ? [i] : []))
    expect(at.length).toBe(2)
    expect(at[1]! - at[0]!).toBeGreaterThan(1)
    expect(questions).toHaveLength(6)
  })
})

describe('practice chosen in the Mistake Garden', () => {
  it('a chosen skill is practised at its own level, even above today’s, in both review places', () => {
    let state = 3
    const rng = () => {
      state = (state * 9301 + 49297) % 233280
      return state / 233280
    }
    const chosen = { skill: 'missing:add', level: 3 as const, avoid: [], chosen: true }
    const session = planSession(2, rng, [chosen, chosen])
    const chosenItems = session.filter((q) => q.skill === 'missing:add')
    expect(chosenItems).toHaveLength(2)
    expect(new Set(chosenItems.map((q) => q.id)).size).toBe(2)
    // only the first counts as a review (the schedule moves on once per session)
    expect(chosenItems.map((q) => Boolean(q.review))).toEqual([true, false])
    // without the choice a review above today's level is never played
    expect(planSession(2, rng, [{ ...chosen, chosen: false }]).some((q) => q.review)).toBe(false)
  })
})

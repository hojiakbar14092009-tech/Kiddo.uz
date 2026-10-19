import { describe, expect, it } from 'vitest'
import type { AgeLevel } from '@/features/age/ageLevel'
import type { LearnChild } from '@/features/learn/learnStore'
import { seeded } from '@/features/learn/random'
import { COPY, helpText, numberQuestion, pictureQuestion } from './content'
import {
  bridge,
  buildQuestions,
  errorTypeFor,
  factsFor,
  findStage,
  makeQuestion,
  OBJECTS,
  STAGES,
  type StageId,
} from './generators'
import { planLearn, planTest, TEST_ORDER_KEY } from './plan'
import { SPOKEN } from './spoken'

const EMPTY: LearnChild = {
  skills: {},
  attempts: [],
  sessions: [],
  rewarded: [],
  stages: {},
  lastOrder: {},
}

const LANGS = ['uz', 'ru', 'en'] as const

function checkQuestion(q: ReturnType<typeof makeQuestion>, count: number) {
  expect(q.sum).toBe(q.a + q.b)
  expect(q.options).toHaveLength(count)
  expect(new Set(q.options).size).toBe(count)
  expect(q.options.filter((o) => o === q.sum)).toHaveLength(1)
  expect(q.options.every((o) => o >= 1)).toBe(true)
}

describe('age 4: pictures, addition only', () => {
  it('teaches sums up to 3 first, then up to 5', () => {
    const [first, second] = STAGES[4].map((s) => s.id)
    expect(factsFor(first!).every((f) => f.sum <= 3)).toBe(true)
    expect(factsFor(second!).every((f) => f.sum <= 5)).toBe(true)
    expect(factsFor(second!).some((f) => f.sum === 5)).toBe(true)
    const ids = [...factsFor(first!), ...factsFor(second!)].map((f) => `${f.a}+${f.b}`)
    for (const example of ['1+1', '1+2', '2+1', '2+2', '3+1']) expect(ids).toContain(example)
  })

  it('shows two picture answers with exactly one right group', () => {
    for (let seed = 1; seed < 60; seed += 1) {
      for (const stage of ['4-sum3', '4-sum5'] as const) {
        for (const f of factsFor(stage)) {
          const q = makeQuestion(f, stage, 4, 'test', seeded(seed))
          checkQuestion(q, 2)
          expect(Math.abs(q.options[0]! - q.options[1]!)).toBe(1)
          expect(OBJECTS).toContain(q.object)
          // both addends are positive (addition only, one object kind)
          expect(q.a).toBeGreaterThan(0)
          expect(q.b).toBeGreaterThan(0)
        }
      }
    }
  })

  it('says the picture question with the right number of objects', () => {
    expect(pictureQuestion('uz', 'apple', { a: 1, b: 1, sum: 2 })).toBe(
      'Bitta olmaga yana bitta olma qo‘shdik. Endi nechta olma bor?',
    )
    expect(pictureQuestion('ru', 'apple', { a: 2, b: 1, sum: 3 })).toBe(
      'Вот два яблока и ещё одно яблоко. Сколько теперь яблок?',
    )
    expect(pictureQuestion('en', 'pear', { a: 1, b: 2, sum: 3 })).toBe(
      'One pear and two more pears. How many pears are there now?',
    )
  })
})

describe('age 5: numbers', () => {
  it('sums up to 5, then up to 10', () => {
    const [first, second] = STAGES[5].map((s) => s.id)
    expect(factsFor(first!).every((f) => f.sum <= 5)).toBe(true)
    expect(factsFor(second!).every((f) => f.sum > 5 && f.sum <= 10)).toBe(true)
  })

  it('has three different numeric answers', () => {
    for (let seed = 1; seed < 40; seed += 1) {
      for (const stage of ['5-sum5', '5-sum10'] as const) {
        for (const f of factsFor(stage))
          checkQuestion(makeQuestion(f, stage, 5, 'test', seeded(seed)), 3)
      }
    }
  })
})

describe('age 6: up to 18', () => {
  const all = (['6-to10', '6-make10', '6-over10'] as const).flatMap((s) => factsFor(s))

  it('uses addends 1–9 and results 2–18', () => {
    expect(all.every((f) => f.a >= 1 && f.a <= 9 && f.b >= 1 && f.b <= 9)).toBe(true)
    const sums = new Set(all.map((f) => f.sum))
    for (let n = 2; n <= 18; n += 1) expect(sums).toContain(n)
    expect(factsFor('6-make10').every((f) => f.sum === 10)).toBe(true)
    expect(factsFor('6-over10').every((f) => f.sum > 10)).toBe(true)
  })

  it('has 3 answers while learning and 4 in a check, one right, in changing places', () => {
    const places = new Set<number>()
    for (let seed = 1; seed < 30; seed += 1) {
      for (const stage of ['6-to10', '6-make10', '6-over10'] as const) {
        for (const f of factsFor(stage)) {
          checkQuestion(makeQuestion(f, stage, 6, 'learn', seeded(seed)), 3)
          const q = makeQuestion(f, stage, 6, 'test', seeded(seed))
          checkQuestion(q, 4)
          places.add(q.options.indexOf(q.sum))
        }
      }
    }
    expect(places.size).toBe(4)
  })

  it('explains passing 10 by making 10 first', () => {
    expect(bridge({ a: 8, b: 5, sum: 13 })).toEqual({ toTen: 2, rest: 3 })
    expect(helpText('uz', '6-over10', { a: 8, b: 5, sum: 13 })).toBe(
      '8 ga 2 qo‘shsak, 10 bo‘ladi. Yana 3 qoldi. Demak, 13.',
    )
    expect(helpText('uz', '6-over10', { a: 5, b: 8, sum: 13 })).toBe(
      '8 ga 2 qo‘shsak, 10 bo‘ladi. Yana 3 qoldi. Demak, 13.',
    )
  })

  it('never asks over 10 in a check before "over 10" was taught', () => {
    for (let seed = 1; seed < 40; seed += 1) {
      const early = planTest(6, ['6-to10', '6-make10'], EMPTY, seeded(seed))
      expect(early).toHaveLength(5)
      expect(early.every((q) => q.sum <= 10)).toBe(true)
      const onlyFirst = planTest(6, ['6-to10'], EMPTY, seeded(seed))
      expect(onlyFirst.every((q) => q.sum <= 9)).toBe(true)
    }
    const later = Array.from({ length: 30 }, (_, seed) =>
      planTest(6, ['6-to10', '6-make10', '6-over10'], EMPTY, seeded(seed)),
    ).flat()
    expect(later.some((q) => q.sum > 10)).toBe(true)
  })
})

describe('checks and learning runs', () => {
  it('have 3, 4 and 5 questions for ages 4, 5 and 6', () => {
    const lengths = ([4, 5, 6] as AgeLevel[]).map(
      (level) => planTest(level, [STAGES[level][0]!.id], EMPTY, seeded(2)).length,
    )
    expect(lengths).toEqual([3, 4, 5])
  })

  it('use only taught stages, at the practised level, with unique questions', () => {
    for (let seed = 1; seed < 30; seed += 1) {
      const q4 = planTest(4, ['4-sum3'], EMPTY, seeded(seed))
      expect(q4.every((q) => q.sum <= 3 && q.options.length === 2)).toBe(true)
      const q5 = planTest(5, ['5-sum5'], EMPTY, seeded(seed))
      expect(q5.every((q) => q.sum <= 5 && q.options.length === 3)).toBe(true)
      for (const list of [q4, q5]) expect(new Set(list.map((q) => q.id)).size).toBe(list.length)
    }
    expect(planTest(5, [], EMPTY)).toEqual([])
  })

  it('never repeat the last order', () => {
    const first = planTest(5, ['5-sum5', '5-sum10'], EMPTY, seeded(4))
    const order = first.map((q) => q.id).join(',')
    for (let seed = 1; seed < 20; seed += 1) {
      const again = planTest(
        5,
        ['5-sum5', '5-sum10'],
        { ...EMPTY, lastOrder: { [TEST_ORDER_KEY]: order } },
        seeded(4),
      )
      expect(again.map((q) => q.id).join(',')).not.toBe(order)
    }
  })

  it('bring a weak skill back for review', () => {
    const weak: LearnChild = {
      ...EMPTY,
      skills: {
        'math|any|add:make10': {
          section: 'math',
          language: 'any',
          skill: 'add:make10',
          attempts: 1,
          independent: 0,
          wrong: 1,
          helped: 0,
          streak: 0,
          lastCorrect: false,
          lastErrorType: 'off-by-one',
          lastPracticed: '2026-10-01',
        },
      },
    }
    for (let seed = 1; seed < 20; seed += 1) {
      const list = planTest(6, ['6-to10', '6-make10'], weak, seeded(seed))
      expect(list.some((q) => q.skill === 'add:make10')).toBe(true)
    }
  })

  it('learn runs stay in their stage and do not repeat objects back to back', () => {
    for (const level of [4, 5, 6] as AgeLevel[]) {
      for (const stage of STAGES[level]) {
        const list = planLearn(stage.id, level, EMPTY, seeded(7))
        expect(list.length).toBeGreaterThanOrEqual(4)
        expect(new Set(list.map((q) => q.id)).size).toBe(list.length)
        expect(list.every((q) => q.stage === stage.id)).toBe(true)
        for (let i = 1; i < list.length; i += 1)
          expect(list[i]!.object).not.toBe(list[i - 1]!.object)
      }
    }
  })

  it('names the mistake', () => {
    const f = { a: 8, b: 5, sum: 13 }
    expect(errorTypeFor(f, 12)).toBe('off-by-one')
    expect(errorTypeFor(f, 3)).toBe('forgot-ten')
    expect(errorTypeFor(f, 16)).toBe('added-wrong')
    expect(errorTypeFor({ a: 5, b: 2, sum: 7 }, 3)).toBe('subtracted')
  })

  it('builds enough questions even from a tiny stage', () => {
    const list = buildQuestions(['4-sum3'], 4, 'learn', 4, seeded(1))
    expect(list).toHaveLength(4)
    expect(findStage('4-sum3').skill).toBe('add:sum3')
  })
})

describe('voice list', () => {
  it('holds every sentence the screen can read, in each language', () => {
    for (const language of LANGS) {
      const spoken = new Set(SPOKEN[language])
      const copy = COPY[language]
      for (const line of [copy.chooseStage, copy.correct, copy.retry, copy.stageDoneText]) {
        expect(spoken).toContain(line)
      }
      for (const level of [4, 5, 6] as AgeLevel[]) {
        for (const { id } of STAGES[level]) {
          expect(spoken).toContain(copy.explain[id as StageId])
          for (const f of factsFor(id)) {
            expect(spoken).toContain(helpText(language, id, f))
            if (level === 4)
              for (const o of OBJECTS) expect(spoken).toContain(pictureQuestion(language, o, f))
            else expect(spoken).toContain(numberQuestion(language, f))
          }
        }
      }
      // no unfilled templates
      expect(SPOKEN[language].some((line) => /[{}]|undefined|NaN/.test(line))).toBe(false)
    }
  })
})

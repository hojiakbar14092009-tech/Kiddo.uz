import { beforeEach, describe, expect, it } from 'vitest'
import { EMPTY_PROGRESS, useProgressStore } from '@/store/progressStore'
import { getLearnChild, useLearnStore, weakSkills } from './learnStore'
import { makeOptions, seeded } from './random'
import { mixWithReview, notSameOrder, orderOf } from './review'
import { markHelp, newSheet, recordAnswer, summarize, testLength } from './session'

const q = (id: string, skill = id) => ({ id, skill })

describe('answer sheet', () => {
  it('keeps the first answer when the child corrects it', () => {
    let sheet = newSheet('test')
    sheet = recordAnswer(sheet, q('a'), '3', false, 'counted-one-less')
    sheet = recordAnswer(sheet, q('a'), '4', true)
    expect(sheet.answers.a).toMatchObject({
      first: '3',
      firstCorrect: false,
      final: '4',
      finalCorrect: true,
      errorType: 'counted-one-less',
    })
  })

  it('counts an answer after help as helped, never as independent', () => {
    let sheet = newSheet('test')
    sheet = markHelp(sheet, 'a')
    sheet = recordAnswer(sheet, q('a'), '2', true)
    sheet = recordAnswer(sheet, q('b'), '5', true)
    sheet = recordAnswer(sheet, q('c'), '1', false)
    // help after the first answer does not change it
    sheet = markHelp(sheet, 'c')
    const summary = summarize(sheet, 3)
    expect(summary).toMatchObject({ total: 3, independent: 1, helped: 1, wrong: 1 })
    expect(summary.weakSkills.sort()).toEqual(['a', 'c'])
    expect(summary.strongSkills).toEqual(['b'])
  })

  it('has 3, 4 and 5 questions for ages 4, 5 and 6', () => {
    expect([testLength(4), testLength(5), testLength(6)]).toEqual([3, 4, 5])
  })
})

describe('answer options', () => {
  it('always has exactly one right answer, no repeats, in changing places', () => {
    const places = new Set<number>()
    for (let seed = 1; seed < 40; seed += 1) {
      const options = makeOptions(7, [6, 8, 6, 9, 7, 5], 3, seeded(seed))
      expect(new Set(options).size).toBe(3)
      expect(options.filter((o) => o === 7)).toHaveLength(1)
      places.add(options.indexOf(7))
    }
    expect(places.size).toBe(3)
  })

  it('refuses to build a question without enough different answers', () => {
    expect(() => makeOptions(1, [1, 1], 3)).toThrow()
  })
})

describe('learning record', () => {
  beforeEach(() => {
    useLearnStore.setState({ byChild: {} })
    useProgressStore.setState({ byChild: { kid: { ...EMPTY_PROGRESS, coins: 0 } } })
  })

  it('pays a session once, even if it is finished again (reload)', () => {
    const store = useLearnStore.getState()
    const session = {
      id: 's1',
      section: 'math' as const,
      stage: '4',
      language: 'any' as const,
      mode: 'test' as const,
      ...summarize(recordAnswer(newSheet('test'), q('x'), '2', true), 3),
    }
    expect(store.finishSession('kid', session)).toBe(2)
    expect(store.finishSession('kid', session)).toBe(0)
    expect(useProgressStore.getState().byChild.kid?.coins).toBe(2)
    expect(getLearnChild('kid').sessions).toHaveLength(1)
  })

  it('keeps each child apart and brings weak skills back for review', () => {
    const store = useLearnStore.getState()
    const base = {
      section: 'math' as const,
      language: 'any' as const,
      mode: 'learn' as const,
      first: '2',
      final: '3',
      finalCorrect: true,
      helped: false,
    }
    store.recordAttempt('kid', {
      ...base,
      questionId: 'q1',
      skill: 'sum-3',
      firstCorrect: false,
      errorType: 'x',
    })
    store.recordAttempt('kid', {
      ...base,
      questionId: 'q2',
      skill: 'sum-5',
      firstCorrect: true,
      errorType: null,
    })
    store.recordAttempt('other', {
      ...base,
      questionId: 'q3',
      skill: 'sum-5',
      firstCorrect: false,
      errorType: 'y',
    })

    expect(weakSkills(getLearnChild('kid'), 'math', 'any').map((s) => s.skill)).toEqual(['sum-3'])
    expect(weakSkills(getLearnChild('other'), 'math', 'any').map((s) => s.skill)).toEqual(['sum-5'])

    const pool = ['sum-3:a', 'sum-3:b', 'sum-5:a', 'sum-9:a', 'sum-9:b', 'sum-7:a']
    const picked = mixWithReview(
      pool,
      (item) => item.split(':')[0]!,
      getLearnChild('kid'),
      'math',
      'any',
      4,
      seeded(3),
      (item) => item,
    )
    expect(picked).toHaveLength(4)
    expect(picked.some((item) => item.startsWith('sum-3'))).toBe(true)
    expect(new Set(picked).size).toBe(4)
  })

  it('does not repeat the same order twice in a row', () => {
    const items = ['a', 'b', 'c', 'd']
    const next = notSameOrder(
      items,
      (i) => i,
      orderOf(items, (i) => i),
      seeded(5),
    )
    expect(orderOf(next, (i) => i)).not.toBe('a,b,c,d')
  })
})

describe('home review card', () => {
  it('points to the section with the most to practise, in the current language', async () => {
    const { reviewSection } = await import('./LearnHome')
    useLearnStore.setState({ byChild: {} })
    const store = useLearnStore.getState()
    const base = { mode: 'learn' as const, first: 'x', final: 'y', finalCorrect: true }
    expect(reviewSection(getLearnChild('kid'), 'uz')).toBeNull()
    store.recordAttempt('kid', {
      ...base,
      section: 'words',
      language: 'ru',
      questionId: 'w1',
      skill: 'initial:m',
      firstCorrect: false,
      helped: false,
      errorType: 'wrong-initial',
    })
    // a Russian mistake does not ask for review in Uzbek
    expect(reviewSection(getLearnChild('kid'), 'uz')).toBeNull()
    store.recordAttempt('kid', {
      ...base,
      section: 'math',
      language: 'any',
      questionId: 'm1',
      skill: 'add:make10',
      firstCorrect: false,
      helped: true,
      errorType: 'off-by-one',
    })
    expect(reviewSection(getLearnChild('kid'), 'uz')).toBe('math')
    expect(reviewSection(getLearnChild('kid'), 'ru')).toBe('math')
  })
})

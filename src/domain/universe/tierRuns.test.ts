import { beforeEach, describe, expect, it } from 'vitest'
import { placedState } from '@/domain/learner/placement'
import { birthDateForAge } from '@/features/age/ageLevel'
import { tashkentDay } from '@/lib/dates'
import { useFamilyStore } from '@/store/familyStore'
import { useProgressStore } from '@/store/progressStore'
import {
  atCurrentLevel,
  EMPTY_UNIVERSE_CHILD,
  emitActivity,
  placeStrand,
  useUniverseStore,
} from './store'
import type { ActivityCompleted } from './types'

/*
 * Phase 22: runs of screens whose items follow the content tier move a
 * strand only within the tier's levels (1–3), never mastery; a placement is
 * written once, for one child only.
 */

beforeEach(() => {
  useUniverseStore.setState({ byChild: {} })
  useFamilyStore.setState({
    children: [
      {
        id: 'a',
        name: 'A',
        birthDate: '2014-01-01',
        celebratedLevel: 6,
        gender: 'girl',
        mascot: 'girl',
        dailyLimitMinutes: 60,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'b',
        name: 'B',
        birthDate: '2014-01-01',
        celebratedLevel: 6,
        gender: 'boy',
        mascot: 'boy',
        dailyLimitMinutes: 60,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    activeChildId: 'a',
  })
})

let n = 0
function strongRun(childKey: string): ActivityCompleted {
  n += 1
  return {
    id: `learn-${n}`,
    childKey,
    activity: 'math:6',
    strand: 'number',
    correct: 10,
    total: 10,
    independent: 10,
  }
}

function setNumber(childKey: string, level: 1 | 2 | 3 | 4 | 5, mastery = 0) {
  useUniverseStore.setState((state) => ({
    byChild: {
      ...state.byChild,
      [childKey]: {
        ...EMPTY_UNIVERSE_CHILD,
        strands: { number: { level, mastery, streak: 0, runs: 10, independent: 80, total: 100 } },
      },
    },
  }))
}

const number = (childKey: string) => useUniverseStore.getState().byChild[childKey]?.strands?.number

describe('progression evidence (EVIDENCE_POLICY)', () => {
  it('A: at level 5, easy practice counts but never touches the level or mastery', () => {
    setNumber('a', 5, 4)
    for (let i = 0; i < 6; i += 1) emitActivity(atCurrentLevel(strongRun('a'), 'practice'))
    expect(number('a')).toMatchObject({ level: 5, mastery: 4, runs: 10 })
  })

  it('B: at level 3, two (and more) strong easy sessions do not promote', () => {
    setNumber('a', 3)
    emitActivity(atCurrentLevel(strongRun('a'), 'practice'))
    expect(number('a')?.level).toBe(3)
    emitActivity(atCurrentLevel(strongRun('a'), 'practice'))
    expect(number('a')?.level).toBe(3)
    for (let i = 0; i < 4; i += 1) emitActivity(atCurrentLevel(strongRun('a'), 'practice'))
    expect(number('a')).toMatchObject({ level: 3, mastery: 0 })
  })

  it('B2: below level 3, strong practice still raises the level (its items are that level)', () => {
    setNumber('a', 2)
    emitActivity(atCurrentLevel(strongRun('a'), 'practice'))
    emitActivity(atCurrentLevel(strongRun('a'), 'practice'))
    expect(number('a')?.level).toBe(3)
  })

  it('C: at level 3, assessment at the level (Math Lab) still promotes', () => {
    setNumber('a', 3)
    emitActivity({ ...strongRun('a'), level: 3 })
    emitActivity({ ...strongRun('a'), level: 3 })
    expect(number('a')?.level).toBe(4)
  })

  it('C1: a practice run at level 3 adds no half-step toward level 4, and keeps an assessment one', () => {
    setNumber('a', 3)
    emitActivity(atCurrentLevel(strongRun('a'), 'practice'))
    expect(number('a')?.streak).toBe(0)
    // one strong Math Lab run after it: still level 3 (one run of real evidence)
    emitActivity({ ...strongRun('a'), level: 3 })
    expect(number('a')).toMatchObject({ level: 3, streak: 1 })
    // a strong practice run in between keeps that assessment step
    emitActivity(atCurrentLevel(strongRun('a'), 'practice'))
    expect(number('a')).toMatchObject({ level: 3, streak: 1 })
    // the second Math Lab run completes it
    emitActivity({ ...strongRun('a'), level: 3 })
    expect(number('a')?.level).toBe(4)
  })

  it('C2: weak practice at level 3 can still lower it (struggling with its own items)', () => {
    setNumber('a', 3)
    const weakRun = () => ({ ...atCurrentLevel(strongRun('a'), 'practice'), independent: 1 })
    emitActivity(weakRun())
    emitActivity(weakRun())
    expect(number('a')?.level).toBe(2)
  })

  it('D: a learn session (being taught) moves nothing', () => {
    setNumber('a', 2)
    for (let i = 0; i < 4; i += 1) emitActivity(atCurrentLevel(strongRun('a'), 'learn'))
    expect(number('a')).toMatchObject({ level: 2, runs: 10 })
  })

  it('F: the big letter test is its own gate, never a level move', () => {
    setNumber('a', 2)
    for (let i = 0; i < 4; i += 1) emitActivity(atCurrentLevel(strongRun('a'), 'exam'))
    expect(number('a')).toMatchObject({ level: 2, runs: 10 })
  })

  it('a run counted twice (retry, back, refresh) moves the strand once', () => {
    setNumber('a', 2)
    const run = atCurrentLevel(strongRun('a'), 'practice')
    emitActivity(run)
    emitActivity(run)
    emitActivity(run)
    expect(number('a')?.runs).toBe(11)
  })
})

describe('which games are tier evidence', () => {
  it('E: a letter choice game moves the letters strand; tracing (hand precision) does not', () => {
    useProgressStore.setState({ byChild: {} })
    // a five-year-old: the letters strand starts at 2, inside the young tiers
    useFamilyStore.getState().updateChild('a', { birthDate: birthDateForAge(5, tashkentDay()) })
    const play = (type: 'trace' | 'find-letter') =>
      useProgressStore.getState().completeTask('a', {
        type,
        language: 'uz',
        letterIds: ['a', 'b', 'd', 'e', 'f'],
        mistakeDetails: [],
      })
    play('trace')
    play('trace')
    expect(useUniverseStore.getState().byChild.a?.strands?.letters).toBeUndefined()
    play('find-letter')
    expect(useUniverseStore.getState().byChild.a?.strands?.letters?.runs).toBe(1)
  })
})

describe('placement', () => {
  it('G/H: is written once and only for its child', () => {
    const start = { level: 3 as const, mastery: 0, asked: 3, independent: 1 }
    expect(placeStrand('a', 'number', start)).toBe(true)
    // a second placement changes nothing
    expect(placeStrand('a', 'number', { ...start, level: 5 })).toBe(false)
    expect(number('a')).toEqual(placedState(start))
    // the brother or sister is untouched and still gets their own placement
    expect(number('b')).toBeUndefined()
    expect(placeStrand('b', 'number', { ...start, level: 1 })).toBe(true)
    expect(number('b')?.level).toBe(1)
    expect(number('a')?.level).toBe(3)
  })

  it('is never written over a strand already played', () => {
    setNumber('a', 4)
    expect(placeStrand('a', 'number', { level: 1, mastery: 0, asked: 2, independent: 0 })).toBe(
      false,
    )
    expect(number('a')?.level).toBe(4)
  })
})

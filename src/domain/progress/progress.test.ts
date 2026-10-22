import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useRewardStore } from '@/domain/rewards'
import { EMPTY_LEARN_CHILD, useLearnStore } from '@/features/learn/learnStore'
import { useFamilyStore } from '@/store/familyStore'
import { EMPTY_PROGRESS, useProgressStore } from '@/store/progressStore'
import { childActivityForDay, letterStruggleStats, useMastery } from '.'

const KID = 'kid-1'
const DAY = '2026-10-18'

describe('progress facade', () => {
  beforeEach(() => {
    useProgressStore.setState({ byChild: {} })
    useRewardStore.setState({ byChild: {} })
    useLearnStore.setState({ byChild: {} })
    useFamilyStore.setState({ children: [], activeChildId: null })
  })

  it('counts legacy tasks and learning sessions of the same day', () => {
    useProgressStore
      .getState()
      .completeTask(
        KID,
        { type: 'memory', language: 'uz', letterIds: ['a'], mistakeDetails: [] },
        new Date(2026, 9, 18, 9, 0),
      )
    useProgressStore
      .getState()
      .completeTask(
        KID,
        { type: 'memory', language: 'uz', letterIds: ['a'], mistakeDetails: [] },
        new Date(2026, 9, 17, 9, 0),
      )
    const session = (id: string, at: Date) => ({
      id,
      section: 'math' as const,
      stage: '4',
      language: 'any' as const,
      mode: 'learn' as const,
      total: 3,
      independent: 1,
      helped: 0,
      wrong: 2,
      weakSkills: [],
      strongSkills: [],
      coins: 2,
      at: at.toISOString(),
    })
    useLearnStore.setState({
      byChild: {
        [KID]: {
          ...EMPTY_LEARN_CHILD,
          sessions: [
            session('s1', new Date(2026, 9, 18, 10, 0)),
            session('s2', new Date(2026, 9, 18, 18, 0)),
            session('s3', new Date(2026, 9, 19, 8, 0)),
          ],
        },
      },
    })

    expect(childActivityForDay(KID, DAY)).toEqual({
      tasks: 1,
      sessions: 2,
      total: 3,
      kinds: ['memory', 'math'],
    })
    expect(childActivityForDay('nobody', DAY).total).toBe(0)
  })

  it('maps letter struggles to alphabet skill records', () => {
    const progress = { ...EMPTY_PROGRESS, struggles: { uz: { sh: 2, ch: 1 } } }
    expect(letterStruggleStats(progress, 'uz')).toMatchObject([
      { key: 'alphabet|uz|sh', section: 'alphabet', skill: 'sh', wrong: 2, streak: 0 },
      { key: 'alphabet|uz|ch', skill: 'ch', wrong: 1 },
    ])
    expect(letterStruggleStats(progress, 'ru')).toEqual([])
  })

  it('useMastery reads both models for the active child', () => {
    const child = useFamilyStore
      .getState()
      .addChild({ name: 'Ali', birthDate: '2021-01-01', gender: 'boy' })
    useFamilyStore.getState().setActiveChild(child.id)
    useProgressStore.setState({
      byChild: {
        [child.id]: { ...EMPTY_PROGRESS, learned: { uz: ['a', 'b'] }, struggles: { uz: { b: 1 } } },
      },
    })
    const answer = {
      section: 'math' as const,
      language: 'any' as const,
      mode: 'learn' as const,
      first: '2',
      final: '3',
      finalCorrect: true,
      helped: false,
      firstCorrect: false,
      errorType: 'count',
      questionId: 'q1',
      skill: 'count-3',
    }
    useLearnStore.getState().recordAttempt(child.id, answer)
    useLearnStore.getState().markStage(child.id, 'math', 'any', '4')

    const alphabet = renderHook(() => useMastery('alphabet', 'uz')).result.current
    expect(alphabet.weak.map((stat) => stat.key)).toEqual(['alphabet|uz|b'])
    expect(alphabet.strong.map((stat) => stat.key)).toEqual(['alphabet|uz|a'])

    const math = renderHook(() => useMastery('math', 'any')).result.current
    expect(math.weak.map((stat) => stat.key)).toEqual(['math|any|count-3'])
    expect(math.stages).toEqual(['4'])
  })
})

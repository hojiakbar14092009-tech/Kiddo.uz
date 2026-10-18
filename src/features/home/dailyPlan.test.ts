import { describe, expect, it } from 'vitest'
import type { TaskResult } from '@/store/progressStore'
import type { TaskType } from '@/store/progressStore'
import { dailyPlanState } from './dailyPlan'

const DAY = '2026-10-18'

function result(type: TaskType, day = DAY): TaskResult {
  return {
    id: `${type}-${day}`,
    type,
    language: 'uz',
    letterIds: [],
    mistakes: 0,
    mistakeDetails: [],
    coins: 5,
    stars: 3,
    stickerId: null,
    day,
    finishedAt: `${day}T10:00:00.000Z`,
  }
}

describe('dailyPlanState', () => {
  it('starts with the first game as next', () => {
    const plan = dailyPlanState([], DAY)
    expect(plan.steps.map((step) => step.status)).toEqual(['next', 'later', 'later'])
    expect(plan.done).toBe(0)
    expect(plan.complete).toBe(false)
  })

  it('counts games played in any order and ignores other days', () => {
    const plan = dailyPlanState(
      [result('find-picture'), result('find-letter', '2026-10-17'), result('memory')],
      DAY,
    )
    expect(plan.steps.map((step) => step.status)).toEqual(['next', 'done', 'later'])
    expect(plan.done).toBe(1)
  })

  it('counts a game played twice only once', () => {
    const plan = dailyPlanState([result('trace'), result('trace')], DAY)
    expect(plan.done).toBe(1)
  })

  it('is complete when all three are played', () => {
    const plan = dailyPlanState(
      [result('find-letter'), result('find-picture'), result('trace')],
      DAY,
    )
    expect(plan.complete).toBe(true)
    expect(plan.steps.every((step) => step.status === 'done')).toBe(true)
  })
})

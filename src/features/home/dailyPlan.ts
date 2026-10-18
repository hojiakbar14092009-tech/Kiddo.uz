import type { GameType } from '@/features/tasks/games'
import type { TaskResult } from '@/store/progressStore'

/** Today’s plan: three short games, varied so practice stays fresh. */
export const DAILY_PLAN: readonly GameType[] = ['find-letter', 'find-picture', 'trace']

export type PlanStepStatus = 'done' | 'next' | 'later'

export interface PlanStep {
  game: GameType
  status: PlanStepStatus
}

export interface DailyPlanState {
  steps: PlanStep[]
  done: number
  total: number
  complete: boolean
}

/**
 * Each planned game counts once per day, whatever order the child plays in.
 * The first unfinished game is “next”; nothing is ever locked.
 */
export function dailyPlanState(results: readonly TaskResult[], day: string): DailyPlanState {
  const playedToday = new Set(
    results.filter((result) => result.day === day).map((result) => result.type),
  )
  let nextAssigned = false
  const steps = DAILY_PLAN.map((game): PlanStep => {
    if (playedToday.has(game)) return { game, status: 'done' }
    if (nextAssigned) return { game, status: 'later' }
    nextAssigned = true
    return { game, status: 'next' }
  })
  const done = steps.filter((step) => step.status === 'done').length
  return { steps, done, total: steps.length, complete: done === steps.length }
}

import type { GameType } from '@/features/tasks/games'
import type { TaskResult } from '@/store/progressStore'

/** Today’s plan: three short games, varied so practice stays fresh. */
export const DAILY_PLAN: readonly GameType[] = ['find-letter', 'find-picture', 'trace']

export function tasksDoneOn(results: readonly TaskResult[], day: string): number {
  return results.filter((result) => result.day === day && result.type !== 'exam').length
}

/** The next game in today’s plan, or `null` when the plan is done. */
export function nextPlannedGame(doneToday: number): GameType | null {
  return DAILY_PLAN[doneToday] ?? null
}

import type { TaskOutcome, TaskType } from '@/store/progressStore'

/** Passed from a finished task to the reward screen via router state. */
export interface RewardState {
  taskType: TaskType
  outcome: TaskOutcome
}

export function isRewardState(value: unknown): value is RewardState {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<RewardState>
  return (
    typeof candidate.taskType === 'string' &&
    typeof candidate.outcome === 'object' &&
    candidate.outcome !== null &&
    typeof candidate.outcome.coins === 'number' &&
    typeof candidate.outcome.mistakes === 'number'
  )
}

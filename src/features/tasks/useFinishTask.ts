import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useChildKey,
  useProgressStore,
  type MistakeDetail,
  type TaskType,
} from '@/store/progressStore'
import { useLanguage } from '@/store/settingsStore'
import type { RewardState } from './rewardState'

/** Saves a finished task (coins, learned letters, sticker) and opens the reward screen. */
export function useFinishTask(taskType: TaskType) {
  const navigate = useNavigate()
  const language = useLanguage()
  const childKey = useChildKey()
  const completeTask = useProgressStore((state) => state.completeTask)

  return useCallback(
    (letterIds: string[], mistakeDetails: MistakeDetail[]) => {
      const outcome = completeTask(childKey, {
        type: taskType,
        language,
        letterIds,
        mistakeDetails,
      })
      const state: RewardState = { taskType, outcome }
      navigate('/reward', { replace: true, state })
    },
    [childKey, completeTask, language, navigate, taskType],
  )
}

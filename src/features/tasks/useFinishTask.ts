import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFamilyStore } from '@/store/familyStore'
import {
  useChildKey,
  useProgressStore,
  type MistakeDetail,
  type TaskType,
} from '@/store/progressStore'
import { useLanguage } from '@/store/settingsStore'
import type { RewardState } from './rewardState'
import { useHomeworkFor } from './useHomework'

/** Saves a finished task (coins, learned letters, sticker, homework) and opens the reward screen. */
export function useFinishTask(taskType: TaskType) {
  const navigate = useNavigate()
  const language = useLanguage()
  const childKey = useChildKey()
  const completeTask = useProgressStore((state) => state.completeTask)
  const completeHomework = useFamilyStore((state) => state.completeHomework)
  const homework = useHomeworkFor(taskType)

  return useCallback(
    (letterIds: string[], mistakeDetails: MistakeDetail[]) => {
      const outcome = completeTask(childKey, {
        type: taskType,
        language,
        letterIds,
        mistakeDetails,
      })
      if (homework) completeHomework(childKey, homework.id, outcome.mistakes)
      const state: RewardState = { taskType, outcome }
      navigate('/reward', { replace: true, state })
    },
    [childKey, completeHomework, completeTask, homework, language, navigate, taskType],
  )
}

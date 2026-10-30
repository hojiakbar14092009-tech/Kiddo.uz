import { useSearchParams } from 'react-router-dom'
import {
  isActivityHomework,
  isLetterHomework,
  useActiveChild,
  type ActivityHomework,
  type Homework,
  type LetterHomework,
} from '@/store/familyStore'
import { useProgress, type ChildProgress } from '@/store/progressStore'
import { useLanguage } from '@/store/settingsStore'
import type { GameType } from './games'
import type { LearnerState } from './generateRounds'

const NONE: Homework[] = []

/** The active child’s unfinished letter homework in the current language, oldest first. */
export function usePendingHomework(): LetterHomework[] {
  const child = useActiveChild()
  const language = useLanguage()
  const list = child?.homeworks ?? NONE
  return list.filter(
    (homework): homework is LetterHomework =>
      isLetterHomework(homework) && !homework.completedAt && homework.language === language,
  )
}

/** The active child’s unfinished activity homework (any language), oldest first. */
export function usePendingActivityHomework(): ActivityHomework[] {
  const child = useActiveChild()
  const list = child?.homeworks ?? NONE
  return list.filter(
    (homework): homework is ActivityHomework =>
      isActivityHomework(homework) && !homework.completedAt,
  )
}

/** The homework this game was opened for (`/tasks/:type?homework=<id>`). */
export function useHomeworkFor(game: GameType | 'exam'): LetterHomework | null {
  const [params] = useSearchParams()
  const id = params.get('homework')
  return (
    usePendingHomework().find((homework) => homework.game === game && homework.id === id) ?? null
  )
}

export function homeworkPath(homework: LetterHomework): string {
  return `/tasks/${homework.game}?homework=${encodeURIComponent(homework.id)}`
}

export function learnerFrom(
  progress: ChildProgress,
  language: LetterHomework['language'],
  homework: LetterHomework | null,
): LearnerState {
  return {
    learned: progress.learned[language] ?? [],
    struggles: progress.struggles[language] ?? {},
    focus: homework?.letterIds ?? [],
  }
}

/** What the game should practise: homework letters first, then the usual mix. */
export function useLearner(game: GameType): LearnerState {
  const language = useLanguage()
  const progress = useProgress()
  return learnerFrom(progress, language, useHomeworkFor(game))
}

import { useSearchParams } from 'react-router-dom'
import { useActiveChild, type Homework } from '@/store/familyStore'
import { useProgress, type ChildProgress } from '@/store/progressStore'
import { useLanguage } from '@/store/settingsStore'
import type { GameType } from './games'
import type { LearnerState } from './generateRounds'

/** The active child’s unfinished homework in the current language, if any. */
export function usePendingHomework(): Homework | null {
  const child = useActiveChild()
  const language = useLanguage()
  const homework = child?.homework
  if (!homework || homework.completedAt || homework.language !== language) return null
  return homework
}

/** The homework this game was opened for (`/tasks/:type?homework=<id>`). */
export function useHomeworkFor(game: GameType | 'exam'): Homework | null {
  const [params] = useSearchParams()
  const homework = usePendingHomework()
  if (!homework || homework.game !== game || params.get('homework') !== homework.id) return null
  return homework
}

export function homeworkPath(homework: Homework): string {
  return `/tasks/${homework.game}?homework=${encodeURIComponent(homework.id)}`
}

export function learnerFrom(
  progress: ChildProgress,
  language: Homework['language'],
  homework: Homework | null,
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

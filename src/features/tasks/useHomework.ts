import { useSearchParams } from 'react-router-dom'
import { isGameOpen } from '@/features/age/ageLevel'
import { levelOfChild, useActiveChild, type Homework } from '@/store/familyStore'
import { useProgress, type ChildProgress } from '@/store/progressStore'
import { useLanguage } from '@/store/settingsStore'
import type { GameType } from './games'
import type { LearnerState } from './generateRounds'

const NONE: Homework[] = []

/** The active child’s unfinished homework in the current language, oldest first. */
export function usePendingHomework(): Homework[] {
  const child = useActiveChild()
  const language = useLanguage()
  const level = levelOfChild(child ?? null)
  const list = child?.homeworks ?? NONE
  return list.filter(
    (homework) =>
      !homework.completedAt &&
      homework.language === language &&
      // A game for an older child (e.g. after the birthday was corrected) waits until it opens.
      isGameOpen(homework.game, level),
  )
}

/** The homework this game was opened for (`/tasks/:type?homework=<id>`). */
export function useHomeworkFor(game: GameType | 'exam'): Homework | null {
  const [params] = useSearchParams()
  const id = params.get('homework')
  return (
    usePendingHomework().find((homework) => homework.game === game && homework.id === id) ?? null
  )
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

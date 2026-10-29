import { useState } from 'react'
import { letterLessonId } from '@/domain/learning'
import { hasSeenLesson, useLearnChild } from '@/features/learn/learnStore'
import { useLanguage } from '@/store/settingsStore'
import type { GameType } from './games'
import { playableLetters } from './playableLetters'
import type { LearnerState } from './generateRounds'

/**
 * The letters of a game the child has neither learned nor met (Learn Before
 * Play): taken once when the game starts, like its rounds, so meeting a letter
 * mid-game does not reshuffle anything.
 */
export function useUnmetLetters(type: GameType, learner: LearnerState): ReadonlySet<string> {
  const language = useLanguage()
  const learn = useLearnChild()
  const [unmet] = useState(
    () =>
      new Set(
        playableLetters(language, type)
          .filter(
            (letter) =>
              !learner.learned.includes(letter.id) &&
              !hasSeenLesson(learn, letterLessonId(language, letter.id)),
          )
          .map((letter) => letter.id),
      ),
  )
  return unmet
}

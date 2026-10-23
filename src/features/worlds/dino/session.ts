import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChallengeLevel } from '@/domain/learner'
import { emitActivity, type AwardSummary } from '@/domain/universe'
import { newId } from '@/lib/id'
import { useChildKey } from '@/store/progressStore'
import { dinoActivity, type DinoActivityKind, type DinoScore } from './result'

/** How long the praise stays before the next question (not a time limit). */
export const NEXT_DELAY_MS = 1100

export interface DinoFinished {
  score: DinoScore
  award: Pick<AwardSummary, 'stars' | 'crystals'>
}

/**
 * Counts one finished run in the universe, once (a new id per run), at the
 * level it was played at. Called the moment the last answer is right, so
 * leaving during the praise never loses the run.
 */
export function useDinoRecorder(kind: DinoActivityKind, level: ChallengeLevel) {
  const childKey = useChildKey()
  const [runId] = useState(newId)
  const emitted = useRef(false)
  return useCallback(
    (score: DinoScore): DinoFinished | null => {
      if (emitted.current) return null
      emitted.current = true
      let award: DinoFinished['award'] = { stars: 0, crystals: 0 }
      try {
        award = emitActivity(dinoActivity(runId, childKey, kind, level, score))
      } catch {
        // the child still sees the praise; the universe keeps its own state
      }
      return { score, award }
    },
    [childKey, kind, level, runId],
  )
}

/** For `aria-label`s of the step dots: the shared "question n of m" text. */
export function useStepLabel() {
  const { t } = useTranslation()
  return (current: number, total: number) => t('learn.question', { current: current + 1, total })
}

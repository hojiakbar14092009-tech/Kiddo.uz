import { useCallback, useEffect, useRef, useState } from 'react'
import type { HintLevel } from '@/domain/learningMemory'
import { aiAvailability, askTutorAI, type TutorRequest, type TutorSource } from '@/domain/tutor'

export interface TutorView {
  level: HintLevel
  message: string
  source: TutorSource
}

/**
 * The tutor's words for the current question. Kiddo's own hint is shown at
 * once (the game never waits); when the AI tutor is available for this
 * child, a checked AI reply may replace it a moment later, while a small
 * "thinking" sign shows. A newer hint, a new question or leaving the page
 * makes a late reply count for nothing.
 */
export function useTutorReply() {
  const [view, setView] = useState<TutorView | null>(null)
  const [thinking, setThinking] = useState(false)
  const turn = useRef(0)

  useEffect(
    () => () => {
      turn.current += 1
    },
    [],
  )

  const clear = useCallback(() => {
    turn.current += 1
    setView(null)
    setThinking(false)
  }, [])

  const show = useCallback(
    (level: HintLevel, local: string, aiRequest?: (() => TutorRequest) | null) => {
      turn.current += 1
      const mine = turn.current
      setView({ level, message: local, source: 'local' })
      setThinking(false)
      if (!aiRequest) return
      const request = aiRequest()
      if (aiAvailability(request.childId) !== 'ready') return
      setThinking(true)
      void askTutorAI(request).then((reply) => {
        if (turn.current !== mine) return
        setThinking(false)
        if (reply) setView({ level, message: reply.message, source: 'ai' })
      })
    },
    [],
  )

  return { view, thinking, show, clear }
}

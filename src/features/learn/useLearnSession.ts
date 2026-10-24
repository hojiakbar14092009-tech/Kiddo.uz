import { useCallback, useRef, useState } from 'react'
import { recordLearning } from '@/domain/learning'
import { useChildKey } from '@/store/progressStore'
import { learnOutcome } from './learnEvidence'
import { useLearnStore, type LearnLanguage, type SectionId } from './learnStore'
import {
  markHelp,
  newSheet,
  recordAnswer,
  summarize,
  type LearnMode,
  type SessionSheet,
  type SessionSummary,
} from './session'

export interface SessionQuestion {
  id: string
  skill: string
}

export interface FinishedSession {
  id: string
  summary: SessionSummary
  /** Coins given now (0 if this session was already rewarded). */
  coins: number
  mode: LearnMode
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Runs one learning or test session: keeps the answer sheet (first answers
 * are never overwritten), logs every question to the child's learning record
 * and, as normalized evidence, to the shared learning memory when it is done
 * (once per question), and saves the session with its coins exactly once.
 */
export function useLearnSession({
  section,
  language,
  stage,
  mode,
}: {
  section: SectionId
  language: LearnLanguage
  stage: string
  mode: LearnMode
}) {
  const childKey = useChildKey()
  const recordAttempt = useLearnStore((state) => state.recordAttempt)
  const finishSession = useLearnStore((state) => state.finishSession)
  const [id] = useState(newId)
  const [sheet, setSheet] = useState<SessionSheet>(() => newSheet(mode))
  const sheetRef = useRef(sheet)
  const logged = useRef(new Set<string>())
  const finished = useRef<FinishedSession | null>(null)

  const update = (next: SessionSheet) => {
    sheetRef.current = next
    setSheet(next)
  }

  /** Records an answer; returns whether it was the first answer to this question. */
  const answer = useCallback(
    (
      question: SessionQuestion,
      value: string,
      correct: boolean,
      errorType: string | null = null,
    ) => {
      const first = !sheetRef.current.answers[question.id]
      update(recordAnswer(sheetRef.current, question, value, correct, errorType))
      return first
    },
    [],
  )

  const help = useCallback((question: SessionQuestion) => {
    update(markHelp(sheetRef.current, question.id))
  }, [])

  /** The question is over: its full record (first answer, help, final answer) is logged once. */
  const close = useCallback(
    (question: SessionQuestion) => {
      const record = sheetRef.current.answers[question.id]
      if (!record || logged.current.has(question.id)) return
      logged.current.add(question.id)
      recordAttempt(childKey, { ...record, section, language, mode })
      // the same finished question, as evidence for the shared learning memory
      const outcome = learnOutcome(section, id, record, new Date().toISOString())
      if (outcome) {
        try {
          recordLearning(childKey, outcome)
        } catch {
          // the memory is best effort: the session itself never breaks
        }
      }
    },
    [childKey, id, language, mode, recordAttempt, section],
  )

  const finish = useCallback(
    (total: number): FinishedSession => {
      if (finished.current) return finished.current
      const summary = summarize(sheetRef.current, total)
      const coins = finishSession(childKey, { id, section, stage, language, mode, ...summary })
      finished.current = { id, summary, coins, mode }
      return finished.current
    },
    [childKey, finishSession, id, language, mode, section, stage],
  )

  return { id, sheet, answer, help, close, finish }
}

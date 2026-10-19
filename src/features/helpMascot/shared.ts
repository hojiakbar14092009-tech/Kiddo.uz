import type { Language } from '@/content/languages'
import type { LearnMode } from '@/features/learn/session'
import type { useLearnSession } from '@/features/learn/useLearnSession'

export type Session = ReturnType<typeof useLearnSession>

export interface QuestionProps<Q> {
  q: Q
  title: string
  step: { current: number; total: number }
  mode: LearnMode
  language: Language
  session: Session
  onNext: () => void
}

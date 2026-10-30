import type { Language } from '@/content/languages'
import type { ActivityCompleted, Strand } from './types'

/*
 * How the existing completion points describe a finished activity. Pure
 * mappers with type-only imports of the stores, so the stores can call them
 * (and `emitActivity`) inside their actions without a load-time cycle.
 */

type TaskKind = 'find-letter' | 'find-picture' | 'memory' | 'trace' | 'exam'
type LearnSection = 'words' | 'help' | 'tales' | 'space' | 'math' | 'garden'

export const TASK_STRAND: Record<TaskKind, Strand> = {
  'find-letter': 'letters',
  'find-picture': 'letters',
  trace: 'letters',
  exam: 'letters',
  memory: 'logic',
}

export const SECTION_STRAND: Record<LearnSection, Strand> = {
  words: 'reading',
  math: 'number',
  space: 'space',
  tales: 'language',
  garden: 'science',
  help: 'logic',
}

/**
 * A legacy game or the exam. It has no per-question record, so it counts as
 * `total` rounds (at least `rounds`, the caller's ROUNDS_PER_TASK) with one
 * independent answer lost per mistake: with 5 rounds, 0 mistakes → 3 stars,
 * 1–2 → 2, more → 1 (as the game's own `starsFor`).
 */
export function taskActivity(
  childKey: string,
  result: {
    id: string
    type: TaskKind
    language: Language
    letterIds: readonly string[]
    mistakes: number
    finishedAt: string
  },
  rounds: number,
): ActivityCompleted {
  const total = Math.max(result.letterIds.length, rounds, 1)
  const independent = Math.max(0, total - result.mistakes)
  return {
    id: result.id,
    childKey,
    activity: `${result.type}:${result.language}`,
    strand: TASK_STRAND[result.type],
    correct: total,
    total,
    independent,
    at: result.finishedAt,
  }
}

/** A finished learning session; a tale is `tale:<stage>` so it pays a scroll once. */
export function learnActivity(
  childKey: string,
  session: {
    id: string
    section: LearnSection
    stage: string
    total: number
    independent: number
    wrong: number
    at?: string
  },
): ActivityCompleted {
  return {
    id: session.id,
    childKey,
    activity:
      session.section === 'tales' ? `tale:${session.stage}` : `${session.section}:${session.stage}`,
    strand: SECTION_STRAND[session.section],
    correct: Math.max(0, session.total - session.wrong),
    total: session.total,
    independent: session.independent,
    ...(session.at ? { at: session.at } : {}),
  }
}

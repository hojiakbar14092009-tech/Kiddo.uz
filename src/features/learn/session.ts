/*
 * The answer sheet of one short session (learning or a test). It keeps the
 * child's FIRST answer to every question for good: correcting a mistake later
 * never erases it. A question counts as answered independently only if the
 * first answer was right and no help was used before it.
 */

export type LearnMode = 'learn' | 'test'

export interface AnswerRecord {
  questionId: string
  skill: string
  /** The first answer, kept even after the child corrects it. */
  first: string
  firstCorrect: boolean
  /** Help (a hint that points at the answer) was used before the first answer. */
  helped: boolean
  /** The answer the question ended with. */
  final: string
  finalCorrect: boolean
  /** A short label for what went wrong (e.g. "counted-one-less"), for review and parents. */
  errorType: string | null
}

export interface SessionSheet {
  mode: LearnMode
  answers: Record<string, AnswerRecord>
  /** Questions where help was used before they were answered. */
  helpedBefore: Record<string, true>
}

export function newSheet(mode: LearnMode): SessionSheet {
  return { mode, answers: {}, helpedBefore: {} }
}

/** Help was opened for this question. Only counts if it came before the first answer. */
export function markHelp(sheet: SessionSheet, questionId: string): SessionSheet {
  if (sheet.answers[questionId] || sheet.helpedBefore[questionId]) return sheet
  return { ...sheet, helpedBefore: { ...sheet.helpedBefore, [questionId]: true } }
}

export function recordAnswer(
  sheet: SessionSheet,
  question: { id: string; skill: string },
  answer: string,
  correct: boolean,
  errorType: string | null = null,
): SessionSheet {
  const existing = sheet.answers[question.id]
  const record: AnswerRecord = existing
    ? // a later try only changes the final answer
      { ...existing, final: answer, finalCorrect: correct }
    : {
        questionId: question.id,
        skill: question.skill,
        first: answer,
        firstCorrect: correct,
        helped: Boolean(sheet.helpedBefore[question.id]),
        final: answer,
        finalCorrect: correct,
        errorType: correct ? null : errorType,
      }
  return { ...sheet, answers: { ...sheet.answers, [question.id]: record } }
}

export interface SessionSummary {
  total: number
  /** First answer right, without help. */
  independent: number
  /** Answered after help (whatever the answer). */
  helped: number
  /** First answer wrong. */
  wrong: number
  /** Skills that need more practice (wrong first answer or help used). */
  weakSkills: string[]
  /** Skills answered independently and right. */
  strongSkills: string[]
}

export function summarize(sheet: SessionSheet, total: number): SessionSummary {
  const answers = Object.values(sheet.answers)
  const independent = answers.filter((a) => a.firstCorrect && !a.helped)
  const weak = answers.filter((a) => !a.firstCorrect || a.helped).map((a) => a.skill)
  return {
    total,
    independent: independent.length,
    helped: answers.filter((a) => a.helped).length,
    wrong: answers.filter((a) => !a.firstCorrect).length,
    weakSkills: [...new Set(weak)],
    strongSkills: [...new Set(independent.map((a) => a.skill))].filter((s) => !weak.includes(s)),
  }
}

/** Standard number of test questions for an age (4 → 3, 5 → 4, 6 → 5). */
export function testLength(level: 4 | 5 | 6): number {
  return level - 1
}

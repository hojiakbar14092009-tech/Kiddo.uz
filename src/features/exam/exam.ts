import type { LetterEntry } from '@/content/alphabet'
import type { Language } from '@/content/languages'
import { shuffle, type RandomSource } from '@/lib/random'
import { buildRound, type TaskRound } from '@/features/tasks/generateRounds'
import { isPlayable } from '@/features/tasks/playableLetters'
import type { MistakeDetail, TaskResult } from '@/store/progressStore'

export const EXAM_ROUNDS = 10
/** Passed with at most this many wrong taps over all rounds. */
export const PASS_MAX_MISTAKES = 2

export function examLetters(letters: readonly LetterEntry[]): LetterEntry[] {
  return letters.filter((letter) => isPlayable('exam', letter))
}

/** How many of the exam letters the child has learned, and how many there are. */
export function examProgress(letters: readonly LetterEntry[], learned: readonly string[]) {
  const eligible = examLetters(letters)
  const learnedSet = new Set(learned)
  return {
    learned: eligible.filter((letter) => learnedSet.has(letter.id)).length,
    total: eligible.length,
  }
}

/** “Which picture has this letter?” for ten different letters of the whole alphabet. */
export function generateExamRounds(
  letters: readonly LetterEntry[],
  random: RandomSource = Math.random,
): TaskRound[] {
  const eligible = examLetters(letters)
  return shuffle(eligible, random)
    .slice(0, EXAM_ROUNDS)
    .map((target) => buildRound('find-picture', target, eligible, random))
}

/** Rounds answered right on the first tap. */
export function firstTryCorrect(mistakes: readonly MistakeDetail[], rounds = EXAM_ROUNDS): number {
  return Math.max(0, rounds - new Set(mistakes.map((mistake) => mistake.targetId)).size)
}

export function examPassed(mistakes: number): boolean {
  return mistakes <= PASS_MAX_MISTAKES
}

/** The most recent passed exam in a language – it is what the certificate shows. */
export function latestPassedExam(
  results: readonly TaskResult[],
  language: Language,
): TaskResult | undefined {
  return results.find(
    (result) =>
      result.type === 'exam' && result.language === language && examPassed(result.mistakes),
  )
}

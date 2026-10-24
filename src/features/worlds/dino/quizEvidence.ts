import { HINT, type LearningOutcome } from '@/domain/learning'
import type { QuizKind, QuizQuestion } from './quiz'

/*
 * Evidence adapter of the dinosaur quiz (Phase 17): a solved question becomes
 * one normalized outcome. Exploring, digging and tapping dinosaurs give none
 * (exploration is not assessment). Kinds fold into three science skills.
 */

const SKILL: Record<QuizKind, string> = {
  eat: 'science:dino-diet',
  whoMeat: 'science:dino-diet',
  whoPlant: 'science:dino-diet',
  flew: 'science:dino-facts',
  feature: 'science:dino-facts',
  notDino: 'science:dino-facts',
  biggest: 'science:dino-size',
  longer: 'science:dino-size',
}

/** A diet question answered with the wrong diet or eater is a plant/meat mix-up. */
function codeOf(question: QuizQuestion): string {
  return SKILL[question.kind] === 'science:dino-diet' ? 'diet-mixup' : 'wrong-choice'
}

export function quizOutcome(
  question: QuizQuestion,
  run: { sessionId: string; index: number; misses: number; level: number },
  at: string,
): LearningOutcome {
  const { misses } = run
  return {
    skill: SKILL[question.kind],
    sessionId: run.sessionId,
    questionId: `${run.index}|${question.id}`,
    item: question.id,
    firstTry: misses === 0,
    helpedBefore: false,
    errors: misses > 0 ? [codeOf(question)] : [],
    // after a miss a clue is said; after two the right card glows
    hint: misses >= 2 ? HINT.scaffold : misses === 1 ? HINT.clue : HINT.none,
    at,
    level: run.level,
  }
}

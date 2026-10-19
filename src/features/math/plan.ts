import type { AgeLevel } from '@/features/age/ageLevel'
import type { LearnChild } from '@/features/learn/learnStore'
import type { Rng } from '@/features/learn/random'
import { mixWithReview, notSameOrder, orderOf } from '@/features/learn/review'
import { testLength } from '@/features/learn/session'
import {
  buildQuestions,
  factsFor,
  LEARN_COUNT,
  makeQuestion,
  testPool,
  varyObjects,
  type MathQuestion,
  type StageId,
} from './generators'

/*
 * Which questions a learning run or a short check asks: a check only uses
 * stages the child was taught (so nothing over 10 before "over 10" was
 * learned), mixes in weak skills for review, and never repeats last time's order.
 */

export const TEST_ORDER_KEY = 'math|any|test'
export const learnOrderKey = (stage: StageId) => `math|any|learn:${stage}`

const idOf = (q: MathQuestion) => q.id

export function planLearn(
  stage: StageId,
  level: AgeLevel,
  learn: LearnChild,
  rng: Rng = Math.random,
): MathQuestion[] {
  const questions = buildQuestions([stage], level, 'learn', LEARN_COUNT[level], rng)
  return varyObjects(notSameOrder(questions, idOf, learn.lastOrder[learnOrderKey(stage)], rng))
}

export function planTest(
  level: AgeLevel,
  taught: readonly string[],
  learn: LearnChild,
  rng: Rng = Math.random,
): MathQuestion[] {
  const stages = testPool(level, taught)
  if (stages.length === 0) return []
  const pool = stages.flatMap((stage) =>
    factsFor(stage).map((f) => makeQuestion(f, stage, level, 'test', rng)),
  )
  const count = testLength(level)
  let picked = mixWithReview(pool, (q) => q.skill, learn, 'math', 'any', count, rng, idOf)
  if (picked.length < count) {
    // a very small pool (only "up to 3" taught): fill up with repeats of other objects
    picked = buildQuestions(stages, level, 'test', count, rng, picked)
  }
  return varyObjects(notSameOrder(picked, idOf, learn.lastOrder[TEST_ORDER_KEY], rng))
}

export { orderOf }

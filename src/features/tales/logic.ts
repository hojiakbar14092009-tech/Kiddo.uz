import type { Language } from '@/content/languages'
import { stageKey, type LearnChild } from '@/features/learn/learnStore'
import { shuffle } from '@/features/learn/random'
import { mixWithReview, notSameOrder } from '@/features/learn/review'
import { testLength } from '@/features/learn/session'
import { checkQuestions, type CheckQuestion, type TaleSpec } from './content'

/** A mixed order of the items that is never already the answer order (for 2+ items). */
export function mixedOrder<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  let out = shuffle(items, rng)
  for (
    let tries = 0;
    tries < 8 && items.length > 1 && out.every((item, i) => item === items[i]);
    tries += 1
  ) {
    out = shuffle(items, rng)
  }
  return out
}

/** How many end-of-tale questions: 3, 4 or 5 for a tale made for age 4, 5 or 6. */
export function checkLength(tale: TaleSpec): number {
  return testLength(tale.age)
}

/** Picks the questions: weak ones from before come back first, never the same order twice. */
export function pickChecks(
  tale: TaleSpec,
  language: Language,
  learn: LearnChild,
  rng: () => number = Math.random,
): CheckQuestion[] {
  const pool = checkQuestions(tale, language)
  const picked = mixWithReview(
    pool,
    (q) => q.skill,
    learn,
    'tales',
    language,
    checkLength(tale),
    rng,
    (q) => q.id,
  )
  const ordered = notSameOrder(
    picked,
    (q) => q.id,
    learn.lastOrder[checkOrderKey(tale, language)],
    rng,
  )
  return ordered.map((q) => ({ ...q, options: shuffle(q.options, rng) }))
}

export const checkOrderKey = (tale: TaleSpec, language: Language) =>
  `${stageKey('tales', language)}|${tale.id}`

import type { LearnChild, LearnLanguage, SectionId } from './learnStore'
import { strongSkills, weakSkills } from './learnStore'
import { shuffle, type Rng } from './random'

/*
 * Personal review: a session mixes in a little of what went wrong before
 * (with a different picture or example), one thing the child is sure of, and
 * otherwise new material, so review never blocks moving on.
 */

/** At most this share of a session is review. */
export const REVIEW_SHARE = 0.4

export function mixWithReview<T>(
  pool: readonly T[],
  skillOf: (item: T) => string,
  learn: LearnChild,
  section: SectionId,
  language: LearnLanguage,
  count: number,
  rng: Rng = Math.random,
  /** Item ids used last time, to prefer other pictures/examples for the same skill. */
  idOf: (item: T) => string = (item) => skillOf(item),
): T[] {
  const lastIds = new Set(
    learn.attempts
      .filter((a) => a.section === section && a.language === language)
      .slice(0, 20)
      .map((a) => a.questionId),
  )
  const weak = weakSkills(learn, section, language).map((s) => s.skill)
  const strong = new Set(strongSkills(learn, section, language).map((s) => s.skill))
  const chosen: T[] = []
  const used = new Set<string>()
  const take = (item: T | undefined) => {
    if (!item || used.has(idOf(item))) return
    used.add(idOf(item))
    chosen.push(item)
  }
  const fresh = (items: T[]) => {
    const notLast = items.filter((item) => !lastIds.has(idOf(item)))
    return shuffle(notLast.length > 0 ? notLast : items, rng)[0]
  }

  const reviewSlots = Math.min(weak.length, Math.ceil(count * REVIEW_SHARE))
  for (const skill of weak.slice(0, reviewSlots)) {
    take(fresh(pool.filter((item) => skillOf(item) === skill && !used.has(idOf(item)))))
  }
  if (chosen.length < count) {
    take(fresh(pool.filter((item) => strong.has(skillOf(item)) && !used.has(idOf(item)))))
  }
  const rest = shuffle(
    pool.filter((item) => !used.has(idOf(item))),
    rng,
  ).sort((a, b) => Number(strong.has(skillOf(a))) - Number(strong.has(skillOf(b))))
  for (const item of rest) {
    if (chosen.length >= count) break
    take(item)
  }
  return shuffle(chosen, rng)
}

/** A different order from last time (when there is more than one item). */
export function notSameOrder<T>(
  items: readonly T[],
  idOf: (item: T) => string,
  lastOrder: string | undefined,
  rng: Rng = Math.random,
): T[] {
  let out = [...items]
  for (let tries = 0; tries < 6 && out.length > 1 && orderOf(out, idOf) === lastOrder; tries += 1) {
    out = shuffle(out, rng)
  }
  return out
}

export function orderOf<T>(items: readonly T[], idOf: (item: T) => string): string {
  return items.map(idOf).join(',')
}

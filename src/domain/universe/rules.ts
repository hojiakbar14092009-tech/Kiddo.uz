import type { ActivityCompleted } from './types'

/*
 * How a finished activity turns into resources. Pure functions, no imports
 * beyond types; the store applies the result once per activity run.
 *
 * - Stars (1–3) rate one run by its share of independent answers:
 *   ≥ 90 % → 3, ≥ 60 % → 2, else 1; an activity without questions
 *   (total 0, e.g. a drawing) earns 1.
 * - The star RESOURCE grows only by the improvement over the child's best
 *   for the same `activity`: replaying something already done at 3 stars adds
 *   nothing, so stars measure learning, not repetition.
 * - Crystals: +1 the first time an activity reaches 3 stars (+1 per claimed
 *   daily quest, see dailyQuest.ts).
 * - Parts: +1 when a 'number' activity reaches 3 stars, once per activity
 *   and day, at most PARTS_DAILY_CAP per day.
 * - Scrolls: +1 the first time a tale (activity id `tale:…`) is finished.
 * - Seeds and keys: reserved for later phases (always 0 here).
 * - Creative work (activity ids `studio:…`) has no right or wrong: it is
 *   always rated as total 0 → 1 star, so saving more pictures never earns a
 *   3-star crystal or more stars. Art-strand runs also count towards medals
 *   at most once a day (see `countRun` in achievements.ts).
 */

export type StarRating = 1 | 2 | 3

export const PARTS_DAILY_CAP = 3
export const TALE_PREFIX = 'tale:'

/** Stars of one run. */
export function starsForRun(run: Pick<ActivityCompleted, 'independent' | 'total'>): StarRating {
  if (!(run.total > 0)) return 1
  const share = Math.max(0, run.independent) / run.total
  if (share >= 0.9) return 3
  if (share >= 0.6) return 2
  return 1
}

/** Only the improvement over the previous best counts. */
export function starGain(previousBest: number, stars: StarRating): number {
  return Math.max(0, stars - Math.max(0, previousBest))
}

export const CREATIVE_PREFIX = 'studio:'

/** A creation without questions (a picture, a song): rated 1 star whatever it reports. */
export function isCreative(activity: string): boolean {
  return activity.startsWith(CREATIVE_PREFIX)
}

export function isTale(activity: string): boolean {
  return activity.startsWith(TALE_PREFIX)
}

/** The part of an activity id before the first ':' (`math:4` → `math`). */
export function activityBase(activity: string): string {
  const index = activity.indexOf(':')
  return index === -1 ? activity : activity.slice(0, index)
}

/** What the store knows about the child before this run. */
export interface RuleContext {
  /** Best stars so far for this activity (0: never played). */
  previousBest: number
  /** Parts already earned today. */
  partsToday: number
  /** Did this activity already pay a part today? */
  partPaidToday: boolean
}

export interface ActivityEffects {
  stars: StarRating
  starGain: number
  crystals: number
  parts: number
  scrolls: number
  seeds: 0
  keys: 0
}

export function activityEffects(
  event: Pick<ActivityCompleted, 'activity' | 'strand' | 'independent' | 'total'>,
  context: RuleContext,
): ActivityEffects {
  const stars = isCreative(event.activity) ? 1 : starsForRun(event)
  const firstThree = stars === 3 && context.previousBest < 3
  const part =
    event.strand === 'number' &&
    stars === 3 &&
    !context.partPaidToday &&
    context.partsToday < PARTS_DAILY_CAP
  const firstTale = isTale(event.activity) && context.previousBest === 0
  return {
    stars,
    starGain: starGain(context.previousBest, stars),
    crystals: firstThree ? 1 : 0,
    parts: part ? 1 : 0,
    scrolls: firstTale ? 1 : 0,
    seeds: 0,
    keys: 0,
  }
}

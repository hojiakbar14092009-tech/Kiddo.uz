import { grantReward, rewardHistory, wasRewarded } from '@/domain/rewards/rewardStore'

/*
 * Nuts for «Uyda top»: the existing reward ledger (grantReward), reason
 * 'learn', so the coin sound, the balance, the sync and the server's daily
 * cap all work as for any other activity. The ref names the prompt and the
 * day, and the ledger pays a (reason, ref) only once: each prompt pays at most
 * once a day for each child, however often "Found it!" is pressed. Only the
 * first FIND_HOME_PAID_PER_DAY finds of a day pay at all (the game cannot be
 * farmed by tapping through every prompt); after that the robot only praises.
 */

/** Nuts for one prompt found. */
export const FIND_HOME_NUTS = 2
/** Finds that pay nuts per child per day. */
export const FIND_HOME_PAID_PER_DAY = 3

export function findHomeRef(promptId: string, day: string): string {
  return `find-home|${promptId}|${day}`
}

/** Was this prompt already rewarded today for this child? */
export function foundToday(childKey: string, promptId: string, day: string): boolean {
  return wasRewarded(childKey, 'learn', findHomeRef(promptId, day))
}

/** How many finds have paid this child nuts on this day (from the ledger). */
export function paidFindsOn(childKey: string, day: string): number {
  const suffix = `|${day}`
  return rewardHistory(childKey).filter(
    (entry) =>
      entry.reason === 'learn' &&
      entry.refId.startsWith('find-home|') &&
      entry.refId.endsWith(suffix),
  ).length
}

export type FindOutcome =
  /** Nuts were paid now. */
  | 'paid'
  /** This prompt already paid today. */
  | 'again'
  /** Today's paid finds are used up: praise only. */
  | 'capped'

/** Pays a find once per prompt and day, and at most FIND_HOME_PAID_PER_DAY times a day. */
export function rewardFound(
  childKey: string,
  promptId: string,
  day: string,
): { outcome: FindOutcome; nuts: number } {
  if (foundToday(childKey, promptId, day)) return { outcome: 'again', nuts: 0 }
  if (paidFindsOn(childKey, day) >= FIND_HOME_PAID_PER_DAY) return { outcome: 'capped', nuts: 0 }
  const entry = grantReward({
    childKey,
    coins: FIND_HOME_NUTS,
    reason: 'learn',
    refId: findHomeRef(promptId, day),
  })
  return entry ? { outcome: 'paid', nuts: entry.coins } : { outcome: 'again', nuts: 0 }
}

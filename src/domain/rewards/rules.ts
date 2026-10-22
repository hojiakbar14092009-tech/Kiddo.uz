/*
 * How many coins each activity is worth. The single place for coin amounts;
 * `features/tasks/rules` and `features/learn/learnStore` re-export these.
 * A leaf module: no imports.
 */

/** Coins for a finished task: 5 without mistakes, 3 with mistakes. Coins are never taken away. */
export const COINS_PERFECT = 5
export const COINS_WITH_MISTAKES = 3
/** Extra coins for the first finished task of the day. */
export const DAILY_BONUS = 2

export function coinsFor(mistakes: number): number {
  return mistakes === 0 ? COINS_PERFECT : COINS_WITH_MISTAKES
}

/** Coins for a finished learning session: a little for trying, more for independent answers. */
export function sessionCoins(summary: { independent: number }): number {
  return 1 + summary.independent
}

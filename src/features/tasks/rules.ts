/** Coins for a finished task: 5 without mistakes, 3 with mistakes. Coins are never taken away. */
export const COINS_PERFECT = 5
export const COINS_WITH_MISTAKES = 3
/** Extra coins for the first finished task of the day. */
export const DAILY_BONUS = 2
/** Questions in one task. */
export const ROUNDS_PER_TASK = 5
/** Tasks in the daily plan shown on the home screen. */
export const DAILY_PLAN_SIZE = 3

export function coinsFor(mistakes: number): number {
  return mistakes === 0 ? COINS_PERFECT : COINS_WITH_MISTAKES
}

export function starsFor(mistakes: number): 1 | 2 | 3 {
  if (mistakes === 0) return 3
  return mistakes <= 2 ? 2 : 1
}

/** Local calendar day (YYYY-MM-DD) – daily plans follow the child’s clock, not UTC. */
export function dayKey(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** The big test opens once every letter of the alphabet has been answered without help. */
export function isFinalTestUnlocked(learnedCount: number, totalLetters: number): boolean {
  return totalLetters > 0 && learnedCount >= totalLetters
}

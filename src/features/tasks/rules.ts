export { COINS_PERFECT, COINS_WITH_MISTAKES, coinsFor, DAILY_BONUS } from '@/domain/rewards/rules'

/** Questions in one task. */
export const ROUNDS_PER_TASK = 5
/** Tasks in the daily plan shown on the home screen. */
export const DAILY_PLAN_SIZE = 3

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

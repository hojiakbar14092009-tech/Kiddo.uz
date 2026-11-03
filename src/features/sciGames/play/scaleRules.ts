/*
 * The magic scale (Phase 65): apples on the left pan, number blocks for the
 * right one; the beam is level when both sides weigh the same (adding numbers
 * into a total: 5 = 2 + 3). Pure, so it is tested on its own.
 */

/** The apples on the left pan, round by round (each total is reachable with 1, 2 and 3). */
export const SCALE_ROUNDS = [3, 5, 4, 7, 6] as const
/** The blocks the child can put on: as many of each as wanted. */
export const WEIGHTS = [1, 2, 3] as const
export type Weight = (typeof WEIGHTS)[number]
/** The most the beam leans, in degrees. */
export const MAX_TILT = 16

export function total(weights: readonly number[]): number {
  return weights.reduce((sum, weight) => sum + weight, 0)
}

/**
 * How far the beam leans: positive = the left (apple) side is down. One step
 * per unit of difference, never more than MAX_TILT.
 */
export function tilt(target: number, weights: readonly number[]): number {
  const difference = target - total(weights)
  return Math.max(-MAX_TILT, Math.min(MAX_TILT, difference * 5))
}

export type Balance = 'left' | 'even' | 'right'

export function balance(target: number, weights: readonly number[]): Balance {
  const sum = total(weights)
  return sum === target ? 'even' : sum < target ? 'left' : 'right'
}

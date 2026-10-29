/*
 * Pet friendship (Phase 27): a pet grows closer to the child on every day they
 * play together — a day counts once, when an activity is finished while the
 * pet walks with the robot. Nothing is paid, nothing is lost: a day without
 * play only waits. Deterministic, no AI.
 */

/** Days played together needed for each heart (five hearts in all). */
export const BOND_STEPS = [1, 3, 7, 14, 30] as const
export const MAX_BOND = BOND_STEPS.length

export interface PetBond {
  /** Distinct days the pet has played along. */
  days: number
  /** The last of them (YYYY-MM-DD, local day): a day is never counted twice. */
  last: string
}

/** Hearts (0–5) for this many days together. */
export function bondLevel(days: number): number {
  return BOND_STEPS.filter((step) => days >= step).length
}

/** Days still to play for the next heart, or null with all five. */
export function daysToNextHeart(days: number): number | null {
  const next = BOND_STEPS.find((step) => days < step)
  return next === undefined ? null : next - days
}

/** The bond after playing on `day`: the same object when that day already counted. */
export function addBondDay(bond: PetBond | undefined, day: string): PetBond {
  // a day already counted (or past it); a `last` far in the future came from a wrong
  // clock: today counts then, so a fixed clock never freezes the friendship
  if (bond && bond.last >= day && bond.last <= nextDay(day)) return bond
  return { days: (bond?.days ?? 0) + 1, last: day }
}

/** The local day after `day` (YYYY-MM-DD). */
function nextDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  const next = new Date(y!, m! - 1, d! + 1)
  const month = String(next.getMonth() + 1).padStart(2, '0')
  return `${next.getFullYear()}-${month}-${String(next.getDate()).padStart(2, '0')}`
}

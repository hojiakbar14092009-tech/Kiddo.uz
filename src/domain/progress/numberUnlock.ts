/**
 * Numbers open five at a time (MVP): the first five are open; the next five open once every
 * number of the five before was done right twice in a row. Counting (`count:num-3`) and tracing
 * (`trace:3`) keep their own streaks, so each section opens on its own.
 */
export const NUMBER_GROUP = 5
export const STREAK_TO_OPEN = 2

/** How many items, in their order, are open for these streaks. */
export function openCount(
  keys: readonly string[],
  streaks: Readonly<Record<string, number>>,
): number {
  let open = Math.min(NUMBER_GROUP, keys.length)
  while (
    open < keys.length &&
    keys.slice(open - NUMBER_GROUP, open).every((key) => (streaks[key] ?? 0) >= STREAK_TO_OPEN)
  ) {
    open = Math.min(keys.length, open + NUMBER_GROUP)
  }
  return open
}

/**
 * A right answer adds to the streak; a wrong one starts it again ("in a row"). Once a number
 * reached the streak it stays done, so a later slip never closes numbers already open.
 */
export function nextStreak(current: number | undefined, correct: boolean): number {
  if ((current ?? 0) >= STREAK_TO_OPEN) return current!
  return correct ? (current ?? 0) + 1 : 0
}

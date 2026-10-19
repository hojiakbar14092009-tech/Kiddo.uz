import type { LearnMode } from '@/features/learn/session'
import type { GardenObject } from './game'

/*
 * Help comes in small steps, never all at once:
 * 1. the help button → the mascot says the task again, shortly;
 * 2. after 2 mistakes or ~12 s without progress → a soft hint is offered
 *    (a picture of what to look for);
 * 3. the next step → only one wanted thing gently wiggles and glows
 *    (never all things, nothing flies across the garden).
 * Steps 2 and 3 show the answer's look, so in a test they mark the answer
 * as "with help" (only if it comes before the first answer).
 */

export type HelpLevel = 0 | 1 | 2 | 3

export interface HelpState {
  level: HelpLevel
  /** A soft hint is offered (the child seems stuck). */
  offered: boolean
}

export const HINT_AFTER_MISTAKES = 2
export const HINT_AFTER_MS = 12_000

export const NO_HELP: HelpState = { level: 0, offered: false }

const up = (level: HelpLevel): HelpLevel => Math.min(3, level + 1) as HelpLevel

/** The help button: one step further each time. */
export function pressHelp(state: HelpState): HelpState {
  return { ...state, level: up(state.level) }
}

/** A mistake: after the second one a soft hint is offered. */
export function afterMistake(state: HelpState, mistakes: number): HelpState {
  return mistakes >= HINT_AFTER_MISTAKES ? { ...state, offered: true } : state
}

/** No progress for a while: a soft hint is offered. */
export function afterWait(state: HelpState): HelpState {
  return { ...state, offered: true }
}

/** The child accepts the offered hint: straight to the soft hint (or one step on). */
export function acceptHint(state: HelpState): HelpState {
  return { ...state, level: state.level < 2 ? 2 : up(state.level) }
}

/**
 * Does this step show what the answer looks like or where it is? Then the
 * session notes "helped" (a test counts it only before the first answer).
 */
export function reveals(level: HelpLevel): boolean {
  return level >= 2
}

/** Learning mode shows the offer by itself; a test only lights up the help button. */
export function showsOffer(state: HelpState, mode: LearnMode): boolean {
  return mode === 'learn' && state.offered && state.level < 2
}

/** The one thing that may wiggle: the first wanted thing not yet found (step 3 only). */
export function wiggleKey(
  level: HelpLevel,
  board: readonly GardenObject[],
  found: readonly string[],
): string | null {
  if (level < 3) return null
  return board.find((object) => object.target && !found.includes(object.key))?.key ?? null
}

/*
 * The attention helper's rules (Phase 58), pure so they are tested without a
 * browser. Signals come from attentionSignals.ts (the page left, no touch for a
 * while, the camera seeing the face turn away); this decides what the robot does.
 *
 * - A distraction is counted once: leaving the app for a few seconds, sitting
 *   without a touch on a learning screen, or looking away for a few seconds.
 * - The first one gets a gentle call, the second a warmer one; the third within
 *   five minutes turns into an offer of three short science games (a child that
 *   keeps drifting needs something new, not another reminder).
 * - Never two reminders in a row closer than the pause below.
 */

export type Distraction = 'away' | 'idle' | 'lookAway'

/** What the robot does about a distraction. */
export type AttentionAction =
  | { kind: 'nudge'; level: 1 | 2; cause: Distraction }
  | { kind: 'welcomeBack' }
  | { kind: 'offerGames' }

export interface TrackerState {
  /** When the distractions in the window happened (ms). */
  episodes: number[]
  /** When the robot last said something (ms), or -Infinity. */
  lastActionAt: number
}

/** Distractions counted together. */
export const WINDOW_MS = 5 * 60_000
/** The third distraction in the window brings the games. */
export const OFFER_AT = 3
/** The least time between two reminders. */
export const COOLDOWN_MS = 15_000
/** Leaving the app this long counts (a quick glance at a notification does not). */
export const AWAY_MIN_MS = 2_000
/**
 * Looking away this long counts: two seconds, long enough that a blink or a glance at
 * the parent does not, short enough to catch a drift.
 */
export const LOOK_AWAY_MS = 2_000

/** No touch on a learning screen for this long counts, at every age (four included). */
export const IDLE_MS = 15_000

export function initialTracker(): TrackerState {
  return { episodes: [], lastActionAt: Number.NEGATIVE_INFINITY }
}

/**
 * A distraction happened at `now`. Returns the new state and what the robot
 * should do (nothing while a reminder was just given).
 */
export function noteDistraction(
  state: TrackerState,
  cause: Distraction,
  now: number,
): { state: TrackerState; action: AttentionAction | null } {
  // during the pause after a reminder nothing new is counted: one drift is one drift
  if (now - state.lastActionAt < COOLDOWN_MS) return { state, action: null }
  const episodes = [...state.episodes.filter((at) => now - at < WINDOW_MS), now]
  if (episodes.length >= OFFER_AT) {
    return { state: { episodes: [], lastActionAt: now }, action: { kind: 'offerGames' } }
  }
  // coming back to the app is greeted, not scolded; it still counts towards the games
  const action: AttentionAction =
    cause === 'away'
      ? { kind: 'welcomeBack' }
      : { kind: 'nudge', level: episodes.length >= 2 ? 2 : 1, cause }
  return { state: { episodes, lastActionAt: now }, action }
}

/** The robot's lines take turns, so the same one is never said twice in a row. */
export const LINES = {
  idle: ['idle1', 'idle2', 'idle3'],
  lookAway: ['look1', 'look2', 'look3'],
  again: ['again1', 'again2', 'again3'],
  back: ['back1', 'back2', 'back3'],
} as const

export type LineGroup = keyof typeof LINES

/** The i18n key (under `attention.say`) for an action, turn by turn. */
export function lineFor(action: AttentionAction, turn: number): string {
  if (action.kind === 'offerGames') return 'offer'
  const group: LineGroup =
    action.kind === 'welcomeBack'
      ? 'back'
      : action.level === 2
        ? 'again'
        : action.cause === 'lookAway'
          ? 'lookAway'
          : 'idle'
  const lines = LINES[group]
  return lines[((turn % lines.length) + lines.length) % lines.length]!
}

/** The reminder with the child's own name in front: "Ali! Look here!" (Phase 71). */
export function withName(name: string | null | undefined, line: string): string {
  const clean = name?.trim()
  return clean ? `${clean}! ${line}` : line
}

/** How often the clock ticks while a child area screen is visible. */
export const TICK_MS = 15_000
/** Show the gentle “almost time to rest” note this many minutes before the limit. */
export const WARN_BEFORE_MINUTES = 2
/** How much extra time a parent can give on the rest screen. */
export const EXTRA_MINUTES = 10

export interface ScreenTimeStatus {
  used: number
  limit: number
  remaining: number
  over: boolean
  warn: boolean
}

export function screenTimeStatus(used: number, limit: number, extra: number): ScreenTimeStatus {
  const total = limit + extra
  const remaining = Math.max(0, total - used)
  return {
    used,
    limit: total,
    remaining,
    over: used >= total,
    warn: used < total && remaining <= WARN_BEFORE_MINUTES,
  }
}

/** A game that has started may finish, and its reward may be shown, before the rest screen. */
export function mayFinishHere(pathname: string): boolean {
  return pathname.startsWith('/tasks/') || pathname === '/reward' || pathname === '/exam'
}

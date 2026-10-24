/*
 * "The child went to practise from the garden": kept for this tab only, so
 * the activity's result screen can offer the way back, however the activity
 * moves between its own screens (a tale, a planet lesson). It belongs to the
 * activity it started: other screens never show the way back. It never grows
 * a plant and holds nothing about the child. Expires after two hours.
 */

const KEY = 'kiddo.garden-trip'
const TTL_MS = 2 * 60 * 60 * 1000

interface Trip {
  /** The practice route's path, e.g. `/learn/words`. */
  path: string
  at: number
}

let current: Trip | null = null

function read(): Trip | null {
  if (current) return current
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(KEY) ?? 'null') as Trip | null
    return saved && typeof saved.path === 'string' && typeof saved.at === 'number' ? saved : null
  } catch {
    return null
  }
}

/** Starts a trip to a practice route (`/learn/words?from=garden`). */
export function startGardenTrip(route: string, now: number = Date.now()): void {
  current = { path: route.split('?')[0] ?? route, at: now }
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    // private mode: the trip lives in memory only
  }
}

export function endGardenTrip(): void {
  current = null
  try {
    window.sessionStorage.removeItem(KEY)
  } catch {
    // nothing to clear
  }
}

/**
 * Is this screen part of the practice the garden started? Its own route
 * (and screens under it), or the reward screen of a letter game.
 */
export function isOnGardenTrip(pathname: string, now: number = Date.now()): boolean {
  const trip = read()
  if (!trip || now - trip.at >= TTL_MS) return false
  if (pathname === trip.path || pathname.startsWith(`${trip.path}/`)) return true
  return pathname === '/reward' && trip.path.startsWith('/tasks/')
}

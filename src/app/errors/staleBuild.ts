/*
 * After a new version is deployed, an open tab can ask for a lazily loaded
 * file that no longer exists. The page then reloads once to get the new
 * version; a second failure in the same minute shows the error screen
 * instead of reloading in a loop.
 */

const RELOAD_KEY = 'kiddo.reloadedForUpdate'
const RELOAD_WINDOW_MS = 60_000

const CHUNK_ERROR =
  /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk [\w-]+ failed|ChunkLoadError|Unable to preload CSS/i

/** Is this the error a stale tab gets when a lazily loaded file is gone? */
export function isStaleBuildError(error: unknown): boolean {
  if (!error) return false
  const text =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error)
  return CHUNK_ERROR.test(text)
}

/** When this tab last reloaded for an update (null: not in this session). */
function readLastReload(): number | null {
  try {
    const value = sessionStorage.getItem(RELOAD_KEY)
    return value === null ? null : Number(value)
  } catch {
    return null
  }
}

/** May the page reload for an update now (it has not just done so)? */
export function canReloadForUpdate(now: number = Date.now()): boolean {
  const last = readLastReload()
  return last === null || now - last >= RELOAD_WINDOW_MS
}

let reloading = false

/** Tests only: in a browser the page (and this flag) goes away with the reload. */
export function resetReloadStateForTests() {
  reloading = false
}

/** A reload for the new version has started (the page is about to go away). */
export function isReloadingForUpdate(): boolean {
  return reloading
}

/**
 * Reloads the page once to pick up the new version. Returns false (and does
 * nothing) if it already did so a moment ago, or if it cannot remember that it
 * did (storage blocked): then the caller shows the error page instead of
 * risking an endless reload loop (e.g. while offline).
 */
export function reloadForUpdate(now: number = Date.now()): boolean {
  if (reloading) return true
  if (!canReloadForUpdate(now)) return false
  try {
    sessionStorage.setItem(RELOAD_KEY, String(now))
  } catch {
    return false
  }
  reloading = true
  window.location.reload()
  return true
}

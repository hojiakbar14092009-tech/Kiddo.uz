/**
 * Runs `task` once the browser has a quiet moment after the current work
 * (the page's own content has rendered), or after `timeout` ms at the latest.
 * For optional extras only, never for what the child needs first. Returns a
 * cancel function. Browsers without requestIdleCallback (Safari) wait a short
 * moment instead.
 */
export function onIdle(task: () => void, timeout = 1500): () => void {
  if (typeof window === 'undefined') return () => {}
  if (typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(task, { timeout })
    return () => window.cancelIdleCallback(handle)
  }
  const handle = window.setTimeout(task, FALLBACK_DELAY_MS)
  return () => window.clearTimeout(handle)
}

/** About two frames after the route rendered, where idle callbacks are missing. */
const FALLBACK_DELAY_MS = 200

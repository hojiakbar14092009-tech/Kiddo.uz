import { useEffect, useSyncExternalStore } from 'react'

/*
 * One 3D view at a time: the content wins. While a page shows a 3D model the
 * child came for (the Explorer, a planet, a tale scene, a letter's picture),
 * the decorative robot uses its 2D drawing instead of a second WebGL canvas.
 * Two contexts doubled the GPU work, and the robot's shader compile held the
 * model back (Phase 12 profile). Pure module state, no three.js import.
 */

let active = 0
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** A content 3D view calls this while it is (or is about to be) on the page. */
export function useContent3D(showing: boolean): void {
  useEffect(() => {
    if (!showing) return undefined
    active += 1
    notify()
    return () => {
      active -= 1
      notify()
    }
  }, [showing])
}

/** Is a content 3D view on the page right now? */
export function useContent3DActive(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => active > 0,
    () => false,
  )
}

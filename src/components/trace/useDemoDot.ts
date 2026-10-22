import { useEffect, useState } from 'react'
import type { Point } from './traceScoring'

const SPEED = 45 // box units per second
const PAUSE_MS = 900

/**
 * A dot that walks along `path` (box units) again and again, with a short
 * pause at the end, to show where and which way to draw. Returns null while
 * `active` is false or with reduced motion (the start dot alone shows where
 * to begin then).
 */
export function useDemoDot(path: readonly Point[], active: boolean): Point | null {
  const [dot, setDot] = useState<Point | null>(null)

  useEffect(() => {
    if (!active || path.length < 2 || typeof requestAnimationFrame === 'undefined') return undefined
    let frame = 0
    let started = performance.now()
    const walk = (now: number) => {
      const index = Math.floor(((now - started) / 1000) * SPEED)
      if (index >= path.length) {
        setDot(null)
        if (now - started > (path.length / SPEED) * 1000 + PAUSE_MS) started = now
      } else {
        setDot(path[index] ?? null)
      }
      frame = requestAnimationFrame(walk)
    }
    frame = requestAnimationFrame(walk)
    return () => cancelAnimationFrame(frame)
  }, [active, path])

  return active ? dot : null
}

import { useEffect, useRef, useState } from 'react'
import { countUpConfig } from './countUpConfig'

/** How long a number takes to count up (Phase 54: 0.6–0.8 s). */
export const COUNT_UP_MS = 700

/** A tile that never reports being on screen (hidden, zero size) starts after this. */
const SEEN_FALLBACK_MS = 1500

function reducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/** Fast at first, settling softly on the real number. */
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

/**
 * Whether this number should count up at all: not with reduced motion, not
 * when switched off, and not without IntersectionObserver (very old browsers)
 * – then the real number is shown at once.
 */
function animates(): boolean {
  return !countUpConfig.skip && typeof IntersectionObserver !== 'undefined' && !reducedMotion()
}

/**
 * A number that counts up from 0 the first time its tile comes into view,
 * and from the old value to the new one when it changes later. At rest it is
 * plain text (copies cleanly); while it moves, screen readers get the real
 * number only (a hidden copy), never the frames in between.
 */
export function CountUp({
  value: raw,
  format = (n) => String(Math.round(n)),
  className,
  testId,
}: {
  value: number
  format?: (n: number) => string
  className?: string
  testId?: string
}) {
  const value = Number.isFinite(raw) ? raw : 0
  const element = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState(() => (animates() ? 0 : value))
  const current = useRef(shown)
  const [seen, setSeen] = useState(() => !animates())

  // start once the tile is on screen (or after a while if it never says so)
  useEffect(() => {
    if (seen) return undefined
    const node = element.current
    if (!node) return undefined
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setSeen(true)
        observer.disconnect()
      }
    })
    observer.observe(node)
    const fallback = window.setTimeout(() => setSeen(true), SEEN_FALLBACK_MS)
    return () => {
      observer.disconnect()
      window.clearTimeout(fallback)
    }
  }, [seen])

  useEffect(() => {
    if (!seen) return undefined
    const from = current.current
    if (from === value || countUpConfig.skip || reducedMotion()) {
      current.current = value
      setShown(value)
      return undefined
    }
    let frame = 0
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_UP_MS)
      const next = t >= 1 ? value : from + (value - from) * easeOutCubic(t)
      current.current = next
      setShown(next)
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [seen, value])

  const moving = shown !== value
  return (
    <span ref={element} className={className} data-testid={testId} data-value={value}>
      {moving ? (
        <>
          <span aria-hidden="true">{format(shown)}</span>
          <span className="sr-only">{format(value)}</span>
        </>
      ) : (
        format(value)
      )}
    </span>
  )
}

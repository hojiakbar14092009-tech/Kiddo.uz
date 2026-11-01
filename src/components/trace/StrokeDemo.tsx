import { useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { resample, strokeLength, toSvgPath, type Stroke } from './paths'
import type { Point } from './traceScoring'

/** Box units the finger moves per second (slow enough for a four-year-old to follow). */
const SPEED = 38
/** A short rest after each stroke, and a longer one before it all starts again. */
const STROKE_PAUSE_S = 0.5
const LOOP_PAUSE_S = 1.4

interface Timeline {
  strokes: Point[][]
  starts: number[]
  ends: number[]
  total: number
}

function timeline(strokes: readonly Stroke[]): Timeline {
  const sampled = strokes.map((stroke) => resample(stroke, 1))
  const starts: number[] = []
  const ends: number[] = []
  let at = 0
  for (const stroke of strokes) {
    starts.push(at)
    at += strokeLength(stroke) / SPEED
    ends.push(at)
    at += STROKE_PAUSE_S
  }
  return { strokes: sampled, starts, ends, total: at + LOOP_PAUSE_S }
}

/** The direction a stroke sets off in (degrees), from its resampled points, ~6 units ahead. */
function heading(stroke: readonly Point[]): number {
  const a = stroke[0]
  const b = stroke[Math.min(stroke.length - 1, 6)]
  if (!a || !b) return 0
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
}

/**
 * How a letter is written (Phase 42b): a finger draws each stroke in order,
 * from a numbered start dot, so the child sees where to begin and which way
 * to go – not a letter that simply appears. With reduced motion the strokes
 * stand drawn, each with its number and an arrow.
 */
export function StrokeDemo({
  strokes,
  label,
  className,
}: {
  strokes: readonly Stroke[]
  label: string
  className?: string
}) {
  const reduceMotion = useReducedMotion() ?? false
  const plan = useMemo(() => timeline(strokes), [strokes])
  const [time, setTime] = useState(0)

  useEffect(() => {
    if (reduceMotion || typeof requestAnimationFrame === 'undefined') return undefined
    let frame = 0
    const started = performance.now()
    const tick = (now: number) => {
      setTime(((now - started) / 1000) % plan.total)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [plan, reduceMotion])

  // how much of each stroke is drawn now (0–1)
  const drawn = plan.strokes.map((_, i) => {
    if (reduceMotion) return 1
    const start = plan.starts[i]!
    const end = plan.ends[i]!
    return Math.min(1, Math.max(0, (time - start) / Math.max(0.01, end - start)))
  })
  const active = drawn.findIndex((share) => share > 0 && share < 1)
  const finger = (() => {
    if (reduceMotion || active === -1) return null
    const stroke = plan.strokes[active]!
    return stroke[Math.min(stroke.length - 1, Math.floor(drawn[active]! * (stroke.length - 1)))]
  })()

  return (
    <svg
      viewBox="-6 -6 112 112"
      role="img"
      aria-label={label}
      data-testid="stroke-demo"
      className={className}
    >
      {/* the whole letter as a pale band to follow */}
      {strokes.map((stroke, i) => (
        <path
          key={`band-${i}`}
          d={toSvgPath(stroke)}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={11}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {/* the strokes drawn so far, in the writing colour */}
      {plan.strokes.map((stroke, i) => {
        const share = drawn[i]!
        if (share <= 0) return null
        const part = stroke.slice(0, Math.max(2, Math.ceil(share * stroke.length)))
        return (
          <path
            key={`ink-${i}`}
            d={toSvgPath(part)}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth={7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )
      })}
      {/* a numbered start dot with an arrow for every stroke; a stroke that starts where an
          earlier one did has its number moved a little along its own way (both stay readable),
          and earlier numbers are drawn on top */}
      {[...strokes.keys()].reverse().map((i) => {
        const first = strokes[i]?.[0]
        if (!first) return null
        const sampled = plan.strokes[i] ?? strokes[i]!
        const angle = heading(sampled)
        const shared = strokes
          .slice(0, i)
          .some((other) => other[0] && Math.hypot(other[0].x - first.x, other[0].y - first.y) < 6)
        const start = shared ? (sampled[Math.min(sampled.length - 1, 11)] ?? first) : first
        return (
          <g key={`start-${i}`} data-stroke-start={i + 1}>
            <g transform={`translate(${start.x} ${start.y}) rotate(${angle})`}>
              <path
                d="M 6 -3 L 12 0 L 6 3"
                fill="none"
                stroke="var(--color-primary-ink)"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
            <circle
              cx={start.x}
              cy={start.y}
              r={5.2}
              fill="var(--color-coin)"
              stroke="white"
              strokeWidth={1.2}
            />
            <text
              x={start.x}
              y={start.y + 2.4}
              textAnchor="middle"
              fontSize={7}
              fontWeight={800}
              fill="var(--color-ink)"
            >
              {i + 1}
            </text>
          </g>
        )
      })}
      {/* the finger at the tip of the line being drawn */}
      {finger && (
        <g transform={`translate(${finger.x} ${finger.y})`} data-testid="stroke-finger">
          <circle r={4} fill="var(--color-primary-ink)" opacity={0.25} />
          <text x={-7} y={14} fontSize={16}>
            👆
          </text>
        </g>
      )}
    </svg>
  )
}

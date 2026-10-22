import clsx from 'clsx'
import { motion, useReducedMotion } from 'framer-motion'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { BOX, resample, toSvgPath, type Stroke } from './paths'
import { boardMetrics, guidePoints, scorePath, type PathScore } from './pathScoring'
import { densify, type Point } from './traceScoring'
import { useDemoDot } from './useDemoDot'

const INK_COLOR = '#13917E'
/** The demo dot rests while the child is drawing and comes back after this pause. */
const IDLE_MS = 3500

export interface PathTraceHandle {
  clear: () => void
  score: () => PathScore
  isEmpty: () => boolean
}

interface PathTraceBoardProps {
  strokes: readonly Stroke[]
  /** Accessible name of the drawing area, e.g. "Space to trace the number 7". */
  label: string
  /** Called when a line ends, with the score so far and the score of that line alone. */
  onStrokeEnd: (score: PathScore, line: PathScore) => void
  /** The shape is done: the guide turns into the child's colour. */
  done?: boolean
  className?: string
}

/**
 * A square board with a shape as a pale band to follow: a green start dot
 * where to begin, a small dot walking the path to show the way, and the
 * child's ink on a canvas above it. Touch, pen and mouse all draw (pointer
 * events); only the canvas blocks scrolling (`touch-none`).
 */
export const PathTraceBoard = forwardRef<PathTraceHandle, PathTraceBoardProps>(
  function PathTraceBoard({ strokes, label, onStrokeEnd, done = false, className }, ref) {
    const reduceMotion = useReducedMotion() ?? false
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const drawn = useRef<Point[]>([])
    const lineStart = useRef(0)
    const lastPoint = useRef<Point | null>(null)
    const [size, setSize] = useState(0)
    // the next stroke, for the board size it was measured on (a new size starts over)
    const [progress, setProgress] = useState({ size: 0, current: 0 })
    const [drawing, setDrawing] = useState(false)
    const [idle, setIdle] = useState(true)

    const metrics = boardMetrics(size)
    const guides = useMemo(() => guidePoints(strokes, size), [strokes, size])
    const score = useCallback(
      (points: readonly Point[] = drawn.current) => scorePath(guides, points, metrics.radius),
      [guides, metrics.radius],
    )

    const paint = useCallback(() => {
      const canvas = canvasRef.current
      const context = canvas?.getContext('2d')
      if (!canvas || !context || size === 0) return
      const ratio = window.devicePixelRatio || 1
      canvas.width = size * ratio
      canvas.height = size * ratio
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.clearRect(0, 0, size, size)
    }, [size])

    const reset = useCallback(() => {
      paint()
      drawn.current = []
      lastPoint.current = null
    }, [paint])

    const clear = useCallback(() => {
      reset()
      setProgress({ size, current: 0 })
      setIdle(true)
    }, [reset, size])

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas || typeof ResizeObserver === 'undefined') return undefined
      const observer = new ResizeObserver(([entry]) =>
        setSize(Math.round(entry?.contentRect.width ?? 0)),
      )
      observer.observe(canvas)
      return () => observer.disconnect()
    }, [])

    // a new size (rotation) or a new shape starts with a clean board
    useEffect(reset, [reset, strokes])
    const current = progress.size === size ? progress.current : 0

    useEffect(() => {
      if (drawing || idle) return undefined
      const timer = setTimeout(() => setIdle(true), IDLE_MS)
      return () => clearTimeout(timer)
    }, [drawing, idle])

    useImperativeHandle(
      ref,
      () => ({ clear, score: () => score(), isEmpty: () => drawn.current.length === 0 }),
      [clear, score],
    )

    const currentStroke = strokes[Math.min(current, strokes.length - 1)]
    const demoPath = useMemo(
      () => (currentStroke ? resample(currentStroke, 1) : []),
      [currentStroke],
    )
    const demo = useDemoDot(demoPath, idle && !done && !reduceMotion)
    const start = current < strokes.length ? currentStroke?.[0] : undefined

    const pointFrom = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
      const box = event.currentTarget.getBoundingClientRect()
      return { x: event.clientX - box.left, y: event.clientY - box.top }
    }

    const drawTo = (point: Point) => {
      const context = canvasRef.current?.getContext('2d')
      const from = lastPoint.current ?? point
      if (context) {
        context.strokeStyle = INK_COLOR
        context.lineWidth = metrics.ink
        context.lineCap = 'round'
        context.lineJoin = 'round'
        context.beginPath()
        context.moveTo(from.x, from.y)
        context.lineTo(point.x, point.y)
        context.stroke()
      }
      drawn.current.push(...densify(from, point, 3))
      lastPoint.current = point
    }

    const endLine = () => {
      if (!lastPoint.current) return
      lastPoint.current = null
      setDrawing(false)
      const total = score()
      setProgress({ size, current: total.current })
      onStrokeEnd(total, score(drawn.current.slice(lineStart.current)))
    }

    const unit = size / BOX

    return (
      <motion.div
        className={clsx(
          'relative aspect-square w-full overflow-hidden rounded-panel bg-surface shadow-press-lg',
          className,
        )}
        animate={done && !reduceMotion ? { scale: [1, 1.04, 1] } : undefined}
        transition={{ duration: 0.5 }}
      >
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${BOX} ${BOX}`}
          className="pointer-events-none absolute inset-0 size-full"
        >
          {strokes.map((stroke, index) => (
            <path
              key={`band-${index}`}
              d={toSvgPath(stroke)}
              fill="none"
              stroke={done ? '#BDEBDD' : '#F1E6D2'}
              strokeWidth={unit ? metrics.band / unit : 12}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {strokes.map((stroke, index) => (
            <path
              key={`dash-${index}`}
              d={toSvgPath(stroke)}
              fill="none"
              stroke={index === current ? '#C9B48F' : '#E2D3B8'}
              strokeWidth={1.4}
              strokeDasharray="0.1 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {start && !done && (
            <g>
              {!reduceMotion && (
                <circle cx={start.x} cy={start.y} r={6} fill="#13917E" opacity={0.25}>
                  <animate attributeName="r" values="5;9;5" dur="1.6s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={start.x} cy={start.y} r={4.5} fill="#13917E" />
            </g>
          )}
          {demo && <circle cx={demo.x} cy={demo.y} r={3.2} fill="#FFC93C" stroke="#E0A419" />}
        </svg>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={label}
          data-testid="trace-board"
          className="absolute inset-0 size-full cursor-crosshair touch-none"
          onPointerDown={(event) => {
            if (done) return
            event.currentTarget.setPointerCapture(event.pointerId)
            lastPoint.current = null
            lineStart.current = drawn.current.length
            setDrawing(true)
            setIdle(false)
            drawTo(pointFrom(event))
          }}
          onPointerMove={(event) => {
            if (lastPoint.current) drawTo(pointFrom(event))
          }}
          onPointerUp={endLine}
          onPointerCancel={endLine}
        />
      </motion.div>
    )
  },
)

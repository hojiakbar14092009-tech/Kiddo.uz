import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { densify, scoreTrace, type Point, type TraceScore } from './traceScoring'

const GUIDE_COLOR = '#EADFC9'
const INK_COLOR = '#13917E'
const SAMPLE_STEP = 6

export interface TraceCanvasHandle {
  clear: () => void
  score: () => TraceScore
  /** Nothing has been drawn yet. */
  isEmpty: () => boolean
}

interface TraceCanvasProps {
  /** The letter to trace, e.g. `B` or `Sh`. */
  glyph: string
  label: string
  /** Called when a stroke ends, with the current score. */
  onStrokeEnd: (score: TraceScore) => void
}

const glyphFont = (size: number) => `800 ${size}px Rubik, ui-rounded, sans-serif`

/**
 * A square drawing area with the letter as a pale guide. The child draws over
 * it with a finger; the drawing is compared with the letter’s pixels.
 */
export const TraceCanvas = forwardRef<TraceCanvasHandle, TraceCanvasProps>(function TraceCanvas(
  { glyph, label, onStrokeEnd },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glyphPoints = useRef<Point[]>([])
  const drawn = useRef<Point[]>([])
  const lastPoint = useRef<Point | null>(null)
  const [size, setSize] = useState(0)

  const lineWidth = Math.max(14, size * 0.06)

  const paintGuide = useCallback(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context || size === 0) return

    const ratio = window.devicePixelRatio || 1
    canvas.width = size * ratio
    canvas.height = size * ratio
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.clearRect(0, 0, size, size)

    const fontSize = glyph.length > 1 ? size * 0.52 : size * 0.72
    context.font = glyphFont(fontSize)
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillStyle = GUIDE_COLOR
    context.fillText(glyph, size / 2, size / 2)

    // Sample the guide’s own pixels: that is exactly the shape to follow.
    const pixels = context.getImageData(0, 0, size * ratio, size * ratio).data
    const points: Point[] = []
    for (let y = 0; y < size; y += SAMPLE_STEP) {
      for (let x = 0; x < size; x += SAMPLE_STEP) {
        const alpha =
          pixels[(Math.floor(y * ratio) * size * ratio + Math.floor(x * ratio)) * 4 + 3] ?? 0
        if (alpha > 128) points.push({ x, y })
      }
    }
    glyphPoints.current = points
    drawn.current = []
  }, [glyph, size])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(([entry]) =>
      setSize(Math.round(entry?.contentRect.width ?? 0)),
    )
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  // Wait for the font, so the guide is drawn in Rubik, not a fallback font.
  useEffect(() => {
    let cancelled = false
    const fonts = document.fonts as FontFaceSet | undefined
    void (fonts ? fonts.load(glyphFont(100), glyph) : Promise.resolve()).then(() => {
      if (!cancelled) paintGuide()
    })
    return () => {
      cancelled = true
    }
  }, [glyph, paintGuide])

  useImperativeHandle(
    ref,
    () => ({
      clear: paintGuide,
      score: () => scoreTrace(glyphPoints.current, drawn.current, lineWidth),
      isEmpty: () => drawn.current.length === 0,
    }),
    [lineWidth, paintGuide],
  )

  const pointFrom = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const box = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - box.left, y: event.clientY - box.top }
  }

  const drawTo = (point: Point) => {
    const context = canvasRef.current?.getContext('2d')
    const from = lastPoint.current ?? point
    if (context) {
      context.strokeStyle = INK_COLOR
      context.lineWidth = lineWidth
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

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={label}
      className="aspect-square w-full max-w-[min(440px,80vw)] touch-none rounded-[32px] bg-surface shadow-[0_8px_0_var(--color-line)]"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        lastPoint.current = null
        drawTo(pointFrom(event))
      }}
      onPointerMove={(event) => {
        if (lastPoint.current) drawTo(pointFrom(event))
      }}
      onPointerUp={() => {
        lastPoint.current = null
        onStrokeEnd(scoreTrace(glyphPoints.current, drawn.current, lineWidth))
      }}
      onPointerCancel={() => {
        lastPoint.current = null
      }}
    />
  )
})

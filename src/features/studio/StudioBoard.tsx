import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { newId } from '@/lib/id'
import { backgroundCss, paintSegment, paintStrokes } from './renderStudio'
import { StickerLayer } from './StickerLayer'
import type { PlacedSticker, StudioDoc, StudioPoint, StudioStroke } from './studioDoc'

/** Points closer than this (fraction of the board) are not stored again. */
const MIN_STEP = 0.003

interface StudioBoardProps {
  doc: StudioDoc
  /** The paint for the next line (the eraser has `erase`). */
  pen: Pick<StudioStroke, 'color' | 'size' | 'erase'>
  selected: string | null
  onStroke: (stroke: StudioStroke) => void
  onStickerChange: (sticker: PlacedSticker) => void
  onSelect: (id: string | null) => void
  className?: string
}

/**
 * The drawing board: the background, a canvas with the drawing (transparent,
 * so the eraser never removes the background) and the stickers on top.
 */
export function StudioBoard({
  doc,
  pen,
  selected,
  onStroke,
  onStickerChange,
  onSelect,
  className,
}: StudioBoardProps) {
  const { t } = useTranslation()
  const boxRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const current = useRef<{ pointerId: number; stroke: StudioStroke } | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const box = boxRef.current
    if (!box || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(([entry]) => {
      const rect = entry?.contentRect
      if (rect) setSize({ width: Math.round(rect.width), height: Math.round(rect.height) })
    })
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  // the whole drawing again after a change (undo, redo, clear) or a new size
  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context || size.width === 0) return
    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.round(size.width * ratio)
    canvas.height = Math.round(size.height * ratio)
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    paintStrokes(context, doc.strokes, size.width, size.height)
  }, [doc.strokes, size])

  const pointFrom = (event: React.PointerEvent): StudioPoint => {
    const box = event.currentTarget.getBoundingClientRect()
    return {
      x: Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)),
      y: Math.min(1, Math.max(0, (event.clientY - box.top) / box.height)),
    }
  }

  const paint = (from: StudioPoint, to: StudioPoint) => {
    const context = canvasRef.current?.getContext('2d')
    if (context) paintSegment(context, pen, from, to, size.width, size.height)
  }

  const finish = (event: React.PointerEvent) => {
    const drawing = current.current
    if (!drawing || drawing.pointerId !== event.pointerId) return
    current.current = null
    onStroke(drawing.stroke)
  }

  return (
    <div
      ref={boxRef}
      className={clsx(
        'relative aspect-[4/3] w-full overflow-hidden rounded-panel shadow-press-lg',
        className,
      )}
      style={backgroundCss(doc.background)}
      data-testid="studio-board"
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={t('studio.board')}
        className="absolute inset-0 size-full cursor-crosshair touch-none"
        onPointerDown={(event) => {
          if (current.current) return // a second finger does not draw
          event.currentTarget.setPointerCapture(event.pointerId)
          if (selected) onSelect(null)
          const point = pointFrom(event)
          current.current = {
            pointerId: event.pointerId,
            stroke: { id: newId(), ...pen, points: [point] },
          }
          paint(point, point)
        }}
        onPointerMove={(event) => {
          const drawing = current.current
          if (!drawing || drawing.pointerId !== event.pointerId) return
          const point = pointFrom(event)
          const last = drawing.stroke.points.at(-1) ?? point
          if (Math.hypot(point.x - last.x, point.y - last.y) < MIN_STEP) return
          drawing.stroke.points.push(point)
          paint(last, point)
        }}
        onPointerUp={finish}
        onPointerCancel={finish}
      />
      <StickerLayer
        stickers={doc.stickers}
        selected={selected}
        boardRef={boxRef}
        onChange={onStickerChange}
        onSelect={onSelect}
      />
    </div>
  )
}

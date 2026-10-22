import clsx from 'clsx'
import { useRef, useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { clampSticker, type PlacedSticker } from './studioDoc'

interface Gesture {
  start: PlacedSticker
  /** Pointer positions when the gesture (re)started, in px. */
  origin: Map<number, { x: number; y: number }>
  pointers: Map<number, { x: number; y: number }>
}

const distance = (points: { x: number; y: number }[]) => {
  const [a, b] = points
  return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
}

/**
 * Stickers over the drawing. Tap to choose one, drag to move it, pinch with
 * two fingers to make it bigger or smaller. The change is one undo step,
 * stored when the last finger lifts.
 */
export function StickerLayer({
  stickers,
  selected,
  boardRef,
  onChange,
  onSelect,
}: {
  stickers: readonly PlacedSticker[]
  selected: string | null
  boardRef: RefObject<HTMLDivElement | null>
  onChange: (sticker: PlacedSticker) => void
  onSelect: (id: string | null) => void
}) {
  const { t } = useTranslation()
  const gesture = useRef<Gesture | null>(null)
  const [live, setLive] = useState<PlacedSticker | null>(null)

  const restart = (sticker: PlacedSticker) => {
    const current = gesture.current
    if (!current) return
    current.start = sticker
    current.origin = new Map(current.pointers)
  }

  const move = (event: React.PointerEvent) => {
    const current = gesture.current
    const board = boardRef.current?.getBoundingClientRect()
    if (!current || !board || !current.pointers.has(event.pointerId)) return
    current.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const now = [...current.pointers.values()]
    const before = [...current.origin.values()]
    const centre = (points: { x: number; y: number }[]) => ({
      x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
      y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
    })
    const a = centre(before)
    const b = centre(now)
    const scale = now.length > 1 && distance(before) > 0 ? distance(now) / distance(before) : 1
    setLive(
      clampSticker({
        ...current.start,
        x: current.start.x + (b.x - a.x) / board.width,
        y: current.start.y + (b.y - a.y) / board.height,
        size: current.start.size * scale,
      }),
    )
  }

  const end = (event: React.PointerEvent) => {
    const current = gesture.current
    if (!current) return
    current.pointers.delete(event.pointerId)
    if (current.pointers.size > 0) {
      if (live) restart(live)
      return
    }
    gesture.current = null
    if (live) onChange(live)
    setLive(null)
  }

  return (
    <div className="pointer-events-none absolute inset-0">
      {stickers.map((stored) => {
        const sticker = live?.id === stored.id ? live : stored
        const isSelected = selected === sticker.id
        return (
          <button
            key={sticker.id}
            type="button"
            aria-label={t('studio.placedSticker', { name: t(`studio.stickers.${sticker.name}`) })}
            aria-pressed={isSelected}
            className={clsx(
              'pointer-events-auto absolute aspect-square -translate-x-1/2 -translate-y-1/2 touch-none rounded-tile',
              isSelected && 'outline-4 outline-offset-2 outline-primary outline-dashed',
            )}
            style={{
              left: `${sticker.x * 100}%`,
              top: `${sticker.y * 100}%`,
              width: `${sticker.size * 100}%`,
            }}
            onClick={() => onSelect(sticker.id)}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId)
              onSelect(sticker.id)
              const point = { x: event.clientX, y: event.clientY }
              if (gesture.current && gesture.current.start.id === sticker.id) {
                gesture.current.pointers.set(event.pointerId, point)
                restart(live ?? sticker)
                return
              }
              gesture.current = {
                start: sticker,
                origin: new Map([[event.pointerId, point]]),
                pointers: new Map([[event.pointerId, point]]),
              }
            }}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
          >
            <img
              src={`/3d/${sticker.name}.webp`}
              alt=""
              draggable={false}
              className="pointer-events-none size-full object-contain select-none"
            />
          </button>
        )
      })}
    </div>
  )
}

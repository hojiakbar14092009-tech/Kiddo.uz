import clsx from 'clsx'
import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckIcon, MinusIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import type { MathObject } from '@/features/math/generators'
import { Img3D } from '@/features/learn/Img3D'

/** Moving less than this (px) is a tap, not a drag. */
const DRAG_THRESHOLD = 8

interface Drag {
  id: number
  pointerId: number
  x: number
  y: number
  dx: number
  dy: number
  moved: boolean
}

/**
 * "Put N apples in the basket" for the youngest. Three ways, all equal:
 * - one tap on an object puts it straight into the basket,
 * - drag an object onto the basket (pointer events: finger, mouse and pen),
 * - keyboard: Enter or Space on an object.
 * The minus button takes the last one out again (back to its own place).
 * Nothing is timed; the child says "Done" when ready, and can fix the basket
 * after a mistake.
 *
 * Layout: the basket always sits beside the objects, so a phone (even
 * 320×568) shows both when the question opens and nothing has to be scrolled
 * to. Every object keeps its place (an empty slot stays behind), so the next
 * tap never lands on a picture that moved. Only the objects themselves are
 * `touch-none` (a drag must not scroll the page); the gaps, the prompt and
 * the basket still scroll as usual.
 */
export function BasketTask({
  object,
  available,
  locked,
  onDone,
}: {
  object: MathObject
  available: number
  /** The answer was right: nothing moves any more. */
  locked: boolean
  onDone: (count: number) => void
}) {
  const { t } = useTranslation()
  const [inBasket, setInBasket] = useState<number[]>([])
  const [drag, setDrag] = useState<Drag | null>(null)
  const basketZone = useRef<HTMLDivElement>(null)
  const slots = Array.from({ length: available }, (_, id) => id)

  const put = (id: number) => {
    if (locked) return
    setInBasket((list) => (list.includes(id) ? list : [...list, id]))
  }
  const takeOut = () => {
    if (locked) return
    setInBasket((list) => list.slice(0, -1))
  }

  const overBasket = (x: number, y: number) => {
    const rect = basketZone.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return false
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
  }

  const onPointerDown = (id: number) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (locked || (e.pointerType === 'mouse' && e.button !== 0)) return
    const target = e.currentTarget
    if (typeof target.setPointerCapture === 'function') target.setPointerCapture(e.pointerId)
    setDrag({ id, pointerId: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0, moved: false })
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag || drag.pointerId !== e.pointerId) return
    const dx = e.clientX - drag.x
    const dy = e.clientY - drag.y
    const moved = drag.moved || Math.hypot(dx, dy) > DRAG_THRESHOLD
    setDrag({ ...drag, dx, dy, moved })
  }
  const onPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag || drag.pointerId !== e.pointerId) return
    const { id, moved } = drag
    setDrag(null)
    // a tap puts it in; a drag only when it ends over the basket
    if (!moved || overBasket(e.clientX, e.clientY)) put(id)
  }

  return (
    <div className="flex w-full flex-col items-center gap-3 max-sm:gap-2 short:flex-row short:justify-center short:gap-3">
      <div className="grid w-full max-w-3xl grid-cols-[1fr_auto] items-center gap-3 max-sm:gap-2 short:gap-2">
        <ul
          className="flex min-h-16 flex-wrap content-center justify-center gap-2 rounded-panel bg-surface/70 p-3 max-sm:gap-1.5 max-sm:p-2 short:p-2"
          data-testid="lab-tray"
        >
          {slots.map((id) => {
            if (inBasket.includes(id)) {
              // the object's own place stays, empty, until it comes back
              return (
                <li
                  key={id}
                  aria-hidden="true"
                  className="size-12 rounded-tile border-2 border-dashed border-line-strong sm:size-18 short:size-14"
                />
              )
            }
            const dragging = drag?.id === id && drag.moved
            return (
              <li key={id}>
                <button
                  type="button"
                  aria-label={t('mathLab.pick')}
                  disabled={locked}
                  data-testid="lab-object"
                  onPointerDown={onPointerDown(id)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={() => setDrag(null)}
                  // keyboard (Enter / Space) has no pointer: it puts it in like a tap
                  onClick={(e) => e.detail === 0 && put(id)}
                  style={
                    dragging ? { transform: `translate(${drag.dx}px, ${drag.dy}px)` } : undefined
                  }
                  className={clsx(
                    'relative flex size-12 touch-none items-center justify-center rounded-tile bg-white shadow-press-sm select-none sm:size-18 short:size-14',
                    dragging && 'z-10 scale-110 shadow-press-lg',
                  )}
                >
                  <Img3D name={object} className="size-[80%]" eager />
                </button>
              </li>
            )
          })}
        </ul>

        <div
          ref={basketZone}
          className={clsx(
            'flex items-center justify-center gap-2 rounded-panel border-4 border-dashed p-2 transition-colors max-sm:flex-col max-sm:p-1.5',
            drag?.moved ? 'border-coin bg-coin-soft' : 'border-line-strong',
          )}
        >
          <div
            role="img"
            aria-label={t('mathLab.basket', { count: inBasket.length })}
            data-testid="lab-basket"
            data-count={inBasket.length}
            className="relative flex min-h-28 min-w-36 flex-col items-center justify-end max-sm:min-h-24 max-sm:min-w-20 short:min-h-20 short:min-w-28"
          >
            <span
              className="flex max-w-36 flex-wrap justify-center gap-0.5 max-sm:max-w-20"
              aria-hidden="true"
            >
              {inBasket.map((id) => (
                <Img3D key={id} name={object} className="size-7 max-sm:size-4 short:size-6" eager />
              ))}
            </span>
            <Img3D name="basket" className="-mt-2 size-20 max-sm:size-16 short:size-14" eager />
            <span
              aria-hidden="true"
              className="absolute -top-2 -right-2 flex size-10 items-center justify-center rounded-full bg-primary font-display text-xl font-extrabold text-white tabular-nums max-sm:size-9 max-sm:text-lg"
            >
              {inBasket.length}
            </span>
          </div>
          <button
            type="button"
            onClick={takeOut}
            disabled={locked || inBasket.length === 0}
            aria-label={t('mathLab.takeOut')}
            data-testid="lab-take-out"
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-surface text-ink shadow-press transition-transform active:translate-y-1 disabled:opacity-40 max-sm:size-12"
          >
            <MinusIcon size={28} />
          </button>
        </div>
      </div>

      <Button
        size="md"
        icon={<CheckIcon size={24} />}
        disabled={locked || inBasket.length === 0}
        onClick={() => onDone(inBasket.length)}
        data-testid="lab-done"
      >
        {t('mathLab.done')}
      </Button>
    </div>
  )
}

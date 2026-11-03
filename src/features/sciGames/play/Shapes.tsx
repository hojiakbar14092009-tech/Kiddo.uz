import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { tDynamic } from '@/lib/tDynamic'
import { useLater, useLine, type Finish } from './hooks'
import { Line } from './kit'
import { ShapeScene } from './ShapeScene'
import { SHAPE_KINDS, SHAPE_PICTURES, shapePath, type ShapeKind, type Slot } from './shapeRules'

/** The tray's own little shape icons. */
const ICON: Record<ShapeKind, Slot> = {
  circle: { kind: 'circle', x: 50, y: 50, size: 70, colour: '#ffc93c' },
  square: { kind: 'square', x: 50, y: 50, size: 64, colour: '#ff8a4c' },
  triangle: { kind: 'triangle', x: 50, y: 50, size: 74, colour: '#d93d78' },
  rectangle: { kind: 'rectangle', x: 50, y: 50, size: 34, colour: '#2f7fc4' },
}

function transform(slot: Slot) {
  return slot.rotate ? `rotate(${slot.rotate} ${slot.x} ${slot.y})` : undefined
}

/**
 * The shape builder (Phase 67): a picture (a house, a tree, a car, a rocket) in
 * dashed outlines; the outline to fill next glows, and the child taps its shape
 * in the tray. A right shape pops into place in colour; when all are in, the
 * picture comes alive. A picture counts as first-try without a wrong shape.
 */
export function ShapeBuilder({ onDone }: { onDone: Finish }) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion() ?? false
  const { line, say } = useLine()
  const later = useLater()
  const [index, setIndex] = useState(0)
  const [filled, setFilled] = useState(0)
  const [missed, setMissed] = useState(false)
  const [firstTry, setFirstTry] = useState(0)
  /** Slots filled as of the last tap (two taps in one frame see each other). */
  const done = useRef(0)
  const picture = SHAPE_PICTURES[index]!
  const complete = filled >= picture.slots.length

  useEffect(() => {
    say(t('sciGames.shapes.say.start'))
  }, [index, say, t])

  const tap = (kind: ShapeKind) => {
    const slot = picture.slots[done.current]
    if (!slot) return
    if (slot.kind !== kind) {
      setMissed(true)
      say(tDynamic(t, `sciGames.shapes.need.${slot.kind}`))
      return
    }
    done.current += 1
    setFilled(done.current)
    if (done.current < picture.slots.length) return
    const score = firstTry + (missed ? 0 : 1)
    setFirstTry(score)
    say(tDynamic(t, `sciGames.shapes.made.${picture.id}`))
    later(() => {
      if (index + 1 < SHAPE_PICTURES.length) {
        done.current = 0
        setFilled(0)
        setMissed(false)
        setIndex(index + 1)
      } else {
        say(t('sciGames.shapes.say.done'))
        later(() => onDone(SHAPE_PICTURES.length, score), 1400)
      }
    }, 3600)
  }

  return (
    <section className="flex w-full max-w-xl flex-col items-center gap-4" data-testid="sci-shapes">
      <p className="text-base font-semibold text-ink-soft tabular-nums">
        {t('sciGames.shapes.round', { n: index + 1, total: SHAPE_PICTURES.length })}
      </p>
      <div className="relative aspect-square w-full max-w-[17rem] short:max-w-[11rem]">
        <motion.svg
          key={index}
          viewBox="0 0 100 105"
          className="size-full rounded-[2rem] bg-surface p-3 shadow-[0_6px_0_var(--color-line)]"
          initial={reduceMotion ? false : { scale: 0.85, opacity: 0 }}
          animate={
            complete && !reduceMotion
              ? { scale: [1, 1.08, 1], rotate: [0, -3, 3, 0] }
              : { scale: 1, opacity: 1 }
          }
          transition={{ duration: 0.8 }}
          role="img"
          aria-label={tDynamic(t, `sciGames.shapes.pictures.${picture.id}`)}
          data-testid="shape-picture"
          data-filled={filled}
        >
          {picture.slots.map((slot, slotIndex) => {
            const isFilled = slotIndex < filled
            const isNext = slotIndex === filled
            return (
              <g key={slotIndex} transform={transform(slot)}>
                {!isFilled && (
                  <motion.path
                    d={shapePath(slot)}
                    fill="none"
                    stroke={isNext ? '#13917e' : '#c8bfa9'}
                    strokeWidth={isNext ? 2.2 : 1.4}
                    strokeDasharray="4 3"
                    animate={isNext && !reduceMotion ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
                    transition={{ duration: 1.2, repeat: isNext ? Infinity : 0 }}
                  />
                )}
                <AnimatePresence>
                  {isFilled && (
                    <motion.path
                      d={shapePath(slot)}
                      fill={slot.colour}
                      stroke="#3a2e4d"
                      strokeWidth={1}
                      initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      style={{
                        transformOrigin: `${slot.x}px ${slot.y}px`,
                        transformBox: 'view-box',
                        filter: 'drop-shadow(0 1.5px 0 rgba(58, 46, 77, 0.35))',
                      }}
                      transition={{ type: 'spring', stiffness: 300, damping: 14 }}
                    />
                  )}
                </AnimatePresence>
              </g>
            )
          })}
        </motion.svg>
        {/* the plan grows into the real thing; the child's shapes stay in the corner */}
        <AnimatePresence>
          {complete && <ShapeScene key={picture.id} id={picture.id} />}
        </AnimatePresence>
        {complete && (
          <svg
            viewBox="0 0 100 105"
            className="absolute top-2 left-2 size-[30%] rounded-2xl bg-surface/90 p-1 shadow"
            aria-hidden="true"
          >
            {picture.slots.map((slot, slotIndex) => (
              <path
                key={slotIndex}
                d={shapePath(slot)}
                transform={transform(slot)}
                fill={slot.colour}
                stroke="#3a2e4d"
                strokeWidth={1}
              />
            ))}
          </svg>
        )}
      </div>

      {/* the tray */}
      <div className="grid w-full max-w-sm grid-cols-4 gap-2">
        {SHAPE_KINDS.map((kind) => (
          <motion.button
            key={kind}
            type="button"
            onClick={() => tap(kind)}
            disabled={complete}
            aria-label={tDynamic(t, `sciGames.shapes.kinds.${kind}`)}
            data-testid={`shape-${kind}`}
            className="flex aspect-square min-h-11 items-center justify-center rounded-2xl bg-surface p-2 shadow-[0_5px_0_var(--color-line)] transition-transform active:translate-y-1 active:shadow-none disabled:opacity-50"
          >
            <svg viewBox="0 0 100 100" className="size-full" aria-hidden="true">
              <path d={shapePath(ICON[kind])} fill={ICON[kind].colour} />
            </svg>
          </motion.button>
        ))}
      </div>
      <Line text={line} />
    </section>
  )
}

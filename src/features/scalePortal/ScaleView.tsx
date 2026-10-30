import clsx from 'clsx'
import { motion, useMotionValueEvent, useTransform, type MotionValue } from 'framer-motion'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ScaleDetail } from '@/domain/adaptive'
import { tDynamic } from '@/lib/tDynamic'
import { sizeText } from './describe'
import { SCALE_DRAWINGS } from './drawings'
import { railOf, viewOf } from './camera'
import { frameOf, magnitude, SCALE_STOPS, VIEW_MAX, VIEW_MIN, type ScaleStop } from './scales'

/*
 * The continuous scale journey (Phase 33): one camera, `z` = how many metres
 * (log10) the view spans. Every stop is drawn at its true size for that
 * camera, so zooming out lets the last place shrink to a dot inside the next
 * one — a spatial comparison, not a slideshow. 2D vector only (no WebGL
 * context to leak); the only loop is framer-motion's tween, stopped on leave.
 */

/** Smallest and largest drawn size, as a share of the view's width. */
const DOT = 0.004
const TOO_BIG = 2.6
/**
 * Below this share a place is too small to see: it is drawn at its true size
 * (never enlarged) and a "here" ring of fixed size marks where it is.
 */
const SPECK = 0.03

function StopLayer({ stop, z }: { stop: ScaleStop; z: MotionValue<number> }) {
  const size = magnitude(stop.sizeM)
  const scale = useTransform(z, (view) => Math.min(TOO_BIG * 1.2, 10 ** (size - view)))
  // a tiny object stays a visible dot for a moment, then fades; a huge one fades as it fills the view
  const opacity = useTransform(z, (view) => {
    const share = 10 ** (size - view)
    if (share < DOT / 25) return 0
    if (share < DOT) return (share - DOT / 25) / (DOT - DOT / 25)
    if (share > TOO_BIG) return 0
    if (share > TOO_BIG / 2) return 1 - (share - TOO_BIG / 2) / (TOO_BIG / 2)
    return 1
  })
  // layers out of sight are not drawn at all
  const display = useTransform(opacity, (value) => (value <= 0 ? 'none' : 'block'))
  // the marker ring: shown only while the place is a speck, at a fixed size (not the object)
  const ring = useTransform(z, (view) => {
    const share = 10 ** (size - view)
    if (share >= SPECK || share < DOT / 25) return 0
    return share < DOT ? (share - DOT / 25) / (DOT - DOT / 25) : 1
  })
  const ringDisplay = useTransform(ring, (value) => (value <= 0 ? 'none' : 'block'))
  return (
    <>
      <motion.svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        data-stop-layer={stop.id}
        className="pointer-events-none absolute top-1/2 left-1/2 w-full -translate-1/2 overflow-visible"
        style={{ scale, opacity, display }}
      >
        {SCALE_DRAWINGS[stop.id]}
      </motion.svg>
      <motion.span
        aria-hidden="true"
        data-speck-ring={stop.id}
        className="pointer-events-none absolute top-1/2 left-1/2 size-[9%] -translate-1/2 rounded-full border-2 border-dashed border-[#FFC23D]"
        style={{ opacity: ring, display: ringDisplay }}
      />
    </>
  )
}

/** Night falls as the camera leaves Earth's sky. */
function useSky(z: MotionValue<number>) {
  const earth = magnitude(SCALE_STOPS.find((stop) => stop.id === 'earth')!.sizeM)
  return useTransform(
    z,
    [VIEW_MIN, earth - 2.5, earth - 0.5, VIEW_MAX],
    ['#EAF4FF', '#CFE6FF', '#141C46', '#070B22'],
  )
}

export function ScaleView({
  z,
  detail,
  language,
  explore,
}: {
  z: MotionValue<number>
  detail: ScaleDetail
  language: string
  /** The rail moves the camera freely (exploration); otherwise it only shows where we are. */
  explore: boolean
}) {
  const { t } = useTranslation()
  const sky = useSky(z)
  const [view, setView] = useState(() => z.get())
  // the rail's own position (0 … stops − 1): every keyboard step moves it, however small
  const [rail, setRail] = useState(() => railOf(z.get()))
  // the rail follows the camera in small steps (cheap re-renders)
  useMotionValueEvent(z, 'change', (value) => {
    const rounded = Math.round(value * 20) / 20
    setView((previous) => (previous === rounded ? previous : rounded))
    const position = Math.round(railOf(value) * 100) / 100
    setRail((previous) => (previous === position ? previous : position))
  })
  const nearest = SCALE_STOPS.reduce((best, stop) =>
    Math.abs(frameOf(stop) - view) < Math.abs(frameOf(best) - view) ? stop : best,
  )
  const name = (stop: ScaleStop) => tDynamic(t, `scalePortal.stops.${stop.id}.name`)
  const last = SCALE_STOPS.length - 1

  return (
    <div className="flex w-full flex-col gap-3">
      <motion.div
        className="relative aspect-[4/3] w-full overflow-hidden rounded-card shadow-press sm:aspect-[16/9]"
        style={{ backgroundColor: sky }}
        data-testid="scale-stage"
        data-nearest={nearest.id}
        role="img"
        aria-label={t('scalePortal.stageLabel', { name: name(nearest) })}
      >
        {/* the stage is drawn in its middle half, so a whole object fits with room around it */}
        <div className="absolute top-1/2 left-1/2 aspect-square w-[46%] -translate-1/2">
          {/* biggest first: a smaller place sits on top, inside the bigger one */}
          {[...SCALE_STOPS].reverse().map((stop) => (
            <StopLayer key={stop.id} stop={stop} z={z} />
          ))}
        </div>
      </motion.div>

      <div className="flex flex-col gap-1" data-testid="scale-rail" data-detail={detail}>
        <div className="relative h-12">
          <input
            type="range"
            min={0}
            max={last}
            step={0.05}
            value={rail}
            disabled={!explore}
            onChange={(event) => {
              const position = Number(event.target.value)
              setRail(position)
              z.set(viewOf(position))
            }}
            aria-label={t('scalePortal.rail')}
            aria-valuetext={name(nearest)}
            className="scale-rail absolute inset-x-0 top-1/2 h-11 w-full -translate-y-1/2 disabled:cursor-default"
          />
        </div>
        {/* the stops, evenly spaced: the rail is a path through places, not a ruler */}
        <ol className="relative h-8" aria-hidden="true">
          {SCALE_STOPS.map((stop, index) => (
            <li
              key={stop.id}
              className="absolute top-0 -translate-x-1/2"
              style={{ left: `${(index / last) * 100}%` }}
              data-rail-stop={stop.id}
              data-here={stop.id === nearest.id || undefined}
            >
              <svg
                viewBox="0 0 100 100"
                className={clsx(
                  'size-6 rounded-full transition-transform sm:size-7',
                  stop.id === nearest.id ? 'scale-125' : 'opacity-60',
                )}
              >
                {SCALE_DRAWINGS[stop.id]}
              </svg>
            </li>
          ))}
        </ol>
        <div className="flex justify-between text-sm font-semibold text-ink-soft">
          <span>{t('scalePortal.small')}</span>
          {detail !== 'compare' && (
            <span className="text-center tabular-nums" data-testid="scale-size">
              {t('scalePortal.sizeNow', { size: sizeText(t, nearest, detail, language) })}
            </span>
          )}
          <span>{t('scalePortal.big')}</span>
        </div>
      </div>
    </div>
  )
}

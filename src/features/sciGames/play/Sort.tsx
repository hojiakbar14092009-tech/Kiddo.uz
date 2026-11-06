import clsx from 'clsx'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Img3D } from '@/components/ui/Img3D'
import { tDynamic } from '@/lib/tDynamic'
import { useAfterSaid, useLine, type Finish } from './hooks'
import { Line } from './kit'
import { belongs, type SortSet } from './sortRules'

const BIN_TONE = ['bg-primary-soft', 'bg-sky-soft', 'bg-coin-soft', 'bg-lilac-soft']

/**
 * A sorting game (Phase 67): one thing at a time comes in; the child taps the
 * place it belongs to. The right place swallows it with a bounce; a wrong one
 * shakes and the robot gives a hint. "Who lives where?" and "The healthy plate".
 * A thing counts as first-try when its first tap was right.
 */
export function SortGame({
  set,
  game,
  onDone,
}: {
  set: SortSet
  /** Its words: `sciGames.<game>…` (bins, items, lines). */
  game: 'habitats' | 'plate'
  onDone: Finish
}) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion() ?? false
  const { line, say } = useLine()
  // the next round waits for the line just said to be heard
  const later = useAfterSaid()
  const [index, setIndex] = useState(0)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [shake, setShake] = useState<{ bin: string; n: number } | null>(null)
  const [missed, setMissed] = useState(false)
  const [firstTry, setFirstTry] = useState(0)
  const [flying, setFlying] = useState<string | null>(null)
  /** The thing already placed (two taps in one frame place it once). */
  const placed = useRef(-1)
  const item = set.items[index]
  const total = set.items.length

  useEffect(() => {
    if (index === 0) say(tDynamic(t, `sciGames.${game}.say.start`))
  }, [game, index, say, t])

  const pick = (bin: string) => {
    if (!item || placed.current === index) return
    if (!belongs(item, bin)) {
      setMissed(true)
      setShake((current) => ({ bin, n: (current?.n ?? 0) + 1 }))
      say(tDynamic(t, `sciGames.${game}.hint.${item.bin}`))
      return
    }
    placed.current = index
    setFlying(bin)
    const score = firstTry + (missed ? 0 : 1)
    setFirstTry(score)
    say(tDynamic(t, `sciGames.${game}.say.right`))
    later(() => {
      setCounts((current) => ({ ...current, [bin]: (current[bin] ?? 0) + 1 }))
      setFlying(null)
      setMissed(false)
      if (index + 1 < total) setIndex(index + 1)
      else {
        setIndex(total)
        say(tDynamic(t, `sciGames.${game}.say.done`))
        later(() => onDone(total, score), 1400)
      }
    }, 900)
  }

  return (
    <section
      className="flex w-full max-w-xl flex-col items-center gap-4"
      data-testid={`sci-${game}`}
    >
      <p className="text-base font-semibold text-ink-soft tabular-nums">
        {t('sciGames.sortCount', { n: Math.min(index + 1, total), total })}
      </p>

      {/* the thing to place */}
      <div className="relative flex h-40 w-full items-center justify-center short:h-28">
        <AnimatePresence mode="popLayout">
          {item && (
            <motion.div
              key={item.id}
              initial={
                reduceMotion ? { opacity: 0 } : { y: -60, scale: 0.4, rotate: -12, opacity: 0 }
              }
              animate={
                flying
                  ? {
                      y: 120,
                      scale: 0.3,
                      opacity: 0,
                      transition: { duration: 0.6, ease: 'easeIn' },
                    }
                  : { y: 0, scale: 1, rotate: 0, opacity: 1 }
              }
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 13 }}
              className="flex size-36 items-center justify-center rounded-full bg-surface shadow-[0_8px_0_var(--color-line)] short:size-24"
              data-testid="sort-item"
              data-item={item.id}
            >
              <Img3D name={item.picture} className="size-[76%]" eager />
            </motion.div>
          )}
        </AnimatePresence>
        {item && (
          <span className="sr-only" aria-live="polite">
            {tDynamic(t, `sciGames.${game}.items.${item.id}`)}
          </span>
        )}
      </div>

      {/* the places */}
      <ul
        className={clsx(
          'grid w-full gap-3',
          set.bins.length > 2 ? 'grid-cols-2' : 'grid-cols-2 max-w-sm',
        )}
      >
        {set.bins.map((bin, binIndex) => (
          <li key={bin.id}>
            <motion.button
              key={shake?.bin === bin.id ? shake.n : 0}
              type="button"
              onClick={() => pick(bin.id)}
              disabled={!item || flying !== null}
              data-testid={`bin-${bin.id}`}
              animate={
                shake?.bin === bin.id && !reduceMotion
                  ? { x: [0, -10, 10, -6, 6, 0] }
                  : flying === bin.id && !reduceMotion
                    ? { scale: [1, 1.08, 1] }
                    : {}
              }
              transition={{ duration: 0.45 }}
              className={clsx(
                'relative flex min-h-32 w-full flex-col items-center justify-center gap-1 rounded-[1.75rem] p-3 font-display text-lg leading-tight font-bold shadow-[0_6px_0_var(--color-line)] short:min-h-24',
                BIN_TONE[binIndex % BIN_TONE.length],
              )}
            >
              <Img3D name={bin.picture} className="size-14 short:size-10" eager />
              {tDynamic(t, `sciGames.${game}.bins.${bin.id}`)}
              {(counts[bin.id] ?? 0) > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute top-2 right-3 rounded-full bg-surface px-2 text-sm tabular-nums"
                >
                  {counts[bin.id]}
                </span>
              )}
            </motion.button>
          </li>
        ))}
      </ul>
      <Line text={line} />
    </section>
  )
}

import clsx from 'clsx'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { tDynamic } from '@/lib/tDynamic'
import { useAfterSaid, useLine, type Finish } from './hooks'
import { Line } from './kit'
import { IRON_COUNT, MAGNET_THINGS, type MagnetThing } from '../rules'

// ---------------------------------------------------------------------------
// The magic magnet: tap a thing; iron jumps up and sticks
// ---------------------------------------------------------------------------

export function MagicMagnet({ onDone }: { onDone: Finish }) {
  const { t } = useTranslation()
  const { line, say } = useLine()
  const [stuck, setStuck] = useState<MagnetThing[]>([])
  const [tried, setTried] = useState<MagnetThing[]>([])
  const [wiggle, setWiggle] = useState<{ id: MagnetThing; n: number } | null>(null)
  const [wrong, setWrong] = useState(0)

  // the next round waits for the line just said to be heard
  const later = useAfterSaid()
  /** What already sticks, as of the last tap (two taps in one frame see each other). */
  const stuckNow = useRef<MagnetThing[]>([])
  const reduceMotion = useReducedMotion() ?? false

  useEffect(() => {
    say(t('sciGames.magnet.say.start'))
  }, [say, t])

  const tap = (id: MagnetThing, iron: boolean) => {
    if (stuckNow.current.includes(id) || stuckNow.current.length === IRON_COUNT) return
    if (!iron) {
      if (!tried.includes(id)) {
        setTried((list) => [...list, id])
        setWrong((count) => count + 1)
      }
      setWiggle((current) => ({ id, n: (current?.n ?? 0) + 1 }))
      say(t('sciGames.magnet.say.nope'))
      return
    }
    const next = [...stuckNow.current, id]
    stuckNow.current = next
    setStuck(next)
    if (next.length === IRON_COUNT) {
      say(t('sciGames.magnet.say.done'))
      later(() => onDone(IRON_COUNT, IRON_COUNT - Math.min(wrong, IRON_COUNT)), 1600)
    } else say(t('sciGames.magnet.say.stick'))
  }

  return (
    <section className="flex w-full max-w-xl flex-col items-center gap-3" data-testid="sci-magnet">
      {/* the magnet with the iron things hanging from it */}
      <div className="relative flex min-h-36 w-full flex-col items-center rounded-[2rem] bg-surface/70 pt-3 shadow-[0_6px_0_var(--color-line)]">
        <motion.span
          aria-hidden="true"
          className="text-7xl leading-none"
          animate={reduceMotion ? {} : { rotate: [-6, 6, -6] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        >
          🧲
        </motion.span>
        <div className="flex min-h-14 flex-wrap justify-center gap-1 pb-3">
          {stuck.map((id) => (
            <motion.span
              key={id}
              layoutId={`magnet-${id}`}
              aria-hidden="true"
              className="text-4xl"
              transition={{ type: 'spring', stiffness: 260, damping: 16 }}
            >
              {MAGNET_THINGS.find((thing) => thing.id === id)!.emoji}
            </motion.span>
          ))}
        </div>
      </div>
      <p className="text-base font-semibold text-ink-soft tabular-nums">
        {t('sciGames.magnet.found', { n: stuck.length, total: IRON_COUNT })}
      </p>
      <ul className="grid w-full grid-cols-4 gap-2 sm:gap-3">
        {MAGNET_THINGS.map((thing) => {
          const isStuck = stuck.includes(thing.id)
          return (
            <li key={thing.id}>
              <button
                type="button"
                onClick={() => tap(thing.id, thing.iron)}
                disabled={isStuck}
                aria-label={tDynamic(t, `sciGames.magnet.things.${thing.id}`)}
                data-testid={`magnet-${thing.id}`}
                className={clsx(
                  'flex aspect-square w-full min-h-11 items-center justify-center rounded-3xl bg-surface shadow-[0_5px_0_var(--color-line)] transition-transform active:translate-y-1 active:shadow-none',
                  isStuck && 'opacity-30',
                  tried.includes(thing.id) && 'bg-muted',
                )}
              >
                {!isStuck && (
                  <motion.span
                    key={wiggle?.id === thing.id ? wiggle.n : 0}
                    layoutId={`magnet-${thing.id}`}
                    aria-hidden="true"
                    className="text-[length:min(11vw,3rem)] leading-none"
                    animate={wiggle?.id === thing.id ? { x: [0, -8, 8, -5, 5, 0] } : {}}
                    transition={{ duration: 0.45 }}
                  >
                    {thing.emoji}
                  </motion.span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      <Line text={line} />
    </section>
  )
}

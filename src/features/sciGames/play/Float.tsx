import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { tDynamic } from '@/lib/tDynamic'
import { useAfterSaid, useLine, type Finish } from './hooks'
import { Line } from './kit'
import { FLOAT_THINGS } from '../rules'

// ---------------------------------------------------------------------------
// Float or sink: guess first, then watch it in the water
// ---------------------------------------------------------------------------

export function FloatOrSink({ onDone }: { onDone: Finish }) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion() ?? false
  const { line, say } = useLine()
  const [index, setIndex] = useState(0)
  const [guess, setGuess] = useState<boolean | null>(null)
  const [right, setRight] = useState(0)
  const thing = FLOAT_THINGS[index]!
  const total = FLOAT_THINGS.length

  // the next round waits for the line just said to be heard
  const later = useAfterSaid()
  /** The round already answered (two taps in one frame answer it once). */
  const answered = useRef(-1)

  useEffect(() => {
    say(t('sciGames.float.say.ask'))
  }, [index, say, t])

  const choose = (floats: boolean) => {
    if (guess !== null || answered.current === index) return
    answered.current = index
    setGuess(floats)
    const correct = floats === thing.floats
    const score = right + (correct ? 1 : 0)
    setRight(score)
    say(
      tDynamic(
        t,
        `sciGames.float.say.${correct ? 'right' : 'wrong'}${thing.floats ? 'Float' : 'Sink'}`,
      ),
    )
    later(() => {
      if (index + 1 < total) {
        setIndex(index + 1)
        setGuess(null)
      } else {
        say(t('sciGames.float.say.done'))
        later(() => onDone(total, score), 1400)
      }
    }, 2200)
  }

  const dropped = guess !== null
  return (
    <section className="flex w-full max-w-xl flex-col items-center gap-3" data-testid="sci-float">
      <p className="text-base font-semibold text-ink-soft tabular-nums">
        {t('sciGames.float.score', { n: index + 1, total })}
      </p>
      <div className="relative h-64 w-full max-w-sm overflow-hidden rounded-[2rem] bg-surface/60 shadow-[0_6px_0_var(--color-line)] short:h-48">
        {/* the water tank */}
        <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-b from-[#7fc6f2] to-[#2f7fc4]">
          <motion.div
            aria-hidden="true"
            className="absolute inset-x-0 -top-2 h-4 rounded-[50%] bg-[#a8dcfa]"
            animate={reduceMotion ? {} : { scaleX: [1, 1.04, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
        <motion.span
          key={thing.id}
          aria-hidden="true"
          className="absolute left-1/2 text-6xl leading-none"
          initial={{ top: '4%', x: '-50%', rotate: 0 }}
          animate={
            dropped
              ? thing.floats
                ? { top: ['4%', '42%', '30%', '33%'], rotate: [0, 8, -6, 0] }
                : { top: ['4%', '42%', '78%'], rotate: [0, 12, 20] }
              : reduceMotion
                ? { top: '4%' }
                : { top: '4%', rotate: [0, -4, 4, 0] }
          }
          transition={
            dropped ? { duration: 1.6, ease: 'easeOut' } : { duration: 2, repeat: Infinity }
          }
          data-testid={`float-${thing.id}`}
        >
          {thing.emoji}
        </motion.span>
      </div>
      <p className="font-display text-2xl font-extrabold">
        {tDynamic(t, `sciGames.float.things.${thing.id}`)}
      </p>
      <div className="grid w-full max-w-sm grid-cols-2 gap-3">
        <Button
          size="md"
          onClick={() => choose(true)}
          disabled={dropped}
          data-testid="float-guess-float"
        >
          <span aria-hidden="true">🛟</span> {t('sciGames.float.floats')}
        </Button>
        <Button
          size="md"
          variant="oops"
          onClick={() => choose(false)}
          disabled={dropped}
          data-testid="float-guess-sink"
        >
          <span aria-hidden="true">⚓</span> {t('sciGames.float.sinks')}
        </Button>
      </div>
      <Line text={line} />
    </section>
  )
}

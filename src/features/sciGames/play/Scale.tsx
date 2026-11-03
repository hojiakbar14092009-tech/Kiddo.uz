import clsx from 'clsx'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Img3D } from '@/components/ui/Img3D'
import { RewardBurst } from '@/components/ui/RewardBurst'
import { useLater, useLine, type Finish } from './hooks'
import { Line } from './kit'
import { balance, SCALE_ROUNDS, tilt, total, WEIGHTS, type Weight } from './scaleRules'

/** One block of the right pan, with its own id so the same weight can be there twice. */
interface Block {
  key: number
  weight: Weight
}

const BLOCK_TONE: Record<Weight, string> = {
  1: 'bg-sky text-white shadow-[0_4px_0_#4a9ad6]',
  2: 'bg-primary text-white shadow-[0_4px_0_var(--color-primary-shadow)]',
  3: 'bg-oops text-white shadow-[0_4px_0_#d96a30]',
}

/** A number block: the digit and that many dots. */
function BlockFace({ weight }: { weight: Weight }) {
  return (
    <span className="flex flex-col items-center leading-none">
      <span className="font-display text-2xl font-extrabold">{weight}</span>
      <span aria-hidden="true" className="mt-0.5 flex gap-0.5">
        {Array.from({ length: weight }, (_, i) => (
          <span key={i} className="size-1.5 rounded-full bg-white/90" />
        ))}
      </span>
    </span>
  )
}

/**
 * The magic scale (Phase 65): the apples on the left pan, number blocks for the
 * right one. The beam leans while the sides differ and levels out, with a little
 * burst, when they weigh the same. A round counts as first-try when the child
 * never put on too much.
 */
export function MagicScale({ onDone }: { onDone: Finish }) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion() ?? false
  const { line, say } = useLine()
  const later = useLater()
  const [round, setRound] = useState(0)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [over, setOver] = useState(false)
  const [firstTry, setFirstTry] = useState(0)
  const nextKey = useRef(0)
  /** The round already won (two taps in one frame win it once). */
  const won = useRef(-1)
  const target = SCALE_ROUNDS[round]!
  const weights = blocks.map((block) => block.weight)
  const state = balance(target, weights)
  const lean = tilt(target, weights)

  useEffect(() => {
    say(t('sciGames.scale.say.start'))
  }, [round, say, t])

  const settle = (next: Block[]) => {
    setBlocks(next)
    const now = balance(
      target,
      next.map((block) => block.weight),
    )
    if (now === 'right') {
      setOver(true)
      say(t('sciGames.scale.say.less'))
      return
    }
    if (now === 'left') {
      say(t('sciGames.scale.say.more'))
      return
    }
    if (won.current === round) return
    won.current = round
    const score = firstTry + (over ? 0 : 1)
    setFirstTry(score)
    say(t('sciGames.scale.say.even'))
    later(() => {
      if (round + 1 < SCALE_ROUNDS.length) {
        setRound(round + 1)
        setBlocks([])
        setOver(false)
      } else {
        say(t('sciGames.scale.say.done'))
        later(() => onDone(SCALE_ROUNDS.length, score), 1400)
      }
    }, 1900)
  }

  const add = (weight: Weight) => {
    if (state === 'even' || total(weights) >= target + 3) return
    settle([...blocks, { key: nextKey.current++, weight }])
  }
  const remove = (key: number) => {
    if (state === 'even') return
    settle(blocks.filter((block) => block.key !== key))
  }

  const spring = reduceMotion
    ? { duration: 0.2 }
    : ({ type: 'spring', stiffness: 90, damping: 9 } as const)

  return (
    <section className="flex w-full max-w-xl flex-col items-center gap-3" data-testid="sci-scale">
      <p className="text-base font-semibold text-ink-soft tabular-nums">
        {t('sciGames.scale.round', { n: round + 1, total: SCALE_ROUNDS.length })}
      </p>

      {/* the scale: a stand, a beam that leans, two pans that hang straight */}
      <div className="relative h-64 w-full max-w-md short:h-48" data-balance={state}>
        <div className="absolute bottom-0 left-1/2 h-10 w-36 -translate-x-1/2 rounded-t-[2rem] bg-ink-soft/80" />
        <div className="absolute bottom-8 left-1/2 h-36 w-4 -translate-x-1/2 rounded-full bg-ink-soft short:h-24" />
        <motion.div
          className="absolute top-12 left-[6%] h-3 w-[88%] origin-center rounded-full bg-ink short:top-8"
          animate={{ rotate: -lean }}
          transition={spring}
        >
          <span className="absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-coin shadow-[0_2px_0_var(--color-coin-shadow)]" />
          {/* left pan: the apples */}
          <motion.div
            className="absolute top-1.5 left-0 w-[44%] -translate-x-[18%]"
            animate={{ rotate: lean }}
            transition={spring}
            style={{ transformOrigin: '50% 0%' }}
          >
            <div className="mx-auto h-16 w-0.5 bg-ink-soft short:h-10" />
            <div className="flex min-h-14 flex-wrap items-end justify-center gap-0.5 rounded-b-[2rem] border-t-4 border-ink-soft bg-surface/90 px-2 pt-1 pb-2 shadow-[0_4px_0_var(--color-line)]">
              {Array.from({ length: target }, (_, i) => (
                <motion.span
                  key={`${round}-${i}`}
                  initial={reduceMotion ? false : { scale: 0, y: -20 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15, delay: i * 0.05 }}
                >
                  <Img3D name="apple" className="size-7 sm:size-8" eager />
                </motion.span>
              ))}
            </div>
          </motion.div>
          {/* right pan: the blocks (tap one to take it off) */}
          <motion.div
            className="absolute top-1.5 right-0 w-[44%] translate-x-[18%]"
            animate={{ rotate: lean }}
            transition={spring}
            style={{ transformOrigin: '50% 0%' }}
          >
            <div className="mx-auto h-16 w-0.5 bg-ink-soft short:h-10" />
            <ul className="flex min-h-14 flex-wrap items-end justify-center gap-1 rounded-b-[2rem] border-t-4 border-ink-soft bg-surface/90 px-2 pt-1 pb-2 shadow-[0_4px_0_var(--color-line)]">
              <AnimatePresence>
                {blocks.map((block) => (
                  <motion.li
                    key={block.key}
                    initial={reduceMotion ? false : { y: 90, scale: 0.4, opacity: 0 }}
                    animate={{ y: 0, scale: 1, opacity: 1 }}
                    exit={{ y: 60, scale: 0.4, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                  >
                    <button
                      type="button"
                      onClick={() => remove(block.key)}
                      aria-label={t('sciGames.scale.takeOff', { n: block.weight })}
                      className={clsx(
                        'flex size-11 items-center justify-center rounded-xl',
                        BLOCK_TONE[block.weight],
                      )}
                    >
                      <BlockFace weight={block.weight} />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </motion.div>
        </motion.div>
        {state === 'even' && (
          <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
            <RewardBurst pieces={10}>
              <span aria-hidden="true" className="text-4xl">
                ✨
              </span>
            </RewardBurst>
          </div>
        )}
      </div>

      {/* the blocks to put on */}
      <div className="flex items-center justify-center gap-3">
        {WEIGHTS.map((weight) => (
          <button
            key={weight}
            type="button"
            onClick={() => add(weight)}
            disabled={state === 'even'}
            aria-label={t('sciGames.scale.putOn', { n: weight })}
            data-testid={`scale-add-${weight}`}
            className={clsx(
              'flex size-16 items-center justify-center rounded-2xl transition-transform active:translate-y-1 disabled:opacity-50',
              BLOCK_TONE[weight],
            )}
          >
            <BlockFace weight={weight} />
          </button>
        ))}
      </div>
      <Line text={line} />
    </section>
  )
}

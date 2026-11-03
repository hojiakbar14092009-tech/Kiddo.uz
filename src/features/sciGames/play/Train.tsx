import clsx from 'clsx'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Img3D } from '@/components/ui/Img3D'
import { useLanguage } from '@/store/settingsStore'
import { useLater, useLine, type Finish } from './hooks'
import { Line } from './kit'
import { fits, tilesFor, TRAIN_WORDS } from './trainRules'

/**
 * The word train (Phase 66): a picture, a train of empty wagons, and letter tiles.
 * The right next letter jumps into its wagon; a wrong one only wobbles. A full
 * train toots and rolls away, and the next one rolls in. A word counts as
 * first-try without a wrong tile.
 */
export function WordTrain({ onDone }: { onDone: Finish }) {
  const { t } = useTranslation()
  const language = useLanguage()
  const reduceMotion = useReducedMotion() ?? false
  const { line, say } = useLine()
  const later = useLater()
  const words = TRAIN_WORDS[language]
  const [index, setIndex] = useState(0)
  const [filled, setFilled] = useState<number[]>([])
  const [wobble, setWobble] = useState<{ id: number; n: number } | null>(null)
  const [missed, setMissed] = useState(false)
  const [firstTry, setFirstTry] = useState(0)
  const [leaving, setLeaving] = useState(false)
  /** Tiles already used, as of the last tap (two taps in one frame see each other). */
  const used = useRef<number[]>([])
  const { word, picture } = words[index]!
  const tiles = useMemo(() => tilesFor(language, word), [language, word])

  useEffect(() => {
    say(t('sciGames.train.say.start'))
  }, [index, say, t])

  const tap = (id: number, letter: string) => {
    if (leaving || used.current.includes(id)) return
    if (!fits(word, used.current.length, letter)) {
      setMissed(true)
      setWobble((current) => ({ id, n: (current?.n ?? 0) + 1 }))
      say(t('sciGames.train.say.nope'))
      return
    }
    used.current = [...used.current, id]
    setFilled(used.current)
    if (used.current.length < word.length) return
    const score = firstTry + (missed ? 0 : 1)
    setFirstTry(score)
    setLeaving(true)
    say(t('sciGames.train.say.word'))
    later(() => {
      if (index + 1 < words.length) {
        used.current = []
        setFilled([])
        setMissed(false)
        setLeaving(false)
        setIndex(index + 1)
      } else {
        say(t('sciGames.train.say.done'))
        later(() => onDone(words.length, score), 1400)
      }
    }, 2400)
  }

  return (
    <section className="flex w-full max-w-xl flex-col items-center gap-4" data-testid="sci-train">
      <p className="text-base font-semibold text-ink-soft tabular-nums">
        {t('sciGames.train.round', { n: index + 1, total: words.length })}
      </p>
      <motion.span
        key={`p${index}`}
        initial={reduceMotion ? false : { scale: 0.4, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12 }}
        className="flex size-32 items-center justify-center rounded-full bg-surface shadow-[0_6px_0_var(--color-line)] short:size-24"
      >
        <Img3D name={picture} className="size-[78%]" eager />
      </motion.span>

      {/* the train: it rolls in, and rolls away when the word is done */}
      <div className="relative w-full overflow-hidden py-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={`t${index}`}
            className="flex items-end justify-center gap-1.5"
            initial={reduceMotion ? { opacity: 0 } : { x: '-110%' }}
            animate={leaving && !reduceMotion ? { x: '120%' } : { x: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={
              leaving
                ? { duration: 1.4, delay: 0.7, ease: 'easeIn' }
                : { type: 'spring', stiffness: 70, damping: 14 }
            }
            data-testid="train"
            data-word={[...word].filter((_, i) => i < filled.length).join('')}
          >
            {[...word].map((_, slot) => {
              const tile = tiles.find((item) => item.id === filled[slot])
              return (
                <div
                  key={slot}
                  className="relative flex h-16 w-14 flex-col items-center justify-start rounded-t-xl rounded-b-md bg-oops shadow-[0_4px_0_#d96a30] sm:h-20 sm:w-16"
                >
                  <span className="mt-1.5 flex size-11 items-center justify-center rounded-lg bg-surface font-display text-3xl font-extrabold text-ink sm:size-12">
                    {tile && (
                      <motion.span
                        layoutId={`tile-${index}-${tile.id}`}
                        transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                      >
                        {tile.letter}
                      </motion.span>
                    )}
                  </span>
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-2 left-1.5 size-4 rounded-full bg-ink"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute right-1.5 -bottom-2 size-4 rounded-full bg-ink"
                  />
                </div>
              )
            })}
            <div
              aria-hidden="true"
              className="relative flex h-20 w-16 items-start justify-center rounded-t-2xl rounded-b-md bg-primary pt-2 shadow-[0_4px_0_var(--color-primary-shadow)] sm:h-24 sm:w-20"
            >
              <span className="text-3xl leading-none">🚂</span>
              <span className="absolute -bottom-2 left-2 size-5 rounded-full bg-ink" />
              <span className="absolute right-2 -bottom-2 size-5 rounded-full bg-ink" />
            </div>
          </motion.div>
        </AnimatePresence>
        <div aria-hidden="true" className="mx-auto mt-3 h-1.5 w-full rounded-full bg-ink-soft/40" />
      </div>

      {/* the letters */}
      <ul className="flex flex-wrap justify-center gap-2">
        {tiles.map((tile) => {
          const isUsed = filled.includes(tile.id)
          return (
            <li key={`${index}-${tile.id}`}>
              <button
                type="button"
                onClick={() => tap(tile.id, tile.letter)}
                disabled={isUsed || leaving}
                aria-label={tile.letter}
                data-testid={`tile-${tile.letter}`}
                className={clsx(
                  'flex size-14 items-center justify-center rounded-2xl bg-surface font-display text-3xl font-extrabold shadow-[0_5px_0_var(--color-line)] transition-transform active:translate-y-1 active:shadow-none',
                  isUsed && 'opacity-0',
                )}
              >
                {!isUsed && (
                  <motion.span
                    key={wobble?.id === tile.id ? wobble.n : 0}
                    layoutId={`tile-${index}-${tile.id}`}
                    animate={
                      wobble?.id === tile.id && !reduceMotion ? { rotate: [0, -12, 12, -6, 0] } : {}
                    }
                    transition={{ duration: 0.4 }}
                  >
                    {tile.letter}
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

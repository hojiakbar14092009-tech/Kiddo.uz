import clsx from 'clsx'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useParams } from 'react-router-dom'
import { Screen } from '@/components/layout/Screen'
import { TitleTopBar } from '@/components/layout/TitleTopBar'
import { ActivityReward } from '@/components/reward/ActivityReward'
import { Button } from '@/components/ui/Button'
import { LinkButton } from '@/components/ui/LinkButton'
import { emitActivity, type AwardSummary } from '@/domain/universe'
import { newId } from '@/lib/id'
import { tDynamic } from '@/lib/tDynamic'
import { useSpeaker } from '@/services/audio/useSpeaker'
import { useChildKey } from '@/store/progressStore'
import { sciGame, type SciGame } from './games'
import {
  CLOUD_TAPS,
  FLOAT_THINGS,
  IRON_COUNT,
  MAGNET_THINGS,
  nextWaterStep,
  sciRun,
  type MagnetThing,
  type WaterStep,
} from './rules'

type Phase =
  { kind: 'intro' } | { kind: 'play'; run: string } | { kind: 'done'; award: AwardSummary }

/** A finished game reports how many of how many it had, and how many on the first try. */
type Finish = (total: number, firstTry: number) => void

const TONE: Record<SciGame['tone'], string> = {
  sky: 'from-sky-soft to-surface',
  coral: 'from-oops-soft to-surface',
  mint: 'from-primary-soft to-surface',
}

/**
 * The science games (Phase 59): a droplet's trip (the water cycle), the magic
 * magnet (only iron sticks) and float-or-sink (light and heavy). Each one is a
 * couple of minutes of taps, said aloud on PRO, with a reward once a day.
 */
export function SciGamePage() {
  const { id } = useParams()
  const game = sciGame(id)
  if (!game) return <Navigate to="/explore" replace />
  return <SciGameScreen key={game.id} game={game} />
}

function SciGameScreen({ game }: { game: SciGame }) {
  const { t } = useTranslation()
  const childKey = useChildKey()
  const { sayText } = useSpeaker()
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' })
  const title = tDynamic(t, `sciGames.${game.id}.title`)
  const intro = tDynamic(t, `sciGames.${game.id}.intro`)

  useEffect(() => {
    if (phase.kind === 'intro') void sayText(intro)
  }, [intro, phase.kind, sayText])

  const start = () => setPhase({ kind: 'play', run: newId() })
  const finish =
    (run: string): Finish =>
    (total, firstTry) => {
      void sayText(t('sciGames.done'))
      setPhase({ kind: 'done', award: emitActivity(sciRun(game, run, childKey, total, firstTry)) })
    }

  return (
    <Screen
      header={<TitleTopBar title={title} back="/explore" />}
      className={clsx(
        'items-center gap-5 bg-gradient-to-b px-4 py-6 text-center short:gap-3 short:py-3',
        TONE[game.tone],
      )}
    >
      {phase.kind === 'intro' && (
        <>
          <motion.span
            aria-hidden="true"
            initial={{ scale: 0.6, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 160, damping: 11 }}
            className="flex size-40 items-center justify-center rounded-full bg-surface text-8xl shadow-[0_8px_0_var(--color-line)] short:size-28 short:text-6xl"
          >
            {game.emoji}
          </motion.span>
          <p className="max-w-md font-display text-2xl font-extrabold text-balance">{intro}</p>
          <Button onClick={start} data-testid="sci-start">
            {t('sciGames.play')}
          </Button>
        </>
      )}

      {phase.kind === 'play' && game.id === 'water' && <WaterTrip onDone={finish(phase.run)} />}
      {phase.kind === 'play' && game.id === 'magnet' && <MagicMagnet onDone={finish(phase.run)} />}
      {phase.kind === 'play' && game.id === 'float' && <FloatOrSink onDone={finish(phase.run)} />}

      {phase.kind === 'done' && (
        <>
          <p className="font-display text-2xl font-extrabold" data-testid="sci-finished">
            {t('sciGames.done')}
          </p>
          <ActivityReward stars={phase.award.stars} nuts={phase.award.nuts} />
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="soft" onClick={start}>
              {t('sciGames.again')}
            </Button>
            <LinkButton to="/explore" data-sound="back">
              {t('sciGames.back')}
            </LinkButton>
          </div>
        </>
      )}
    </Screen>
  )
}

/** The line under a game, read aloud on PRO and announced to screen readers. */
function useLine() {
  const { sayText } = useSpeaker()
  const [line, setLine] = useState('')
  const say = useCallback(
    (text: string) => {
      setLine(text)
      void sayText(text)
    },
    [sayText],
  )
  return { line, say }
}

/** Timers that end with the game (leaving mid-game never fires a late step). */
function useLater() {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => {
    const list = timers.current
    return () => list.forEach(clearTimeout)
  }, [])
  return useCallback((run: () => void, ms: number) => {
    timers.current.push(setTimeout(run, ms))
  }, [])
}

function Line({ text }: { text: string }) {
  return (
    <p role="status" className="min-h-14 max-w-md font-display text-xl font-bold text-balance">
      {text}
    </p>
  )
}

/** A pulsing ring around whatever the child should tap next. */
function TapHint({ on }: { on: boolean }) {
  const reduceMotion = useReducedMotion() ?? false
  if (!on) return null
  return (
    <motion.span
      aria-hidden="true"
      className="pointer-events-none absolute -inset-2 rounded-full border-4 border-coin"
      animate={reduceMotion ? { opacity: 1 } : { scale: [1, 1.15, 1], opacity: [0.9, 0.4, 0.9] }}
      transition={{ duration: 1.4, repeat: Infinity }}
    />
  )
}

// ---------------------------------------------------------------------------
// A droplet's trip: sun → steam → cloud → rain → flower → river → sea
// ---------------------------------------------------------------------------

/** How long a step that plays on its own (steam rising, rain, the river) lasts. */
const AUTO_MS = 2200

function WaterTrip({ onDone }: { onDone: Finish }) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion() ?? false
  const { line, say } = useLine()
  const [step, setStep] = useState<WaterStep>('sun')
  const [taps, setTaps] = useState(0)
  const done = useRef(onDone)
  useEffect(() => {
    done.current = onDone
  }, [onDone])

  // each step says what happens; the steps that play on their own move on by themselves
  useEffect(() => {
    if (step === 'done') {
      say(t('sciGames.water.say.done'))
      const timer = setTimeout(() => done.current(1, 1), AUTO_MS)
      return () => clearTimeout(timer)
    }
    say(tDynamic(t, `sciGames.water.say.${step}`))
    if (step === 'steam' || step === 'flower' || step === 'river') {
      const timer = setTimeout(() => setStep(nextWaterStep), reduceMotion ? 1200 : AUTO_MS)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [reduceMotion, say, step, t])

  const tapCloud = () => {
    if (step === 'cloud') {
      const next = taps + 1
      setTaps(next)
      if (next >= CLOUD_TAPS) setStep('rain')
      return
    }
    if (step === 'rain') setStep('flower')
  }

  const cloudScale = 1 + Math.min(taps, CLOUD_TAPS) * 0.14
  const heavy = taps >= CLOUD_TAPS
  const raining = step === 'flower'
  const grown = step === 'flower' || step === 'river' || step === 'done'

  return (
    <section className="flex w-full max-w-xl flex-col items-center gap-3" data-testid="sci-water">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] bg-gradient-to-b from-sky to-sky-soft min-[480px]:aspect-[4/3] short:aspect-[16/9] shadow-[0_6px_0_var(--color-line)]">
        {/* the sun */}
        <motion.button
          type="button"
          aria-label={t('sciGames.water.sun')}
          disabled={step !== 'sun'}
          onClick={() => setStep('steam')}
          animate={step === 'sun' ? { left: '6%', top: '6%' } : { left: '14%', top: '20%' }}
          transition={{ type: 'spring', stiffness: 60, damping: 14 }}
          className="absolute flex size-[22%] min-h-11 min-w-11 items-center justify-center"
          data-testid="water-sun"
        >
          <TapHint on={step === 'sun'} />
          <motion.span
            aria-hidden="true"
            className="text-[length:min(16vw,5rem)] leading-none"
            animate={reduceMotion ? {} : { rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          >
            ☀️
          </motion.span>
        </motion.button>

        {/* the cloud */}
        <motion.button
          type="button"
          aria-label={t('sciGames.water.cloud')}
          disabled={step !== 'cloud' && step !== 'rain'}
          onClick={tapCloud}
          animate={{ scale: step === 'sun' || step === 'steam' ? 0.55 : cloudScale }}
          transition={{ type: 'spring', stiffness: 140, damping: 10 }}
          className="absolute top-[12%] left-[50%] flex size-[26%] min-h-11 min-w-11 items-center justify-center"
          data-testid="water-cloud"
        >
          <TapHint on={step === 'cloud' || step === 'rain'} />
          <span
            aria-hidden="true"
            className={clsx(
              'text-[length:min(18vw,5.5rem)] leading-none transition-[filter] duration-500',
              heavy && 'grayscale brightness-75',
            )}
          >
            ☁️
          </span>
        </motion.button>

        {/* steam rising from the sea */}
        <AnimatePresence>
          {step === 'steam' &&
            [0, 1, 2, 3].map((index) => (
              <motion.span
                key={index}
                aria-hidden="true"
                className="absolute bottom-[22%] text-3xl"
                style={{ left: `${12 + index * 9}%` }}
                initial={{ y: 0, opacity: 0, scale: 0.6 }}
                animate={{ y: '-260%', x: '160%', opacity: [0, 1, 0], scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.8, delay: index * 0.18 }}
              >
                💧
              </motion.span>
            ))}
        </AnimatePresence>

        {/* rain over the flower */}
        <AnimatePresence>
          {raining &&
            [0, 1, 2, 3, 4].map((index) => (
              <motion.span
                key={index}
                aria-hidden="true"
                className="absolute top-[30%] text-2xl"
                style={{ left: `${56 + index * 5}%` }}
                initial={{ y: 0, opacity: 0 }}
                animate={{ y: '320%', opacity: [0, 1, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, delay: index * 0.12, repeat: 1 }}
              >
                💧
              </motion.span>
            ))}
        </AnimatePresence>

        {/* the land, the flower and the river */}
        <div className="absolute right-0 bottom-0 h-[24%] w-[55%] rounded-tl-[3rem] bg-[#8bc47a]" />
        <motion.span
          aria-hidden="true"
          className="absolute right-[16%] bottom-[16%] origin-bottom text-[length:min(14vw,4.5rem)] leading-none"
          animate={{ scale: grown ? 1.25 : 0.7 }}
          transition={{ type: 'spring', stiffness: 120, damping: 9 }}
        >
          {grown ? '🌷' : '🌱'}
        </motion.span>
        <motion.div
          aria-hidden="true"
          className="absolute bottom-[3%] h-[6%] rounded-full bg-[#4aa3e0]"
          initial={false}
          animate={{
            right: '8%',
            width: step === 'river' || step === 'done' ? '84%' : '0%',
          }}
          transition={{ duration: reduceMotion ? 0.2 : 1.6 }}
        />
        {/* the sea */}
        <div className="absolute bottom-0 left-0 h-[22%] w-[48%] rounded-tr-[3rem] bg-gradient-to-b from-[#5fb4ec] to-[#2f7fc4]" />
      </div>
      <Line text={line} />
    </section>
  )
}

// ---------------------------------------------------------------------------
// The magic magnet: tap a thing; iron jumps up and sticks
// ---------------------------------------------------------------------------

function MagicMagnet({ onDone }: { onDone: Finish }) {
  const { t } = useTranslation()
  const { line, say } = useLine()
  const [stuck, setStuck] = useState<MagnetThing[]>([])
  const [tried, setTried] = useState<MagnetThing[]>([])
  const [wiggle, setWiggle] = useState<{ id: MagnetThing; n: number } | null>(null)
  const [wrong, setWrong] = useState(0)

  const later = useLater()
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

// ---------------------------------------------------------------------------
// Float or sink: guess first, then watch it in the water
// ---------------------------------------------------------------------------

function FloatOrSink({ onDone }: { onDone: Finish }) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion() ?? false
  const { line, say } = useLine()
  const [index, setIndex] = useState(0)
  const [guess, setGuess] = useState<boolean | null>(null)
  const [right, setRight] = useState(0)
  const thing = FLOAT_THINGS[index]!
  const total = FLOAT_THINGS.length

  const later = useLater()
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

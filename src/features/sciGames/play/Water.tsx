import clsx from 'clsx'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { tDynamic } from '@/lib/tDynamic'
import { useLine, type Finish } from './hooks'
import { Line, TapHint } from './kit'
import { CLOUD_TAPS, nextWaterStep, type WaterStep } from '../rules'

// ---------------------------------------------------------------------------
// A droplet's trip: sun → steam → cloud → rain → flower → river → sea
// ---------------------------------------------------------------------------

/** How long a step that plays on its own (steam rising, rain, the river) lasts. */
const AUTO_MS = 2200

export function WaterTrip({ onDone }: { onDone: Finish }) {
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

import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CoinIcon, CrownIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { MascotFigure } from '@/features/mascot/MascotFigure'
import { useAppSettingsStore } from '@/store/appSettingsStore'
import { useMascotModel } from '@/store/familyStore'

const PERKS = ['voiceLetters', 'voiceMascot', 'voiceTasks'] as const

/**
 * For families without PRO: a golden card that shows what PRO brings, one
 * thing at a time, with the robot singing along. It leads to the plans below.
 */
export function ProShowcase({ onChoose }: { onChoose: () => void }) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion() ?? false
  const model = useMascotModel()
  const gift = useAppSettingsStore((state) => state.proGiftCoins)
  const [perk, setPerk] = useState(0)

  useEffect(() => {
    if (reduceMotion) return undefined
    const timer = setInterval(() => setPerk((current) => (current + 1) % PERKS.length), 2600)
    return () => clearInterval(timer)
  }, [reduceMotion])

  return (
    <section
      aria-labelledby="pro-showcase-title"
      className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#FFE7A3_0%,#FFC93C_45%,#F7A928_100%)] p-6 text-ink shadow-[0_8px_0_var(--color-coin-shadow)] sm:p-8 lg:col-span-2"
    >
      {/* a light sweep across the gold, every few seconds */}
      {!reduceMotion && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)]"
          initial={{ left: '-40%' }}
          animate={{ left: ['-40%', '140%'] }}
          transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 2.4, ease: 'easeInOut' }}
        />
      )}
      <div className="relative flex flex-col items-center gap-6 sm:flex-row">
        <motion.div
          className="relative w-36 shrink-0 sm:w-44"
          animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.span
            aria-hidden="true"
            className="absolute -top-6 left-1/2 z-10 -translate-x-1/2 text-[#8A5A00]"
            animate={reduceMotion ? undefined : { rotate: [-12, 12, -12] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          >
            <CrownIcon size={44} />
          </motion.span>
          <MascotFigure model={model} mood="talk" followPointer={false} className="h-auto w-full" />
        </motion.div>

        <div className="flex flex-1 flex-col gap-3 text-center sm:text-left">
          <h2 id="pro-showcase-title" className="font-display text-3xl font-extrabold sm:text-4xl">
            {t('pro.showcaseTitle')}
          </h2>
          <div className="relative h-16 sm:h-10" aria-live="polite">
            {PERKS.map((key, index) => (
              <motion.p
                key={key}
                className="absolute inset-0 font-display text-xl font-bold"
                initial={false}
                animate={
                  index === perk ? { opacity: 1, y: 0 } : { opacity: 0, y: index < perk ? -14 : 14 }
                }
                transition={{ duration: 0.45 }}
                aria-hidden={index !== perk}
              >
                <span aria-hidden="true">🔊 </span>
                {t(`pro.features.${key}`)}
              </motion.p>
            ))}
          </div>
          {gift > 0 && (
            <p className="inline-flex items-center justify-center gap-2 self-center rounded-full bg-white/70 px-4 py-1.5 font-bold sm:self-start">
              <CoinIcon size={24} />
              {t('pro.showcaseGift', { count: gift })}
            </p>
          )}
          <Button variant="primary" className="self-center sm:self-start" onClick={onChoose}>
            {t('pro.showcaseCta')}
          </Button>
        </div>
      </div>
    </section>
  )
}

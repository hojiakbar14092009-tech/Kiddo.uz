import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { CoinIcon, CrownIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { useFocusTrap } from '@/components/ui/useFocusTrap'
import { MascotFigure } from '@/features/mascot/MascotFigure'
import { audioManager } from '@/services/audio/audioManager'
import { useMascotModel } from '@/store/familyStore'
import { useLanguage } from '@/store/settingsStore'

const SPARKS = ['👑', '⭐', '✨', '🎉', '💛', '🌟']

/**
 * Right after PRO is bought: a golden burst, the robot jumps for joy and says
 * thank you out loud – the first thing it can now do with its new voice.
 */
export function ProCelebration({ onClose, gift = 0 }: { onClose: () => void; gift?: number }) {
  const { t } = useTranslation()
  const language = useLanguage()
  const model = useMascotModel()
  const reduceMotion = useReducedMotion() ?? false
  const dialog = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  useFocusTrap(dialog, button)

  useEffect(() => {
    audioManager.play('success')
    void audioManager.speak(
      [{ text: t('pro.celebrateSay'), clip: { kind: 'phrases', id: 'pro-celebrate' } }],
      { language },
      { requirePro: false },
    )
    return () => audioManager.stopSpeech()
  }, [language, t])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-ink/50 p-4">
      {!reduceMotion &&
        Array.from({ length: 28 }, (_, i) => {
          const angle = (i / 28) * Math.PI * 2
          return (
            <motion.span
              key={i}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-1/2 text-3xl"
              initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
              animate={{
                x: Math.cos(angle) * (220 + (i % 4) * 60),
                y: Math.sin(angle) * (220 + (i % 4) * 60),
                scale: [0, 1.4, 1],
                opacity: [1, 1, 0],
                rotate: 360,
              }}
              transition={{ duration: 1.8, delay: 0.15 + (i % 7) * 0.05, ease: 'easeOut' }}
            >
              {SPARKS[i % SPARKS.length]}
            </motion.span>
          )
        })}
      <motion.div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pro-celebrate-title"
        initial={reduceMotion ? false : { scale: 0.5, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 15 }}
        className="relative flex w-full max-w-md flex-col items-center gap-3 rounded-[36px] bg-[linear-gradient(180deg,#FFF4C9_0%,#FFFFFF_60%)] p-6 text-center text-ink shadow-[0_10px_0_var(--color-coin-shadow)]"
      >
        <motion.span
          aria-hidden="true"
          className="text-coin-shadow"
          animate={reduceMotion ? undefined : { rotate: [-10, 10, -10], y: [0, -6, 0] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          <CrownIcon size={56} />
        </motion.span>
        <motion.div
          animate={reduceMotion ? undefined : { y: [0, -28, 0, -16, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.6 }}
        >
          <MascotFigure model={model} mood="celebrate" className="h-auto w-40" />
        </motion.div>
        <h2 id="pro-celebrate-title" className="font-display text-3xl font-extrabold">
          {t('pro.celebrateTitle')}
        </h2>
        <p className="text-lg text-ink-soft">{t('pro.celebrateText')}</p>
        {gift > 0 && (
          <motion.p
            role="status"
            initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.8, type: 'spring', stiffness: 260, damping: 12 }}
            className="inline-flex items-center gap-2 rounded-full bg-coin px-5 py-2 font-display text-xl font-extrabold text-ink shadow-[0_5px_0_var(--color-coin-shadow)]"
          >
            <CoinIcon size={28} />
            {t('pro.giftCoins', { count: gift })}
          </motion.p>
        )}
        <Button ref={button} variant="coin" onClick={onClose}>
          {t('pro.celebrateOk')}
        </Button>
      </motion.div>
    </div>
  )
}

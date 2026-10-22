import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { CoinIcon, CrownIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { RewardBurst } from '@/components/ui/RewardBurst'
import { MascotFigure } from '@/features/mascot/MascotFigure'
import { audioManager } from '@/services/audio/audioManager'
import { useMascotModel } from '@/store/familyStore'
import { useLanguage } from '@/store/settingsStore'

/**
 * Right after PRO is bought: a burst of coins, the robot jumps for joy and says
 * thank you out loud – the first thing it can now do with its new voice.
 */
export function ProCelebration({ onClose, gift = 0 }: { onClose: () => void; gift?: number }) {
  const { t } = useTranslation()
  const language = useLanguage()
  const model = useMascotModel()
  const reduceMotion = useReducedMotion() ?? false
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    audioManager.play('success')
    void audioManager.speak(
      [{ text: t('pro.celebrateSay'), clip: { kind: 'phrases', id: 'pro-celebrate' } }],
      { language },
      { requirePro: false },
    )
    return () => audioManager.stopSpeech()
  }, [language, t])

  // A tap outside does not close it by accident; the button and Escape do.
  return (
    <Dialog
      title={t('pro.celebrateTitle')}
      description={t('pro.celebrateText')}
      onClose={onClose}
      dismissible={false}
      initialFocus={button}
      testId="pro-celebration"
      className="bg-linear-to-b from-coin-soft to-surface to-60% shadow-press-coin!"
      media={
        <RewardBurst kind="coins" pieces={10}>
          <div className="flex flex-col items-center gap-3">
            <motion.span
              aria-hidden="true"
              className="text-coin-shadow"
              animate={reduceMotion ? undefined : { rotate: [-10, 10, -10], y: [0, -6, 0] }}
              transition={{ duration: 1.2, repeat: 3 }}
            >
              <CrownIcon size={56} />
            </motion.span>
            <motion.div
              animate={reduceMotion ? undefined : { y: [0, -28, 0, -16, 0] }}
              transition={{ duration: 1.4, repeat: 3, repeatDelay: 0.6 }}
            >
              <MascotFigure model={model} mood="celebrate" className="h-auto w-40" />
            </motion.div>
          </div>
        </RewardBurst>
      }
    >
      {/* the crown and the jumping robot sit above the title */}
      {gift > 0 && (
        <motion.p
          role="status"
          initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.8, type: 'spring', stiffness: 260, damping: 12 }}
          className="inline-flex items-center gap-2 rounded-full bg-coin px-5 py-2 font-display text-xl font-extrabold text-ink shadow-press-coin"
        >
          <CoinIcon size={28} />
          {t('pro.giftCoins', { count: gift })}
        </motion.p>
      )}
      <Button ref={button} variant="coin" onClick={onClose}>
        {t('pro.celebrateOk')}
      </Button>
    </Dialog>
  )
}

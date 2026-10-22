import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { RewardBurst } from '@/components/ui/RewardBurst'
import { MascotFigure } from '@/features/mascot/MascotFigure'
import { audioManager } from '@/services/audio/audioManager'
import { useMascotModel } from '@/store/familyStore'
import type { ClaimedPromo } from './promoBackend'

const TILE_COLORS = ['#13917E', '#F27BA6', '#4FA8E8', '#FFB020', '#8E6CEF', '#FF8A4C']

/**
 * The code arrives after the ad: a gift box bursts, the robot cheers, and the
 * code's letters roll in one by one like a slot machine before they settle.
 * Closing it (the link, Escape) is safe: the claimed code stays in the panel.
 */
export function PromoReveal({
  promo,
  onUse,
  onClose,
}: {
  promo: ClaimedPromo
  onUse: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const model = useMascotModel()
  const reduceMotion = useReducedMotion() ?? false
  const useButton = useRef<HTMLButtonElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    audioManager.play('success')
  }, [])

  const copy = () => {
    void navigator.clipboard?.writeText(promo.code).then(() => setCopied(true))
  }

  return (
    <Dialog
      title={t('pro.getPromo.revealTitle')}
      onClose={onClose}
      dismissible={false}
      initialFocus={useButton}
      testId="promo-reveal"
      className="bg-linear-to-b from-primary-soft to-surface to-65% shadow-press-primary!"
      media={
        <RewardBurst kind="stars" pieces={10} delay={0.3}>
          <div className="flex flex-col items-center gap-3">
            {/* the gift box pops open */}
            <motion.div
              aria-hidden="true"
              className="relative h-16 w-20"
              initial={reduceMotion ? false : { y: 30, scale: 0.6 }}
              animate={{ y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 12 }}
            >
              <motion.div
                className="absolute inset-x-0 top-0 h-5 rounded-lg bg-girl"
                initial={reduceMotion ? false : { y: 0, rotate: 0 }}
                animate={{ y: -18, rotate: -16 }}
                transition={{ delay: 0.35, type: 'spring', stiffness: 260, damping: 10 }}
              />
              <div className="absolute inset-x-1 top-5 bottom-0 rounded-lg bg-coin" />
              <div className="absolute inset-y-0 left-1/2 w-3 -translate-x-1/2 bg-girl" />
            </motion.div>

            <motion.div
              animate={reduceMotion ? undefined : { y: [0, -22, 0, -12, 0] }}
              transition={{ duration: 1.4, repeat: 3, repeatDelay: 0.7 }}
            >
              <MascotFigure model={model} mood="celebrate" className="h-auto w-24 sm:w-32" />
            </motion.div>
          </div>
        </RewardBurst>
      }
    >
      {/* the gift box and the cheering robot sit above the title */}
      <p
        className="flex flex-wrap justify-center gap-1.5"
        aria-label={promo.code}
        data-testid="promo-code"
      >
        {[...promo.code].map((char, index) => (
          <motion.span
            key={`${char}-${index}`}
            aria-hidden="true"
            className="flex h-12 w-9 items-center justify-center rounded-xl font-display text-2xl font-extrabold sm:h-14 sm:w-10 sm:text-3xl text-white shadow-[0_4px_0_rgba(0,0,0,0.18)]"
            style={{ background: TILE_COLORS[index % TILE_COLORS.length] }}
            initial={reduceMotion ? false : { rotateX: 90, y: -30, opacity: 0 }}
            animate={{ rotateX: 0, y: 0, opacity: 1 }}
            transition={{
              delay: 0.6 + index * 0.12,
              type: 'spring',
              stiffness: 320,
              damping: 14,
            }}
          >
            {char}
          </motion.span>
        ))}
      </p>

      <motion.p
        className="text-lg text-ink-soft"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 + promo.code.length * 0.12 }}
      >
        {t('pro.getPromo.revealText', { count: promo.days })}
      </motion.p>

      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="soft" size="md" onClick={copy}>
          {copied ? t('pro.getPromo.copied') : t('pro.getPromo.copy')}
        </Button>
        <Button ref={useButton} variant="coin" size="md" onClick={onUse}>
          {t('pro.getPromo.use')}
        </Button>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="min-h-11 px-3 text-sm font-semibold text-ink-soft underline"
      >
        {t('pro.getPromo.close')}
      </button>
    </Dialog>
  )
}

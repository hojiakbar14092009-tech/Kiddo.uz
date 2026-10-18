import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { useFocusTrap } from '@/components/ui/useFocusTrap'
import { MascotFigure } from '@/features/mascot/MascotFigure'
import { audioManager } from '@/services/audio/audioManager'
import { useMascotModel } from '@/store/familyStore'
import type { ClaimedPromo } from './promoBackend'

const SPARKS = ['🎁', '⭐', '✨', '🎉', '💛', '🌟']
const TILE_COLORS = ['#13917E', '#F27BA6', '#4FA8E8', '#FFB020', '#8E6CEF', '#FF8A4C']

/**
 * The code arrives after the ad: a gift box bursts, the robot cheers, and the
 * code's letters roll in one by one like a slot machine before they settle.
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
  const dialog = useRef<HTMLDivElement>(null)
  const useButton = useRef<HTMLButtonElement>(null)
  const [copied, setCopied] = useState(false)
  useFocusTrap(dialog, useButton)

  useEffect(() => {
    audioManager.play('success')
  }, [])

  const copy = () => {
    void navigator.clipboard?.writeText(promo.code).then(() => setCopied(true))
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center overflow-hidden bg-ink/60 p-4">
      {!reduceMotion &&
        Array.from({ length: 30 }, (_, i) => {
          const angle = (i / 30) * Math.PI * 2
          return (
            <motion.span
              key={i}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-1/2 text-3xl"
              initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
              animate={{
                x: Math.cos(angle) * (240 + (i % 4) * 60),
                y: Math.sin(angle) * (240 + (i % 4) * 60),
                scale: [0, 1.4, 1],
                opacity: [1, 1, 0],
                rotate: 360,
              }}
              transition={{ duration: 1.9, delay: 0.5 + (i % 7) * 0.05, ease: 'easeOut' }}
            >
              {SPARKS[i % SPARKS.length]}
            </motion.span>
          )
        })}
      <motion.div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-reveal-title"
        initial={reduceMotion ? false : { scale: 0.4, opacity: 0, rotate: -6 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 14 }}
        className="relative flex w-full max-w-md flex-col items-center gap-3 rounded-[36px] bg-[linear-gradient(180deg,#E6FBF4_0%,#FFFFFF_65%)] p-6 text-center text-ink shadow-[0_10px_0_var(--color-primary-shadow)]"
      >
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
          transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.7 }}
        >
          <MascotFigure model={model} mood="celebrate" className="h-auto w-32" />
        </motion.div>

        <h2 id="promo-reveal-title" className="font-display text-2xl font-extrabold">
          {t('pro.getPromo.revealTitle')}
        </h2>

        <p
          className="flex flex-wrap justify-center gap-1.5"
          aria-label={promo.code}
          data-testid="promo-code"
        >
          {[...promo.code].map((char, index) => (
            <motion.span
              key={`${char}-${index}`}
              aria-hidden="true"
              className="flex h-14 w-10 items-center justify-center rounded-xl font-display text-3xl font-extrabold text-white shadow-[0_4px_0_rgba(0,0,0,0.18)]"
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
          className="text-sm font-semibold text-ink-soft underline"
        >
          {t('pro.getPromo.close')}
        </button>
      </motion.div>
    </div>
  )
}

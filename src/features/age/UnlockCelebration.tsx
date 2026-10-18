import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { useFocusTrap } from '@/components/ui/useFocusTrap'
import { GAME_META } from '@/features/tasks/gameMeta'
import { useSpeaker } from '@/services/audio/useSpeaker'
import { levelOfChild, useActiveChild, useFamilyStore } from '@/store/familyStore'
import { AGE_LEVELS, unlocksAt, type Unlock } from './ageLevel'

const CONFETTI = ['🎉', '⭐', '🎈', '✨', '🎊', '🌟', '🎁', '💫']

function unlockLabel(unlock: Unlock, t: ReturnType<typeof useTranslation>['t']) {
  if (unlock === 'numbers') return { emoji: '🔢', text: t('age.numbers') }
  if (unlock === 'exam') return { emoji: '🏆', text: t('age.exam') }
  return { emoji: GAME_META[unlock].emoji, text: t(GAME_META[unlock].titleKey) }
}

/**
 * On the birthday that reaches a new age, the locked games open with a little
 * party: the padlock springs open, confetti falls and the new games fly in.
 */
export function UnlockCelebration() {
  const child = useActiveChild()
  if (!child) return null
  const level = levelOfChild(child)
  if (level <= child.celebratedLevel) return null
  return <Celebration childId={child.id} from={child.celebratedLevel} to={level} />
}

interface CelebrationProps {
  childId: string
  from: number
  to: (typeof AGE_LEVELS)[number]
}

function Celebration({ childId, from, to }: CelebrationProps) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion() ?? false
  const updateChild = useFamilyStore((state) => state.updateChild)
  const { sayText } = useSpeaker()
  const button = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDivElement>(null)
  useFocusTrap(dialog, button)

  const unlocks = AGE_LEVELS.filter((level) => level > from && level <= to).flatMap(unlocksAt)
  const title = t('age.celebrateTitle', { age: to })

  useEffect(() => {
    void sayText(`${title} ${t('age.celebrateText')}`)
  }, [sayText, t, title])

  const close = () => updateChild(childId, { celebratedLevel: to })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-ink/40 p-4">
      {!reduceMotion &&
        Array.from({ length: 24 }, (_, i) => (
          <motion.span
            key={i}
            aria-hidden="true"
            className="pointer-events-none absolute top-0 text-3xl sm:text-4xl"
            style={{ left: `${(i * 37) % 100}%` }}
            initial={{ y: -60, rotate: 0, opacity: 1 }}
            animate={{ y: '110vh', rotate: 360 * (i % 2 ? 1 : -1), opacity: [1, 1, 0.6] }}
            transition={{ duration: 3 + (i % 5) * 0.5, delay: (i % 8) * 0.2, ease: 'easeIn' }}
          >
            {CONFETTI[i % CONFETTI.length]}
          </motion.span>
        ))}

      <motion.div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="unlock-title"
        initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 16 }}
        className="relative flex w-full max-w-md flex-col items-center gap-4 rounded-[36px] bg-surface p-6 text-center text-ink shadow-[0_8px_0_var(--color-line)]"
      >
        <Padlock reduceMotion={reduceMotion} />
        <h2 id="unlock-title" className="font-display text-3xl font-extrabold">
          {title}
        </h2>
        <p className="text-xl text-ink-soft">{t('age.celebrateText')}</p>
        <ul className="flex w-full flex-col gap-2">
          {unlocks.map((unlock, index) => {
            const { emoji, text } = unlockLabel(unlock, t)
            return (
              <motion.li
                key={unlock}
                initial={reduceMotion ? false : { x: -80, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1 + index * 0.25, type: 'spring', stiffness: 200 }}
                className="flex items-center gap-3 rounded-3xl bg-coin-soft px-4 py-3 font-display text-xl font-bold"
              >
                <span aria-hidden="true" className="text-3xl">
                  {emoji}
                </span>
                {text}
              </motion.li>
            )
          })}
        </ul>
        <Button ref={button} variant="coin" onClick={close}>
          {t('age.celebrateOk')}
        </Button>
      </motion.div>
    </div>
  )
}

/** A padlock whose shackle springs open. */
function Padlock({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 100 110"
      className="size-28"
      aria-hidden="true"
      initial={reduceMotion ? false : { rotate: 0 }}
      animate={reduceMotion ? undefined : { rotate: [0, -8, 8, -6, 6, 0] }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <motion.path
        d="M28 50 V34 a22 22 0 0 1 44 0 V50"
        fill="none"
        stroke="var(--color-ink-soft)"
        strokeWidth="10"
        strokeLinecap="round"
        style={{ originX: '72px', originY: '50px' }}
        initial={reduceMotion ? { rotate: 35, y: -10 } : { rotate: 0, y: 0 }}
        animate={{ rotate: 35, y: -10 }}
        transition={{ delay: 0.8, type: 'spring', stiffness: 260, damping: 10 }}
      />
      <rect x="14" y="48" width="72" height="56" rx="16" fill="var(--color-coin)" />
      <circle cx="50" cy="72" r="8" fill="var(--color-ink)" />
      <rect x="46" y="74" width="8" height="16" rx="4" fill="var(--color-ink)" />
    </motion.svg>
  )
}

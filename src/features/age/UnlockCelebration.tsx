import type { TFunction } from 'i18next'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { RewardBurst } from '@/components/ui/RewardBurst'
import { GAME_META } from '@/features/tasks/gameMeta'
import { AppIcon } from './AppIcon'
import { useSpeaker } from '@/services/audio/useSpeaker'
import { levelOfChild, useActiveChild, useFamilyStore } from '@/store/familyStore'
import { AGE_LEVELS, unlocksAt, type Unlock } from './ageLevel'

// `TFunction`, not `ReturnType<typeof useTranslation>['t']`: the latter is too deep for tsc
// once the translations grow (TS2589).
function unlockLabel(unlock: Unlock, t: TFunction) {
  if (unlock === 'numbers') return t('age.numbers')
  if (unlock === 'exam') return t('age.exam')
  return t(GAME_META[unlock].titleKey)
}

/**
 * On the birthday that reaches a new age, the locked games open with a little
 * party: the padlock springs open in a burst of stars and the new games fly in.
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

  const unlocks = AGE_LEVELS.filter((level) => level > from && level <= to).flatMap(unlocksAt)
  const title = t('age.celebrateTitle', { age: to })

  useEffect(() => {
    void sayText(`${title} ${t('age.celebrateText')}`)
  }, [sayText, t, title])

  const close = () => updateChild(childId, { celebratedLevel: to })

  // A tap outside does not end the party by accident; the big button and
  // Escape do (both mark this age as celebrated).
  return (
    <Dialog
      title={title}
      description={t('age.celebrateText')}
      onClose={close}
      dismissible={false}
      initialFocus={button}
      testId="unlock-celebration"
      media={
        <RewardBurst kind="stars" pieces={10}>
          <Padlock reduceMotion={reduceMotion} />
        </RewardBurst>
      }
    >
      <ul className="flex w-full flex-col gap-2">
        {unlocks.map((unlock, index) => {
          const text = unlockLabel(unlock, t)
          return (
            <motion.li
              key={unlock}
              initial={reduceMotion ? false : { x: -80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 1 + index * 0.25, type: 'spring', stiffness: 200 }}
              className="flex items-center gap-3 rounded-3xl bg-coin-soft px-4 py-3 text-left font-display text-xl font-bold"
            >
              <AppIcon name={unlock} className="size-10 shrink-0" />
              {text}
            </motion.li>
          )
        })}
      </ul>
      <Button ref={button} variant="coin" onClick={close}>
        {t('age.celebrateOk')}
      </Button>
    </Dialog>
  )
}

/** A padlock whose shackle springs open. */
function Padlock({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 100 110"
      className="size-28 overflow-visible"
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
        // framer-motion pivots SVG parts on their own box: 1/1 is the right foot
        style={{ originX: 1, originY: 1 }}
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

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
import { AGE_LEVELS, suggestedAt, type Suggestion } from './ageLevel'

// `TFunction`, not `ReturnType<typeof useTranslation>['t']`: the latter is too deep for tsc
// once the translations grow (TS2589).
function suggestionLabel(item: Suggestion, t: TFunction) {
  if (item === 'numbers') return t('age.numbers')
  return t(GAME_META[item].titleKey)
}

/**
 * On the birthday that reaches a new age, a little party: a present pops open
 * in a burst of stars and the games now suggested fly in. Nothing was locked
 * before (Phase 22, §17); the birthday only changes what is suggested.
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

  const unlocks = AGE_LEVELS.filter((level) => level > from && level <= to).flatMap(suggestedAt)
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
          <GiftBox reduceMotion={reduceMotion} />
        </RewardBurst>
      }
    >
      <ul className="flex w-full flex-col gap-2">
        {unlocks.map((unlock, index) => {
          const text = suggestionLabel(unlock, t)
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

/** A present whose lid pops up: a birthday brings new suggestions, nothing was locked. */
function GiftBox({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 100 110"
      className="size-28 overflow-visible"
      aria-hidden="true"
      initial={reduceMotion ? false : { rotate: 0 }}
      animate={reduceMotion ? undefined : { rotate: [0, -6, 6, -4, 4, 0] }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <rect x="16" y="52" width="68" height="52" rx="10" fill="var(--color-coin)" />
      <rect x="45" y="52" width="10" height="52" fill="var(--color-primary)" />
      <motion.g
        initial={reduceMotion ? { y: -14, rotate: -10 } : { y: 0, rotate: 0 }}
        animate={{ y: -14, rotate: -10 }}
        style={{ originX: 0, originY: 1 }}
        transition={{ delay: 0.8, type: 'spring', stiffness: 260, damping: 10 }}
      >
        <rect x="10" y="38" width="80" height="16" rx="6" fill="var(--color-coin)" />
        <rect x="45" y="38" width="10" height="16" fill="var(--color-primary)" />
        <path
          d="M50 38 C40 22 26 28 34 36 M50 38 C60 22 74 28 66 36"
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </motion.g>
    </motion.svg>
  )
}

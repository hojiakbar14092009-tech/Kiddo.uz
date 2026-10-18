import clsx from 'clsx'
import { motion, useReducedMotion, type TargetAndTransition } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { CheckIcon } from '@/components/icons'
import type { LetterEntry } from '@/content/alphabet'
import { HighlightedWord } from '@/features/alphabet/HighlightedWord'
import type { ChoiceGameType } from './games'
import { Picture } from '@/components/ui/Picture'

export type OptionStatus = 'idle' | 'wrong' | 'correct' | 'hint'

interface OptionCardProps {
  option: LetterEntry
  /** The letter being searched for (used to colour it inside the revealed word). */
  target: LetterEntry
  taskType: ChoiceGameType
  status: OptionStatus
  onChoose: (option: LetterEntry) => void
}

const STATUS_CLASSES: Record<OptionStatus, string> = {
  idle: 'bg-white shadow-[0_7px_0_var(--color-line)]',
  hint: 'bg-white shadow-[0_7px_0_var(--color-line)] ring-4 ring-coin',
  correct: 'bg-primary-soft shadow-[0_7px_0_#B5E3D2] ring-4 ring-primary',
  wrong: 'bg-oops-soft text-oops-ink shadow-[0_7px_0_#F6C2A3] opacity-70',
}

const STATUS_MOTION: Record<OptionStatus, TargetAndTransition> = {
  idle: { x: 0, scale: 1 },
  wrong: { x: [0, -12, 11, -7, 5, 0], scale: 1, transition: { duration: 0.5 } },
  correct: { scale: [1, 1.1, 1], x: 0, transition: { duration: 0.45 } },
  hint: { scale: [1, 1.04, 1], x: 0, transition: { duration: 1.2, repeat: Infinity } },
}

export function OptionCard({ option, target, taskType, status, onChoose }: OptionCardProps) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion() ?? false
  const isPicture = taskType === 'find-picture'
  const label = isPicture ? option.word : t('task.letterOption', { letter: option.upper })

  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-disabled={status === 'wrong'}
      onClick={() => onChoose(option)}
      animate={reduceMotion ? undefined : STATUS_MOTION[status]}
      className={clsx(
        'relative flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-[32px] p-3 transition-colors',
        STATUS_CLASSES[status],
      )}
    >
      {isPicture ? (
        <>
          <Picture emoji={option.emoji} className="size-[62%]" />
          {status === 'correct' && (
            <HighlightedWord letter={target} className="text-2xl sm:text-3xl" />
          )}
        </>
      ) : (
        <span className="font-display text-[clamp(4.5rem,15vw,8rem)] leading-none font-extrabold">
          {option.upper}
        </span>
      )}
      {status === 'correct' && (
        <span className="absolute -top-3 -right-3 flex size-12 items-center justify-center rounded-full border-4 border-cream bg-primary text-white">
          <CheckIcon size={24} />
        </span>
      )}
    </motion.button>
  )
}

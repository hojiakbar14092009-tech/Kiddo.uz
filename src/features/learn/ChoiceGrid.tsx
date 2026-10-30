import clsx from 'clsx'
import { motion, useReducedMotion, type TargetAndTransition } from 'framer-motion'
import type { ReactNode } from 'react'
import { CheckIcon } from '@/components/icons'

/** `removed`: a wrong card the tutor took away (a partial hint): faded and not pressable. */
export type ChoiceStatus = 'idle' | 'wrong' | 'correct' | 'hint' | 'removed'

export interface Choice {
  id: string
  /** Accessible name (what the picture or number is). */
  label: string
  content: ReactNode
}

const STATUS_CLASSES: Record<ChoiceStatus, string> = {
  idle: 'bg-white shadow-[0_7px_0_var(--color-line)]',
  hint: 'bg-white shadow-[0_7px_0_var(--color-line)] ring-4 ring-coin',
  correct: 'bg-primary-soft shadow-[0_7px_0_#B5E3D2] ring-4 ring-primary',
  wrong: 'bg-oops-soft text-oops-ink shadow-[0_7px_0_var(--color-oops-shadow)] opacity-70',
  removed: 'bg-white/60 opacity-25 grayscale shadow-none',
}

const STATUS_MOTION: Record<ChoiceStatus, TargetAndTransition> = {
  idle: { x: 0, scale: 1 },
  wrong: { x: [0, -12, 11, -7, 5, 0], scale: 1, transition: { duration: 0.5 } },
  correct: { scale: [1, 1.08, 1], x: 0, transition: { duration: 0.45 } },
  hint: { scale: [1, 1.04, 1], x: 0, transition: { duration: 1.2, repeat: Infinity } },
  removed: { x: 0, scale: 0.94, transition: { duration: 0.3 } },
}

/** Big answer cards in the style of the existing games (2–4 per question). */
export function ChoiceGrid({
  choices,
  statuses,
  onChoose,
  disabled = false,
  className,
  cardClassName,
}: {
  choices: readonly Choice[]
  statuses?: Partial<Record<string, ChoiceStatus>>
  onChoose: (id: string) => void
  disabled?: boolean
  className?: string
  cardClassName?: string
}) {
  const reduceMotion = useReducedMotion() ?? false
  const cols =
    choices.length <= 2
      ? 'grid-cols-2'
      : choices.length === 3
        ? 'grid-cols-3'
        : 'grid-cols-2 sm:grid-cols-4'
  return (
    <div className={clsx('mx-auto grid w-full max-w-3xl gap-4 sm:gap-6', cols, className)}>
      {choices.map((choice) => {
        const status = statuses?.[choice.id] ?? 'idle'
        return (
          <motion.button
            key={choice.id}
            type="button"
            aria-label={choice.label}
            data-choice={choice.id}
            data-status={status}
            aria-disabled={status === 'wrong' || status === 'removed' || disabled}
            onClick={() =>
              !disabled && status !== 'wrong' && status !== 'removed' && onChoose(choice.id)
            }
            animate={reduceMotion ? undefined : STATUS_MOTION[status]}
            className={clsx(
              'relative flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-[32px] p-3 text-ink transition-colors',
              STATUS_CLASSES[status],
              cardClassName,
            )}
          >
            {choice.content}
            {status === 'correct' && (
              <span className="absolute -top-3 -right-3 flex size-12 items-center justify-center rounded-full border-4 border-cream bg-primary text-white">
                <CheckIcon size={24} />
              </span>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}

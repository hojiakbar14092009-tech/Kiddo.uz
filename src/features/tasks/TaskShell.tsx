import clsx from 'clsx'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SpeakerIcon } from '@/components/icons'
import { Screen } from '@/components/layout/Screen'
import { SHORT_SCREEN } from '@/components/layout/shortScreen'
import { TopBar } from '@/components/layout/TopBar'
import { IconButton } from '@/components/ui/IconButton'
import { Mascot } from '@/features/mascot/Mascot'
import { useIsPro } from '@/store/subscriptionStore'
import { TaskHint, type HintContent } from './TaskHint'

interface TaskShellProps {
  title: string
  /** Zero-based current round, and how many rounds there are. */
  round: number
  rounds: number
  speaking: boolean
  /** Repeats the spoken instruction (PRO only; Free has nothing to repeat). */
  onRepeat: () => void
  /** What the help bulb (top right) shows for the current question. */
  hint?: HintContent
  /** The child keeps getting it wrong: the help bulb lights up. */
  struggling?: boolean
  children: ReactNode
}

/**
 * Shared frame of every game: title and progress dots, the mascot with its
 * bubble, then the game. Like `LearnShell`, phones show the title as a
 * heading in the page (the top bar is too narrow for it) and tablets up in
 * the top bar; on a short landscape phone the mascot row is compact, so the
 * game starts above the fold.
 */
export function TaskShell({
  title,
  round,
  rounds,
  speaking,
  onRepeat,
  hint,
  struggling = false,
  children,
}: TaskShellProps) {
  const { t } = useTranslation()
  const isPro = useIsPro()

  return (
    <Screen
      header={
        <TopBar
          start={
            <div className="flex min-w-0 flex-col">
              <span className="task-title hidden truncate font-display text-lg font-bold sm:block sm:text-xl">
                {title}
              </span>
              <RoundDots
                current={round}
                total={rounds}
                label={t('task.round', { current: round + 1, total: rounds })}
              />
            </div>
          }
        />
      }
      className={clsx('gap-4 px-4 py-4 sm:gap-6 sm:px-8 sm:py-6', SHORT_SCREEN.page)}
    >
      <h1 className="task-title -mb-2 text-center font-display text-2xl leading-tight font-extrabold sm:hidden">
        {title}
      </h1>
      <div className={clsx('flex items-center gap-3', SHORT_SCREEN.mascotRow)}>
        <Mascot
          robotClassName={clsx('w-20 sm:w-32', SHORT_SCREEN.robot)}
          speaking={speaking}
          className="min-w-0 flex-1"
        />
        {isPro && (
          <IconButton label={t('task.repeatPrompt')} tone="primary" onClick={onRepeat}>
            <SpeakerIcon size={28} />
          </IconButton>
        )}
        {hint && <TaskHint hint={hint} struggling={struggling} />}
      </div>
      {children}
    </Screen>
  )
}

function RoundDots({ total, current, label }: { total: number; current: number; label: string }) {
  return (
    <div
      className="mt-1 flex gap-1.5"
      role="progressbar"
      aria-valuenow={current + 1}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={label}
    >
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={clsx(
            'h-2.5 rounded-full transition-all',
            index < current && 'w-2.5 bg-primary',
            index === current && 'w-7 bg-coin',
            index > current && 'w-2.5 bg-line-strong',
          )}
        />
      ))}
    </div>
  )
}

import clsx from 'clsx'
import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Screen } from '@/components/layout/Screen'
import { TopBar } from '@/components/layout/TopBar'
import { Mascot } from '@/features/mascot/Mascot'
import { useMascotStore } from '@/features/mascot/mascotStore'
import { HelpButton } from './HelpButton'
import { SpeakButton } from './SpeakButton'
import { SPEAK_PRIORITY, useSpeakable } from './speakable'
import { useOnline } from './useOnline'
import { useLearnVoice } from './voice'

export interface ShellHelp {
  text: string
  visual?: ReactNode
  glow?: boolean
  onOpen?: () => void
}

interface LearnShellProps {
  title: string
  /** Zero-based step and number of steps (shown as dots), if the screen has steps. */
  step?: { current: number; total: number }
  help?: ShellHelp
  /** Show the speaker button (reads aloud on PRO). */
  voice?: boolean
  /**
   * What the speaker button reads on this screen: the question or
   * instruction shown now, in the current language. A question board inside
   * the page can register its own text with `useSpeakable` instead.
   */
  speak?: readonly (string | null | undefined | false)[] | null
  /** Hide the mascot row (e.g. on a full-screen scene that has its own narrator). */
  mascot?: boolean
  /** Extra classes on the page; a section with its own look (Koinot) adds its theme class. */
  className?: string
  /** Wraps the whole page, e.g. `learn-space` for the space theme (scoped to that section). */
  themeClassName?: string
  children: ReactNode
}

/**
 * The frame of every new learning screen, built from the same parts as the
 * existing games: top bar, step dots, the mascot with its bubble, the voice
 * switch and the help bulb.
 */
export function LearnShell({
  title,
  step,
  help,
  voice = true,
  speak = null,
  mascot = true,
  className,
  themeClassName,
  children,
}: LearnShellProps) {
  const { t } = useTranslation()
  const learnVoice = useLearnVoice()
  const resetMascot = useMascotStore((state) => state.reset)
  const online = useOnline()
  useSpeakable(speak, SPEAK_PRIORITY.page)

  // leaving the screen: the bubble clears and any voice stops
  useEffect(
    () => () => {
      resetMascot()
      learnVoice.stop()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div className={clsx('min-h-dvh', themeClassName)}>
      <Screen
        header={
          <TopBar
            start={
              <div className="flex min-w-0 flex-col">
                <span className="learn-title hidden truncate font-display text-lg font-bold sm:block sm:text-xl">
                  {title}
                </span>
                {step && step.total > 1 && (
                  <StepDots
                    current={step.current}
                    total={step.total}
                    label={t('learn.question', { current: step.current + 1, total: step.total })}
                  />
                )}
              </div>
            }
          />
        }
        className={clsx('gap-4 px-4 py-4 sm:gap-6 sm:px-8 sm:py-6', className)}
      >
        {!online && (
          <p
            role="status"
            data-testid="learn-offline"
            className="rounded-2xl bg-coin-soft px-4 py-2 text-center font-semibold text-ink"
          >
            {t('learn.offline')}
          </p>
        )}
        <h1 className="learn-title -mb-2 text-center font-display text-2xl leading-tight font-extrabold sm:hidden">
          {title}
        </h1>
        {(mascot || help || voice) && (
          <div className="flex items-center gap-3">
            {mascot ? (
              <Mascot
                robotClassName="w-16 sm:w-28"
                className="min-w-0 flex-1"
                speaking={learnVoice.speaking}
                talkOnlyWhileSpeaking
              />
            ) : (
              <div className="flex-1" />
            )}
            <div className="flex shrink-0 flex-col items-center gap-2 sm:flex-row sm:gap-3">
              {voice && <SpeakButton fallback={[title]} />}
              {help && (
                <HelpButton text={help.text} glow={help.glow} onOpen={help.onOpen}>
                  {help.visual}
                </HelpButton>
              )}
            </div>
          </div>
        )}
        {children}
      </Screen>
    </div>
  )
}

function StepDots({ total, current, label }: { total: number; current: number; label: string }) {
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

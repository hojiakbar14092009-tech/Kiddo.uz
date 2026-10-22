import clsx from 'clsx'
import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Screen } from '@/components/layout/Screen'
import { SHORT_SCREEN } from '@/components/layout/shortScreen'
import { TopBar } from '@/components/layout/TopBar'
import { StepDots } from '@/components/ui/Progress'
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
/** The kind of learning screen shown last (title + whether it has steps). */
let lastScreenKind: string | null = null

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

  // A new kind of screen starts at the top: a menu scrolled down to its button
  // must not leave the next screen (e.g. the garden board) under the top bar.
  // The next question of the same exercise keeps the child's scroll position.
  const screenKind = `${title}|${step ? 'steps' : 'single'}`
  useEffect(() => {
    if (lastScreenKind !== screenKind && window.scrollY > 0) window.scrollTo({ top: 0 })
    lastScreenKind = screenKind
  }, [screenKind])

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
                    className="mt-1"
                  />
                )}
              </div>
            }
          />
        }
        className={clsx('gap-4 px-4 py-4 sm:gap-6 sm:px-8 sm:py-6', SHORT_SCREEN.page, className)}
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
          <div className={clsx('flex items-center gap-3', SHORT_SCREEN.mascotRow)}>
            {mascot ? (
              <Mascot
                robotClassName={clsx('w-16 sm:w-28', SHORT_SCREEN.robot)}
                className="min-w-0 flex-1"
                speaking={learnVoice.speaking}
                talkOnlyWhileSpeaking
              />
            ) : (
              <div className="flex-1" />
            )}
            <div
              className={clsx(
                'flex shrink-0 flex-col items-center gap-2 sm:flex-row sm:gap-3',
                SHORT_SCREEN.actions,
              )}
            >
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

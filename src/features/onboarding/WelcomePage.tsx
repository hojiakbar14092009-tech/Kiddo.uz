import clsx from 'clsx'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { BulbIcon, CheckIcon, CoinIcon, SpeakerIcon } from '@/components/icons'
import { Screen } from '@/components/layout/Screen'
import { Button } from '@/components/ui/Button'
import { StepDots } from '@/components/ui/Progress'
import { Robot } from '@/features/mascot/Robot'
import { useSpeaker } from '@/services/audio/useSpeaker'
import { useActiveChild, useFamilyStore } from '@/store/familyStore'
import { useSettingsStore } from '@/store/settingsStore'

/*
 * Interactive onboarding (Phase 25): a first, short tour with KidoBot. Each
 * step asks the child to try one thing the app is made of — wave to the robot,
 * collect a coin, press the speaker, ask the bulb for help — and answers at
 * once. Nothing is paid or saved except "the tour was seen" (settingsStore);
 * it can be skipped at any time and replayed from the parent area.
 */

const STEPS = ['robot', 'coin', 'speaker', 'help', 'parent'] as const
type Step = (typeof STEPS)[number]

export function WelcomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const hasProfiles = useFamilyStore((state) => state.children.length > 0)
  const setOnboarded = useSettingsStore((state) => state.setOnboarded)
  const { sayText, speaking, canSpeak } = useSpeaker()
  const child = useActiveChild()
  const [index, setIndex] = useState(0)
  const [tried, setTried] = useState<ReadonlySet<Step>>(() => new Set())
  const step = STEPS[index]!
  const heading = useRef<HTMLHeadingElement>(null)
  const shown = useRef(index)

  // without the voice (a Free account), the speaker step says what the button is for, honestly
  const quiet = step === 'speaker' && !canSpeak
  const title = t(`welcome.steps.${step}.title`)
  const text = quiet ? t('welcome.steps.speaker.textNoVoice') : t(`welcome.steps.${step}.text`)

  // a new step: its words are said and focus moves to its title
  useEffect(() => {
    void sayText(`${title} ${text}`)
    if (shown.current !== index) heading.current?.focus()
    shown.current = index
  }, [index, sayText, text, title])

  const finish = () => {
    setOnboarded(true)
    navigate(hasProfiles ? '/child-select' : '/home', { replace: true })
  }
  const tryIt = () => setTried((set) => new Set(set).add(step))
  const last = index === STEPS.length - 1

  return (
    <Screen className="items-center justify-center gap-5 px-4 py-6 sm:gap-6">
      <div className="flex w-full max-w-2xl items-center justify-between gap-3">
        <StepDots
          current={index}
          total={STEPS.length}
          label={t('welcome.step', { current: index + 1, total: STEPS.length })}
        />
        <button
          type="button"
          onClick={finish}
          data-testid="welcome-skip"
          className="min-h-11 rounded-full px-4 font-semibold text-ink-soft underline"
        >
          {t('welcome.skip')}
        </button>
      </div>

      <section
        aria-labelledby="welcome-title"
        data-testid="welcome-step"
        data-step={step}
        className="flex w-full max-w-2xl flex-col items-center gap-4 rounded-panel bg-surface p-5 text-center shadow-press-lg sm:p-8 short:flex-row short:gap-6 short:text-left"
      >
        <Interactive
          step={step}
          tried={tried.has(step)}
          onTry={tryIt}
          speaking={speaking}
          sayText={sayText}
          robot={child?.mascot ?? 'boy'}
        />
        <div className="flex flex-col items-center gap-3 short:items-start">
          <h1
            id="welcome-title"
            ref={heading}
            tabIndex={-1}
            className="font-display text-3xl font-extrabold focus-visible:outline-2 focus-visible:outline-primary sm:text-4xl"
          >
            {title}
          </h1>
          <p className="text-lg text-ink-soft sm:text-xl">{text}</p>
          <p
            aria-live="polite"
            data-testid="welcome-feedback"
            className={clsx(
              'flex min-h-8 items-center gap-2 font-display text-xl font-bold text-primary-ink',
              !tried.has(step) && 'invisible',
            )}
          >
            {tried.has(step) && (
              <>
                <CheckIcon size={22} aria-hidden="true" />
                {quiet ? t('welcome.steps.speaker.doneNoVoice') : t(`welcome.steps.${step}.done`)}
              </>
            )}
          </p>
          <div className="flex flex-wrap justify-center gap-2 short:justify-start">
            {index > 0 && (
              <Button variant="soft" size="md" onClick={() => setIndex(index - 1)}>
                {t('welcome.back')}
              </Button>
            )}
            {last ? (
              <Button onClick={finish} data-testid="welcome-finish">
                {t('welcome.finish')}
              </Button>
            ) : (
              <Button onClick={() => setIndex(index + 1)} data-testid="welcome-next">
                {t('welcome.next')}
              </Button>
            )}
          </div>
        </div>
      </section>
    </Screen>
  )
}

/** The thing to try on each step: a big, friendly target that answers at once. */
function Interactive({
  step,
  tried,
  onTry,
  speaking,
  sayText,
  robot,
}: {
  step: Step
  /** The child's own robot (the boy's for a guest). */
  robot: 'girl' | 'boy'
  tried: boolean
  onTry: () => void
  speaking: boolean
  sayText: (text: string) => Promise<unknown>
}) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion() ?? false
  const [taps, setTaps] = useState(0)
  const tap = () => {
    setTaps((n) => n + 1)
    onTry()
  }
  const target = (label: string, children: ReactNode) => (
    <button
      type="button"
      onClick={tap}
      aria-label={label}
      data-testid="welcome-try"
      className="flex size-36 shrink-0 items-center justify-center rounded-full bg-cream shadow-press active:scale-95 sm:size-44 short:size-28"
    >
      {children}
    </button>
  )

  switch (step) {
    case 'robot':
      return target(
        t('welcome.steps.robot.try'),
        <Robot
          model={robot}
          mood={tried ? 'wave' : 'idle'}
          reactionKey={taps}
          size={130}
          followPointer={false}
        />,
      )
    case 'coin':
      return target(
        t('welcome.steps.coin.try'),
        <span className="relative">
          <CoinIcon size={96} />
          {taps > 0 && (
            <motion.span
              key={taps}
              aria-hidden="true"
              initial={reduceMotion ? false : { y: 0, opacity: 1 }}
              animate={reduceMotion ? undefined : { y: -48, opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute -top-2 left-1/2 -translate-x-1/2 text-3xl"
            >
              ✨
            </motion.span>
          )}
        </span>,
      )
    case 'speaker':
      return (
        <button
          type="button"
          onClick={() => {
            onTry()
            void sayText(t('welcome.steps.speaker.heard'))
          }}
          aria-label={t('welcome.steps.speaker.try')}
          data-testid="welcome-try"
          data-speaking={speaking}
          className="flex size-36 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-ink shadow-press active:scale-95 sm:size-44 short:size-28"
        >
          <SpeakerIcon size={80} />
        </button>
      )
    case 'help':
      return target(
        t('welcome.steps.help.try'),
        <BulbIcon size={88} className={tried ? 'text-coin-shadow' : 'text-ink-soft'} />,
      )
    case 'parent':
      return target(
        t('welcome.steps.parent.try'),
        <span aria-hidden="true" className="text-7xl">
          👨‍👩‍👧
        </span>,
      )
  }
}

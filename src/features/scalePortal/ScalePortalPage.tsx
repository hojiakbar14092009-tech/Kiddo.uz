import clsx from 'clsx'
import { useMotionValue } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Screen } from '@/components/layout/Screen'
import { TitleTopBar } from '@/components/layout/TitleTopBar'
import { ActivityReward } from '@/components/reward/ActivityReward'
import { Button } from '@/components/ui/Button'
import { LinkButton } from '@/components/ui/LinkButton'
import { ageProfile } from '@/domain/adaptive'
import { emitActivity, type AwardSummary } from '@/domain/universe'
import { Mascot } from '@/features/mascot/Mascot'
import { useMascot } from '@/features/mascot/useMascot'
import { newId } from '@/lib/id'
import { tDynamic } from '@/lib/tDynamic'
import { childAge, useActiveChild } from '@/store/familyStore'
import { useChildKey } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useCamera } from './camera'
import { comparisonText, powerText, sizeText } from './describe'
import { SCALE_DRAWINGS } from './drawings'
import { JUMPS, questionFor, SCALE_ACTIVITY, type ScaleChoice } from './questions'
import { frameOf, SCALE_STOPS } from './scales'
import { ScaleView } from './ScaleView'

type Phase =
  | { kind: 'intro' }
  | { kind: 'explore' }
  | { kind: 'guess'; step: number }
  /** Answered: `right` says how; the jump plays, then the comparison shows. */
  | { kind: 'jump'; step: number; right: boolean; landed: boolean }
  | { kind: 'done'; award: AwardSummary; right: number }

/**
 * `/scale-portal` (Phase 33): Astro's journey from a blood cell to the Milky
 * Way. Each portal asks for a guess first (bigger/smaller for the youngest,
 * rough ratios, steps of ten, or scientific notation, by real age), then the
 * camera zooms continuously to the next place and says how they compare. A
 * finished journey goes through emitActivity like every activity; free
 * exploration on the rail earns nothing (it cannot be farmed).
 */
export function ScalePortalPage() {
  const { t } = useTranslation()
  const language = useSettingsStore((state) => state.language) ?? 'uz'
  const child = useActiveChild()
  const detail = ageProfile(child ? childAge(child) : null).scaleDetail
  const childKey = useChildKey()
  const { react, reset } = useMascot()
  const z = useMotionValue(frameOf(SCALE_STOPS[0]!))
  const camera = useCamera(z)
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' })
  const [runId, setRunId] = useState(newId)
  const [right, setRight] = useState(0)
  const heading = useRef<HTMLHeadingElement>(null)
  const nextButton = useRef<HTMLButtonElement>(null)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      reset()
    }
  }, [reset])

  useEffect(() => {
    if (phase.kind === 'intro') react('greet', { text: t('scalePortal.intro'), emoji: '🔭' })
  }, [phase.kind, react, t])

  // the question or the result takes the focus, so a keyboard or screen reader follows the journey
  useEffect(() => {
    if (phase.kind === 'guess' || phase.kind === 'done') heading.current?.focus()
    // after the jump lands, the way on has the focus (the answer button is gone)
    if (phase.kind === 'jump' && phase.landed) nextButton.current?.focus()
  }, [phase])

  const name = (id: string) => tDynamic(t, `scalePortal.stops.${id}.name`)

  const start = () => {
    setRunId(newId())
    setRight(0)
    void camera(frameOf(SCALE_STOPS[0]!))
    setPhase({ kind: 'guess', step: 0 })
  }

  const answer = (step: number, index: number) => {
    const question = questionFor(step, detail)
    const ok = index === question.answer
    if (ok) setRight((count) => count + 1)
    react(ok ? 'correct' : 'instruct', { text: t(ok ? 'scalePortal.right' : 'scalePortal.wrong') })
    setPhase({ kind: 'jump', step, right: ok, landed: false })
    // the portal jump: a continuous zoom out to the next place
    void camera(frameOf(question.to)).then(() => {
      if (alive.current) setPhase({ kind: 'jump', step, right: ok, landed: true })
    })
  }

  const next = (step: number) => {
    if (step + 1 < JUMPS) {
      setPhase({ kind: 'guess', step: step + 1 })
      return
    }
    const award = emitActivity({
      id: runId,
      childKey,
      activity: SCALE_ACTIVITY,
      strand: 'space',
      // a memorised replay counts for the strand once a day (stars only for a better result)
      oncePerDay: true,
      correct: right,
      total: JUMPS,
      independent: right,
    })
    react('celebrate', { text: t('scalePortal.doneTitle'), emoji: '🌌' })
    setPhase({ kind: 'done', award, right })
  }

  const choiceText = (choice: ScaleChoice) => {
    if (choice.kind === 'stop') return name(choice.id)
    if (choice.kind === 'times') return t('scalePortal.choice.times', { n: choice.value })
    if (choice.kind === 'steps') return t('scalePortal.choice.steps', { k: choice.value })
    return t('scalePortal.choice.power', {
      power: powerText(choice.mantissa, choice.exponent, language),
    })
  }

  const step = phase.kind === 'guess' || phase.kind === 'jump' ? phase.step : null
  const shown =
    phase.kind === 'jump' && phase.landed
      ? SCALE_STOPS[phase.step + 1]!
      : step !== null
        ? SCALE_STOPS[step]!
        : null

  return (
    <Screen
      header={<TitleTopBar title={t('scalePortal.title')} back="/learn/space" />}
      className="items-center gap-4 px-4 py-4 sm:py-6 short:gap-3 short:py-3"
    >
      <div className="flex w-full max-w-4xl flex-col gap-4" data-testid="scale-portal">
        <Mascot robotClassName="w-20 sm:w-28" className="self-start" />

        <ScaleView
          z={z}
          detail={detail}
          language={language}
          explore={phase.kind === 'explore' || phase.kind === 'done'}
        />

        {phase.kind === 'intro' && (
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={start} data-testid="scale-start">
              {t('scalePortal.start')}
            </Button>
            <Button variant="soft" onClick={() => setPhase({ kind: 'explore' })}>
              {t('scalePortal.explore')}
            </Button>
          </div>
        )}

        {phase.kind === 'explore' && (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-lg">{t('scalePortal.exploreHint')}</p>
            <Button onClick={start} data-testid="scale-start">
              {t('scalePortal.start')}
            </Button>
          </div>
        )}

        {shown && (
          <section
            className="flex items-start gap-3 rounded-card bg-surface p-4 shadow-press"
            data-testid="scale-stop"
            data-stop={shown.id}
          >
            <svg viewBox="0 0 100 100" className="size-14 shrink-0" aria-hidden="true">
              {SCALE_DRAWINGS[shown.id]}
            </svg>
            <div className="min-w-0">
              <h2 className="font-display text-xl font-extrabold">{name(shown.id)}</h2>
              <p className="text-base leading-snug">
                {tDynamic(t, `scalePortal.stops.${shown.id}.fact`)}
              </p>
              {detail !== 'compare' && (
                <p className="mt-1 text-sm font-semibold text-ink-soft tabular-nums">
                  {sizeText(t, shown, detail, language)}
                </p>
              )}
            </div>
          </section>
        )}

        {phase.kind === 'guess' &&
          (() => {
            const question = questionFor(phase.step, detail)
            const ask =
              question.kind === 'bigger' || question.kind === 'smaller'
                ? t(`scalePortal.ask.${question.kind}`)
                : t(`scalePortal.ask.${question.kind}`, {
                    from: name(question.from.id),
                    to: name(question.to.id),
                  })
            return (
              <section
                aria-labelledby="scale-question"
                className="flex flex-col items-center gap-3 text-center"
                data-testid="scale-question"
                // tests read the right answer; a production build does not show it
                data-answer={
                  import.meta.env.PROD && import.meta.env.MODE === 'production'
                    ? undefined
                    : question.answer
                }
              >
                <p className="text-sm font-semibold text-ink-soft tabular-nums">
                  {t('scalePortal.progress', { n: phase.step + 1, total: JUMPS })}
                </p>
                <h2
                  id="scale-question"
                  ref={heading}
                  tabIndex={-1}
                  className="font-display text-2xl font-extrabold outline-none"
                >
                  {ask}
                </h2>
                <div
                  className={clsx(
                    'grid w-full gap-3',
                    question.choices.length === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-3',
                  )}
                >
                  {question.choices.map((choice, index) => (
                    <button
                      key={index}
                      type="button"
                      data-choice={index}
                      onClick={() => answer(phase.step, index)}
                      className="flex min-h-14 items-center justify-center gap-2 rounded-card bg-surface px-4 py-3 font-display text-lg font-bold shadow-press active:translate-y-0.5"
                    >
                      {choice.kind === 'stop' && (
                        <svg viewBox="0 0 100 100" className="size-12" aria-hidden="true">
                          {SCALE_DRAWINGS[choice.id]}
                        </svg>
                      )}
                      <span className="tabular-nums">{choiceText(choice)}</span>
                    </button>
                  ))}
                </div>
              </section>
            )
          })()}

        {phase.kind === 'jump' && (
          <section className="flex flex-col items-center gap-3 text-center" aria-live="polite">
            <p className="font-display text-xl font-extrabold" data-testid="scale-verdict">
              {t(phase.right ? 'scalePortal.right' : 'scalePortal.wrong')}
            </p>
            {phase.landed && (
              <>
                <p className="text-lg" data-testid="scale-compare">
                  {comparisonText(
                    t,
                    SCALE_STOPS[phase.step]!,
                    SCALE_STOPS[phase.step + 1]!,
                    detail,
                    language,
                  )}
                </p>
                <Button ref={nextButton} onClick={() => next(phase.step)} data-testid="scale-next">
                  {t('scalePortal.next')}
                </Button>
              </>
            )}
          </section>
        )}

        {phase.kind === 'done' && (
          <section className="flex flex-col items-center gap-3 text-center">
            <h2
              ref={heading}
              tabIndex={-1}
              className="font-display text-2xl font-extrabold outline-none"
              data-testid="scale-done"
            >
              {t('scalePortal.doneTitle')}
            </h2>
            <p className="text-lg tabular-nums">
              {t('scalePortal.doneText', { n: phase.right, total: JUMPS })}
            </p>
            <ActivityReward stars={phase.award.stars} crystals={phase.award.crystals} />
            <p className="text-base text-ink-soft">{t('scalePortal.exploreHint')}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="soft" onClick={start}>
                {t('scalePortal.again')}
              </Button>
              <LinkButton to="/learn/space" data-sound="back">
                {t('scalePortal.back')}
              </LinkButton>
            </div>
          </section>
        )}
      </div>
    </Screen>
  )
}

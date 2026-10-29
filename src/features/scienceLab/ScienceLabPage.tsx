import clsx from 'clsx'
import { ProgressBar } from '@/components/ui/Progress'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Screen } from '@/components/layout/Screen'
import { TitleTopBar } from '@/components/layout/TitleTopBar'
import { ActivityReward } from '@/components/reward/ActivityReward'
import { Button } from '@/components/ui/Button'
import { Img3D } from '@/components/ui/Img3D'
import { ACTIVITY_LESSONS } from '@/domain/learning'
import { useLessonSeen } from '@/features/learn/learnStore'
import { LessonDeck, type LessonCard } from '@/features/learn/LessonDeck'
import { LinkButton } from '@/components/ui/LinkButton'
import { emitActivity, type AwardSummary } from '@/domain/universe'
import { PLANT_STAGES, useWorldProgress } from '@/domain/universe/progression'
import { newId } from '@/lib/id'
import { tDynamic } from '@/lib/tDynamic'
import { useChildKey } from '@/store/progressStore'
import { experimentRun, PLANT_EXPERIMENT } from './experiment'

type Phase =
  { kind: 'intro' } | { kind: 'question'; index: number } | { kind: 'done'; award: AwardSummary }

/**
 * The Science Lab, opened by the Mars flower in bloom (the connected world's
 * rule; the page only reads it). One short experiment about what a plant
 * needs. A wrong tap is a gentle "think again"; only first-try answers count
 * as independent, as everywhere in Kiddo.
 */
export function ScienceLabPage() {
  const { t } = useTranslation()
  const childKey = useChildKey()
  const { isUnlocked, stageOf } = useWorldProgress()
  const flower = stageOf('mars')
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' })
  const [runId, setRunId] = useState(newId)
  const [missed, setMissed] = useState<string[]>([])
  const [firstTry, setFirstTry] = useState(0)
  const [wrongNow, setWrongNow] = useState(false)
  /** Counts wrong taps, so the same "think again" is announced again. */
  const [wrongCount, setWrongCount] = useState(0)
  const heading = useRef<HTMLHeadingElement>(null)
  // Learn Before Play: what the experiment asks about is shown first
  const seen = useLessonSeen(ACTIVITY_LESSONS.scienceLab)
  const [review, setReview] = useState(false)
  const lesson: LessonCard[] = (
    [
      ['water', ['droplet']],
      ['light', ['sun']],
      ['seed', ['sunflower']],
      ['first', ['seedling', 'blossom']],
    ] as const
  ).map(([id, pictures]) => ({
    id,
    art: (
      <span className="flex items-center gap-3">
        {pictures.map((name) => (
          <Img3D key={name} name={name} className="size-28 sm:size-36 short:size-20" eager />
        ))}
      </span>
    ),
    title: t(`learnFirst.lab.${id}.title`),
    lines: [t(`learnFirst.lab.${id}.line`)],
  }))
  const questionIndex = phase.kind === 'question' ? phase.index : -1
  // a new question: focus moves to it (the old answer buttons are gone)
  useEffect(() => {
    if (questionIndex > 0) heading.current?.focus()
  }, [questionIndex])

  if (!isUnlocked('science-lab')) {
    return (
      <Screen
        header={<TitleTopBar title={t('scienceLab.title')} back="/home" />}
        className="items-center gap-4 px-4 py-8 text-center"
      >
        <Img3D name="blossom" className="size-32 opacity-50 grayscale" />
        <p className="max-w-md text-lg text-ink-soft" data-testid="lab-locked">
          {t('scienceLab.locked')}
        </p>
        {/* how far the flower is: progress, not a dead lock */}
        {flower >= 0 && (
          <ProgressBar
            value={flower}
            max={PLANT_STAGES}
            label={t('scienceLab.flower', { stage: flower, total: PLANT_STAGES })}
            className="w-full max-w-xs"
          />
        )}
        {flower >= 0 && (
          <p aria-hidden="true" className="font-display text-lg font-bold" data-testid="lab-flower">
            {t('scienceLab.flower', { stage: flower, total: PLANT_STAGES })}
          </p>
        )}
        <LinkButton to="/mistake-garden">{t('scienceLab.toGarden')}</LinkButton>
      </Screen>
    )
  }

  const start = () => {
    setRunId(newId())
    setMissed([])
    setFirstTry(0)
    setWrongNow(false)
    setPhase({ kind: 'question', index: 0 })
  }

  const answer = (index: number, choice: string) => {
    const question = PLANT_EXPERIMENT[index]!
    if (choice !== question.answer) {
      setWrongNow(true)
      setWrongCount((count) => count + 1)
      if (!missed.includes(question.id)) setMissed((list) => [...list, question.id])
      return
    }
    setWrongNow(false)
    const independent = firstTry + (missed.includes(question.id) ? 0 : 1)
    setFirstTry(independent)
    if (index + 1 < PLANT_EXPERIMENT.length) {
      setPhase({ kind: 'question', index: index + 1 })
    } else {
      setPhase({ kind: 'done', award: emitActivity(experimentRun(runId, childKey, independent)) })
    }
  }

  return (
    <Screen
      header={<TitleTopBar title={t('scienceLab.title')} back="/home" />}
      className="items-center gap-5 px-4 py-6 text-center sm:py-8 short:gap-3 short:py-3"
    >
      {phase.kind === 'intro' && (!seen || review) && (
        <LessonDeck
          lessonId={ACTIVITY_LESSONS.scienceLab}
          cards={lesson}
          onDone={() => setReview(false)}
        />
      )}

      {phase.kind === 'intro' && seen && !review && (
        <>
          <span className="flex size-36 items-center justify-center rounded-card bg-primary-soft">
            <Img3D name="blossom" className="size-[78%]" eager />
          </span>
          <p className="max-w-xl font-display text-2xl font-extrabold">{t('scienceLab.intro')}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={start} data-testid="lab-start">
              {t('scienceLab.start')}
            </Button>
            <Button
              variant="soft"
              size="md"
              onClick={() => setReview(true)}
              data-testid="lesson-review"
            >
              {t('learnFirst.review')}
            </Button>
          </div>
        </>
      )}

      {phase.kind === 'question' &&
        (() => {
          const question = PLANT_EXPERIMENT[phase.index]!
          return (
            <section
              aria-labelledby="lab-question"
              className="flex w-full max-w-2xl flex-col items-center gap-4"
            >
              <p className="text-base font-semibold text-ink-soft tabular-nums">
                {t('scienceLab.progress', { n: phase.index + 1, total: PLANT_EXPERIMENT.length })}
              </p>
              <h2
                id="lab-question"
                ref={heading}
                tabIndex={-1}
                className="font-display text-2xl font-extrabold sm:text-3xl"
              >
                {tDynamic(t, `scienceLab.questions.${question.id}`)}
              </h2>
              <ul className="flex flex-wrap justify-center gap-3 sm:gap-4">
                {question.options.map((option) => (
                  <li key={option}>
                    <button
                      type="button"
                      onClick={() => answer(phase.index, option)}
                      data-testid={`lab-option-${option}`}
                      className="flex w-28 flex-col items-center gap-1 rounded-card bg-surface p-3 shadow-press transition-transform active:translate-y-1 sm:w-36"
                    >
                      <Img3D name={option} className="size-20 sm:size-24" />
                      <span className="font-display text-lg font-bold">
                        {tDynamic(t, `scienceLab.things.${option}`)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p
                key={wrongCount}
                role="status"
                className={clsx(
                  'min-h-7 text-lg font-semibold',
                  wrongNow ? 'text-oops-ink' : 'text-ink-soft',
                )}
              >
                {wrongNow ? t('scienceLab.tryAgain') : ''}
              </p>
            </section>
          )
        })()}

      {phase.kind === 'done' && (
        <>
          <p className="font-display text-2xl font-extrabold" data-testid="lab-finished">
            {t('scienceLab.finished')}
          </p>
          <ActivityReward stars={phase.award.stars} crystals={phase.award.crystals} />
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="soft" onClick={start}>
              {t('scienceLab.again')}
            </Button>
            <LinkButton to="/home">{t('scienceLab.back')}</LinkButton>
          </div>
        </>
      )}
    </Screen>
  )
}

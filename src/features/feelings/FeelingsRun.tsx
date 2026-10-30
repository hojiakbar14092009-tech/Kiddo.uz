import clsx from 'clsx'
import type { TFunction } from 'i18next'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckIcon } from '@/components/icons'
import { Screen } from '@/components/layout/Screen'
import { SHORT_SCREEN } from '@/components/layout/shortScreen'
import { TitleTopBar } from '@/components/layout/TitleTopBar'
import { ActivityReward } from '@/components/reward/ActivityReward'
import { Button } from '@/components/ui/Button'
import { Img3D } from '@/components/ui/Img3D'
import { LinkButton } from '@/components/ui/LinkButton'
import { StepDots } from '@/components/ui/Progress'
import type { Language } from '@/content/languages'
import { useChallengeLevel } from '@/domain/learner'
import { emitActivity } from '@/domain/universe'
import { SpeakButton } from '@/features/learn/SpeakButton'
import { useSpeakable } from '@/features/learn/speakable'
import { Mascot } from '@/features/mascot/Mascot'
import { useMascot } from '@/features/mascot/useMascot'
import { newId } from '@/lib/id'
import { useChildKey } from '@/store/progressStore'
import { useLanguage } from '@/store/settingsStore'
import { ChoicePicture } from './ChoicePicture'
import { FEELING_TEXT } from './content'
import { FeelingFace } from './FeelingFace'
import { FeelingsLesson } from './FeelingsLesson'
import { feelingsLessonId } from './feelingsLessonPlan'
import { useLessonSeen } from '@/features/learn/learnStore'
import {
  buildQuestions,
  feelingsActivity,
  levelPlan,
  runResult,
  type Option,
  type Question,
  type ScoredKind,
} from './session'

interface Reward {
  stars: number
  crystals: number
}

/** One run of a scored activity; "play again" starts a fresh one. */
export function FeelingsRun({ kind }: { kind: ScoredKind }) {
  const { t } = useTranslation()
  const [run, setRun] = useState(0)
  const level = useChallengeLevel('social')
  // Learn Before Play: the faces (or kind deeds) are shown first, the first time
  // each level has its own lesson: new feelings are taught before they are asked
  const seen = useLessonSeen(feelingsLessonId(kind, level))
  const [learning, setLearning] = useState(!seen)
  if (learning) {
    return (
      <Screen header={<TitleTopBar title={t(`feelings.kinds.${kind}`)} back="/feelings" />}>
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-4">
          <FeelingsLesson kind={kind} level={level} onDone={() => setLearning(false)} />
        </div>
      </Screen>
    )
  }
  return <Run key={run} kind={kind} onAgain={() => setRun((n) => n + 1)} />
}

function Run({ kind, onAgain }: { kind: ScoredKind; onAgain: () => void }) {
  const { t } = useTranslation()
  const language = useLanguage()
  const childKey = useChildKey()
  const currentLevel = useChallengeLevel('social')
  const { react, reset } = useMascot()
  // fixed for the whole run: finishing may move the level
  const [level] = useState(currentLevel)
  const [questions] = useState(() => buildQuestions(kind, level))
  const neutralFaces = levelPlan(level).neutralFaces
  const [index, setIndex] = useState(0)
  const [tried, setTried] = useState<readonly string[]>([])
  const [picked, setPicked] = useState<Option | null>(null)
  const [reward, setReward] = useState<Reward | null>(null)
  const firstTries = useRef<boolean[]>([])
  const emitted = useRef(false)
  const feedbackRef = useRef<HTMLDivElement>(null)

  const question = questions[index]
  const solved = picked?.accepted === true
  const title = t(`feelings.kinds.${kind}`)
  const ask = question ? askLine(t, question, language) : ''
  const feedback = question && picked ? feedbackFor(t, question, picked, language) : null
  const doneText = t(kind === 'kindness' ? 'feelings.doneKindness' : 'feelings.done')

  useSpeakable(
    reward
      ? [doneText]
      : question
        ? [
            question.kind === 'faces' ? null : question.prompt[language],
            ask,
            // a child who cannot read yet hears every idea, too
            ...(question.kind === 'kindness'
              ? question.options.map((option) => option.label[language])
              : []),
            feedback?.headline,
            feedback?.body,
            feedback?.footer,
          ]
        : null,
  )

  // the robot starts quiet (the question is on screen already) and leaves with the screen
  useEffect(() => {
    reset()
    return reset
  }, [reset])

  useEffect(() => {
    if (picked) feedbackRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [picked])

  const choose = (option: Option) => {
    if (!question || solved || tried.includes(option.id)) return
    setPicked(option)
    if (option.accepted) {
      if (firstTries.current.length === index) firstTries.current.push(tried.length === 0)
      // a cheer from the robot; the panel below says why
      react('correct', undefined, { speak: false })
    } else {
      setTried((list) => [...list, option.id])
    }
  }

  const finish = () => {
    if (emitted.current) return
    emitted.current = true
    const result = runResult(firstTries.current)
    react('celebrate', { text: doneText }, { speak: false })
    try {
      const gained = emitActivity({
        id: newId(),
        childKey,
        activity: feelingsActivity(kind, level),
        strand: 'social',
        level,
        ...result,
      })
      setReward({ stars: gained.stars, crystals: gained.crystals })
    } catch {
      // the praise stays; the universe keeps its own state
      setReward({ stars: 0, crystals: 0 })
    }
  }

  const next = () => {
    if (index + 1 < questions.length) {
      setIndex(index + 1)
      setTried([])
      setPicked(null)
      reset()
    } else {
      finish()
    }
  }

  const header = <TitleTopBar title={title} back="/feelings" />

  if (reward || !question) {
    return (
      <Screen header={header}>
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-5 px-4 py-6 text-center short:gap-3 short:py-2">
          <FeelingFace
            feeling={kind === 'kindness' ? 'proud' : 'happy'}
            className="size-28 sm:size-36 short:size-20"
          />
          <p className="font-display text-2xl font-extrabold text-primary sm:text-3xl short:text-xl">
            {doneText}
          </p>
          <ActivityReward stars={reward?.stars ?? 0} crystals={reward?.crystals ?? 0} />
          <div className="flex flex-wrap justify-center gap-3">
            <LinkButton to="/feelings" variant="soft" size="md">
              {t('feelings.chooseOther')}
            </LinkButton>
            <Button size="md" onClick={onAgain}>
              {t('feelings.again')}
            </Button>
          </div>
        </div>
      </Screen>
    )
  }

  const isFeeling = question.kind !== 'kindness'
  const rows = isFeeling && question.options.length === 3

  return (
    <Screen header={header}>
      <div
        className={clsx(
          'mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 pt-3 pb-6 sm:gap-5 sm:px-6',
          SHORT_SCREEN.page,
          'short:flex-row short:items-start short:gap-4!',
        )}
      >
        {/* the question: robot, speaker, the story */}
        <div className="flex flex-col gap-3 short:w-[42%] short:shrink-0 short:gap-2">
          <div className="flex items-center gap-3">
            <Mascot
              robotClassName="w-[56px] sm:w-20 short:w-10"
              className="min-w-0 flex-1"
              talkOnlyWhileSpeaking
            />
            <SpeakButton fallback={[ask]} />
          </div>
          <StepDots
            current={index}
            total={questions.length}
            label={t('feelings.steps', { current: index + 1, total: questions.length })}
            className="justify-center"
          />
          {question.kind === 'faces' ? (
            <p className="text-center font-display text-2xl leading-tight font-extrabold sm:text-3xl short:text-lg">
              {question.prompt[language]}
            </p>
          ) : (
            <div className="flex items-center gap-3 rounded-card bg-surface p-3 shadow-press sm:gap-4 sm:p-4 short:p-2">
              {question.picture && (
                <Img3D
                  name={question.picture}
                  eager
                  className="size-16 shrink-0 sm:size-24 short:size-12"
                />
              )}
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-lg leading-snug sm:text-xl short:text-base">
                  {question.prompt[language]}
                </p>
                <p className="font-display text-xl leading-tight font-extrabold text-primary-ink sm:text-2xl short:text-base">
                  {ask}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* the answers and what the child's choice means */}
        <div className="flex flex-col gap-4 short:min-w-0 short:flex-1 short:gap-2">
          <div
            role="group"
            aria-label={t('feelings.answers')}
            className={clsx(
              'grid gap-3 sm:gap-4',
              isFeeling
                ? question.options.length === 2
                  ? 'mx-auto w-full max-w-md grid-cols-2'
                  : // a narrow phone lists three faces as rows, so long names fit
                    'mx-auto w-full max-w-2xl grid-cols-1 min-[400px]:grid-cols-3'
                : 'grid-cols-1',
            )}
          >
            {question.options.map((option) => {
              const wasTried = tried.includes(option.id)
              const isAnswer = solved && option.id === picked?.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => choose(option)}
                  aria-disabled={wasTried || solved}
                  data-testid="feelings-option"
                  className={clsx(
                    'relative flex rounded-card font-display font-bold text-ink transition-[transform,box-shadow,opacity] active:translate-y-1',
                    isFeeling
                      ? clsx(
                          'flex-col items-center justify-center gap-1 p-2 text-base leading-tight sm:p-3 sm:text-xl short:p-1.5 short:text-sm',
                          rows &&
                            'max-[399px]:flex-row max-[399px]:justify-start max-[399px]:gap-3 max-[399px]:px-3 max-[399px]:text-lg',
                        )
                      : 'min-h-16 items-center gap-3 py-2 pr-10 pl-2 text-left text-lg leading-snug sm:gap-4 sm:text-xl short:min-h-14 short:py-1.5 short:text-base',
                    isAnswer
                      ? 'bg-primary-soft shadow-press-primary ring-4 ring-primary'
                      : wasTried
                        ? 'bg-muted opacity-60 shadow-press-sm'
                        : 'bg-surface shadow-press',
                    solved && !isAnswer && 'opacity-60',
                  )}
                >
                  {option.feeling && (
                    <FeelingFace
                      feeling={option.feeling}
                      neutral={neutralFaces}
                      className={clsx(
                        'aspect-square w-full max-w-36 shrink-0 short:max-w-16',
                        rows && 'max-[399px]:w-14',
                      )}
                    />
                  )}
                  {option.picture && (
                    <ChoicePicture
                      id={option.picture}
                      className="h-20 w-auto shrink-0 rounded-tile sm:h-24 short:h-14"
                    />
                  )}
                  <span
                    className={clsx(
                      isFeeling && 'min-h-[2lh] content-center text-center short:min-h-0',
                      rows && 'max-[399px]:min-h-0 max-[399px]:text-left',
                    )}
                  >
                    {option.label[language]}
                  </span>
                  {isAnswer && (
                    <span className="absolute -top-2 -right-2 flex size-10 items-center justify-center rounded-full border-4 border-cream bg-primary text-white">
                      <CheckIcon size={20} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div ref={feedbackRef} aria-live="polite" className="scroll-mb-4">
            {feedback && (
              <div
                data-testid="feelings-feedback"
                className={clsx(
                  'flex animate-fade-in flex-col gap-2 rounded-card p-4 short:flex-row short:items-center short:gap-3 short:p-2',
                  solved ? 'bg-primary-soft' : 'bg-coin-soft',
                )}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="font-display text-xl font-extrabold short:text-base">
                    {feedback.headline}
                  </p>
                  {feedback.body && (
                    <p className="text-lg leading-snug short:text-sm">{feedback.body}</p>
                  )}
                  {feedback.footer && (
                    <p className="text-lg font-bold text-ink-soft short:text-sm">
                      {feedback.footer}
                    </p>
                  )}
                </div>
                {solved && (
                  <Button size="md" onClick={next} className="self-center short:min-h-12">
                    {index + 1 < questions.length ? t('feelings.next') : t('feelings.finish')}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Screen>
  )
}

// `TFunction`, not `ReturnType<typeof useTranslation>['t']`, which is too deep for tsc (TS2589)
type T = TFunction

function askLine(t: T, question: Question, language: Language): string {
  if (question.kind === 'faces') return question.prompt[language]
  if (question.kind === 'scenes') {
    return t('feelings.askScene', { name: question.name?.[language] ?? '' })
  }
  return t('feelings.askKindness')
}

interface Feedback {
  headline: string
  body?: string
  footer?: string
}

/**
 * Kind words for every choice: praise for the fitting one and for a kind idea
 * (which says what could make it even kinder), another look or idea for the rest.
 */
function feedbackFor(t: T, question: Question, option: Option, language: Language): Feedback {
  if (question.kind === 'kindness') {
    if (option.best) return { headline: t('feelings.best'), body: option.explain?.[language] }
    return option.accepted
      ? { headline: t('feelings.good'), body: option.explain?.[language] }
      : {
          headline: option.label[language],
          body: option.explain?.[language],
          footer: t('feelings.anotherIdea'),
        }
  }
  if (option.best) {
    return {
      headline: t('feelings.right'),
      body: question.why ? `${t('feelings.why')} ${question.why[language]}` : undefined,
    }
  }
  if (question.kind === 'faces' && option.feeling) {
    return {
      headline: FEELING_TEXT[option.feeling].looks[language],
      body: t('feelings.tryFace'),
    }
  }
  return { headline: t('feelings.tryScene') }
}

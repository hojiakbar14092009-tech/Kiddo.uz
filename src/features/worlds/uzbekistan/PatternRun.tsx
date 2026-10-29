import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ACTIVITY_LESSONS } from '@/domain/learning'
import { useLessonSeen } from '@/features/learn/learnStore'
import { UzLesson } from './UzLesson'
import { CheckIcon } from '@/components/icons'
import { Screen } from '@/components/layout/Screen'
import { Button } from '@/components/ui/Button'
import { StepDots } from '@/components/ui/Progress'
import { SpeakButton } from '@/features/learn/SpeakButton'
import { useSpeakable } from '@/features/learn/speakable'
import { useMascot } from '@/features/mascot/useMascot'
import { useLanguage } from '@/store/settingsStore'
import { ClothBorder, MotifArt } from './art'
import { MOTIF_NAMES, type MotifId } from './content'
import { buildPatternRounds } from './generators'
import { GameHeader, RunDone } from './run'
import { useGameRun } from './useGameRun'

/** "Patterns": continue a suzani / atlas border (strand 'logic'). */
export function PatternRun() {
  const [run, setRun] = useState(0)
  // Learn Before Play: the lesson first (and again whenever the child asks)
  const seen = useLessonSeen(ACTIVITY_LESSONS.uzPatterns)
  const [review, setReview] = useState(false)
  if (!seen || review) return <UzLesson kind="patterns" onDone={() => setReview(false)} />
  return (
    <Run
      key={run}
      onAgain={() => setRun((n) => n + 1)}
      onReview={() => {
        setReview(true)
        setRun((n) => n + 1)
      }}
    />
  )
}

function Run({ onAgain, onReview }: { onAgain: () => void; onReview: () => void }) {
  const { t } = useTranslation()
  const language = useLanguage()
  const { react, reset } = useMascot()
  const doneText = t('uzbekistan.patterns.done')
  const { level, reward, finish } = useGameRun('patterns', doneText)
  const [rounds] = useState(() => buildPatternRounds(level))
  const [index, setIndex] = useState(0)
  const [tried, setTried] = useState<readonly MotifId[]>([])
  const [solved, setSolved] = useState(false)
  const firstTries = useRef<boolean[]>([])
  const feedbackRef = useRef<HTMLDivElement>(null)

  const round = rounds[index]
  const ask = t('uzbekistan.patterns.ask')
  const feedback = solved
    ? t('uzbekistan.patterns.right')
    : tried.length > 0
      ? t('uzbekistan.patterns.wrong')
      : null

  useSpeakable(reward ? null : [ask, feedback])

  useEffect(() => {
    reset()
    return reset
  }, [reset])

  useEffect(() => {
    if (feedback) feedbackRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [feedback])

  const choose = (motif: MotifId) => {
    if (!round || solved || tried.includes(motif)) return
    if (motif === round.answer) {
      if (firstTries.current.length === index) firstTries.current.push(tried.length === 0)
      setSolved(true)
      react('correct', undefined, { speak: false })
    } else {
      setTried((list) => [...list, motif])
    }
  }

  const next = () => {
    if (index + 1 < rounds.length) {
      setIndex(index + 1)
      setTried([])
      setSolved(false)
      reset()
    } else {
      finish(firstTries.current)
    }
  }

  if (reward || !round) {
    return (
      <RunDone
        kind="patterns"
        onReview={onReview}
        reward={reward ?? { stars: 0, crystals: 0 }}
        doneText={doneText}
        onAgain={onAgain}
        art={
          <span className="flex gap-1">
            {(['rosette', 'ikat', 'rosette'] as const).map((id, i) => (
              <MotifArt key={i} id={id} className="size-20 short:size-14" />
            ))}
          </span>
        }
      />
    )
  }

  return (
    <Screen header={<GameHeader kind="patterns" />}>
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 pt-3 pb-6 sm:gap-5 sm:px-6 short:gap-2 short:py-2">
        <StepDots
          current={index}
          total={rounds.length}
          label={t('uzbekistan.steps', { current: index + 1, total: rounds.length })}
          className="justify-center"
        />
        <div className="flex items-center justify-center gap-3">
          <p className="text-center font-display text-xl leading-tight font-extrabold sm:text-2xl short:text-lg">
            {ask}
          </p>
          <SpeakButton fallback={[ask]} />
        </div>

        {/* the border, like the edge of a suzani */}
        <div className="overflow-hidden rounded-panel bg-[#fff6e6] shadow-press">
          <ClothBorder className="h-3 w-full" />
          <ol
            aria-label={t('uzbekistan.patterns.border')}
            data-testid="uz-pattern-row"
            className="flex flex-wrap justify-center gap-1.5 p-3 sm:gap-2 sm:p-4 short:p-2"
          >
            {round.cells.map((motif, cell) => (
              <li
                key={cell}
                className={clsx(
                  'flex size-12 items-center justify-center rounded-tile sm:size-16 short:size-11',
                  motif === null && !solved
                    ? 'border-4 border-dashed border-coin bg-coin-soft'
                    : 'bg-white shadow-press-sm',
                )}
              >
                {motif === null ? (
                  solved ? (
                    <MotifArt id={round.answer} className="size-[80%] animate-pop-in" />
                  ) : (
                    <span
                      className="font-display text-2xl font-extrabold text-coin-shadow"
                      data-testid="uz-pattern-gap"
                    >
                      <span aria-hidden="true">?</span>
                      <span className="sr-only">{t('uzbekistan.patterns.gap')}</span>
                    </span>
                  )
                ) : (
                  <>
                    <MotifArt id={motif} className="size-[80%]" />
                    <span className="sr-only">{MOTIF_NAMES[motif][language]}</span>
                  </>
                )}
              </li>
            ))}
          </ol>
          <ClothBorder className="h-3 w-full" />
        </div>

        <div
          role="group"
          aria-label={t('uzbekistan.patterns.choices')}
          className="flex flex-wrap justify-center gap-3 sm:gap-4"
        >
          {round.choices.map((motif) => {
            const wasTried = tried.includes(motif)
            const isAnswer = solved && motif === round.answer
            return (
              <button
                key={motif}
                type="button"
                onClick={() => choose(motif)}
                aria-label={MOTIF_NAMES[motif][language]}
                aria-disabled={wasTried || solved}
                data-testid="uz-pattern-choice"
                data-motif={motif}
                className={clsx(
                  'relative flex size-20 items-center justify-center rounded-card transition-transform active:translate-y-1 sm:size-24 short:size-16',
                  isAnswer
                    ? 'bg-primary-soft shadow-press-primary ring-4 ring-primary'
                    : wasTried
                      ? 'bg-muted opacity-50 shadow-press-sm'
                      : 'bg-surface shadow-press',
                  solved && !isAnswer && 'opacity-50',
                )}
              >
                <MotifArt id={motif} className="size-[72%]" />
                {isAnswer && (
                  <span className="absolute -top-2 -right-2 flex size-9 items-center justify-center rounded-full border-4 border-cream bg-primary text-white">
                    <CheckIcon size={18} />
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div
          ref={feedbackRef}
          className="flex scroll-mb-4 flex-col items-center gap-3 short:flex-row short:justify-center"
        >
          <div aria-live="polite" className="w-full max-w-xl">
            {feedback && (
              <p
                data-testid="uz-feedback"
                className={clsx(
                  'animate-fade-in rounded-card p-3 text-center font-display text-lg font-bold short:p-2 short:text-base',
                  solved ? 'bg-primary-soft text-primary-ink' : 'bg-coin-soft text-ink',
                )}
              >
                {feedback}
              </p>
            )}
          </div>
          {solved && (
            <Button size="md" onClick={next} className="short:min-h-12">
              {index + 1 < rounds.length ? t('uzbekistan.next') : t('uzbekistan.finish')}
            </Button>
          )}
        </div>
      </div>
    </Screen>
  )
}

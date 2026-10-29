import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ACTIVITY_LESSONS } from '@/domain/learning'
import { useLessonSeen } from '@/features/learn/learnStore'
import { UzLesson } from './UzLesson'
import { Screen } from '@/components/layout/Screen'
import { Button } from '@/components/ui/Button'
import { StepDots } from '@/components/ui/Progress'
import { SpeakButton } from '@/features/learn/SpeakButton'
import { useSpeakable } from '@/features/learn/speakable'
import { useMascot } from '@/features/mascot/useMascot'
import { useLanguage } from '@/store/settingsStore'
import { PictureView } from './art'
import { CITIES, type CityId } from './content'
import { buildMapRounds, type MapRound } from './generators'
import { GameHeader, RunDone } from './run'
import { useGameRun } from './useGameRun'
import { MapShape, UzMap } from './UzMap'

/** "Map of Uzbekistan": tap the city that matches the picture and the words. */
export function MapRun() {
  const [run, setRun] = useState(0)
  // Learn Before Play: the lesson first (and again whenever the child asks)
  const seen = useLessonSeen(ACTIVITY_LESSONS.uzMap)
  const [review, setReview] = useState(false)
  if (!seen || review) return <UzLesson kind="map" onDone={() => setReview(false)} />
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

function promptText(round: MapRound, language: 'uz' | 'ru' | 'en'): string {
  const city = CITIES[round.answer]
  return city[round.prompt][language]
}

function Run({ onAgain, onReview }: { onAgain: () => void; onReview: () => void }) {
  const { t } = useTranslation()
  const language = useLanguage()
  const { react, reset } = useMascot()
  const doneText = t('uzbekistan.map.done')
  const { level, reward, finish } = useGameRun('map', doneText)
  const [rounds] = useState(() => buildMapRounds(level))
  const [index, setIndex] = useState(0)
  const [tried, setTried] = useState<readonly CityId[]>([])
  const [solved, setSolved] = useState<CityId | null>(null)
  const [last, setLast] = useState<CityId | null>(null)
  const firstTries = useRef<boolean[]>([])
  const feedbackRef = useRef<HTMLDivElement>(null)

  const round = rounds[index]
  const prompt = round ? promptText(round, language) : ''
  const feedback = last
    ? t(solved ? 'uzbekistan.map.right' : 'uzbekistan.map.wrong', {
        city: CITIES[last].name[language],
      })
    : null

  useSpeakable(reward ? null : [prompt, feedback])

  useEffect(() => {
    reset()
    return reset
  }, [reset])

  useEffect(() => {
    if (last) feedbackRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [last, solved])

  const pick = (city: CityId) => {
    if (!round || solved || tried.includes(city)) return
    setLast(city)
    if (city === round.answer) {
      if (firstTries.current.length === index) firstTries.current.push(tried.length === 0)
      setSolved(city)
      react('correct', undefined, { speak: false })
    } else {
      setTried((list) => [...list, city])
    }
  }

  const next = () => {
    if (index + 1 < rounds.length) {
      setIndex(index + 1)
      setTried([])
      setSolved(null)
      setLast(null)
      reset()
    } else {
      finish(firstTries.current)
    }
  }

  if (reward || !round) {
    return (
      <RunDone
        kind="map"
        onReview={onReview}
        reward={reward ?? { stars: 0, crystals: 0 }}
        doneText={doneText}
        onAgain={onAgain}
        art={<MapShape className="h-full w-auto" />}
      />
    )
  }

  return (
    <Screen header={<GameHeader kind="map" />}>
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-3 px-4 pt-3 pb-6 sm:gap-4 sm:px-6 short:grid short:grid-cols-[minmax(0,38%)_minmax(0,1fr)] short:content-start short:items-start short:gap-x-4 short:gap-y-2 short:py-2">
        <div className="flex flex-col gap-2 short:col-start-1 short:row-start-1">
          <StepDots
            current={index}
            total={rounds.length}
            label={t('uzbekistan.steps', { current: index + 1, total: rounds.length })}
            className="justify-center"
          />
          <div className="flex items-center gap-3 rounded-card bg-surface p-3 shadow-press short:gap-2 short:p-2">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-tile bg-sky-soft p-1 sm:size-20 short:size-12">
              <PictureView picture={CITIES[round.answer].picture} className="size-full" />
            </div>
            <p
              className="min-w-0 flex-1 font-display text-xl leading-tight font-extrabold sm:text-2xl short:text-base"
              data-testid="uz-map-prompt"
            >
              {prompt}
            </p>
            <SpeakButton fallback={[prompt]} />
          </div>
          {!round.labels && (
            <p className="text-center text-base text-ink-soft short:text-sm">
              {t('uzbekistan.map.noNames')}
            </p>
          )}
        </div>

        <div className="mx-auto w-full max-w-3xl short:col-start-2 short:row-span-2 short:row-start-1 short:max-w-[calc((100dvh-5.5rem)*1.52)]">
          <UzMap
            cities={round.cities}
            labels={round.labels}
            tried={tried}
            solved={solved}
            language={language}
            onPick={pick}
          />
        </div>

        <div
          ref={feedbackRef}
          className="flex scroll-mb-4 flex-col items-center gap-3 short:col-start-1 short:row-start-2 short:gap-2"
        >
          <div aria-live="polite" className="w-full max-w-xl">
            {feedback && <Feedback text={feedback} solved={solved !== null} />}
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

function Feedback({ text, solved }: { text: string; solved: boolean }) {
  return (
    <p
      data-testid="uz-feedback"
      className={clsx(
        'animate-fade-in rounded-card p-3 text-center font-display text-lg font-bold short:p-2 short:text-base',
        solved ? 'bg-primary-soft text-primary-ink' : 'bg-coin-soft text-ink',
      )}
    >
      {text}
    </p>
  )
}

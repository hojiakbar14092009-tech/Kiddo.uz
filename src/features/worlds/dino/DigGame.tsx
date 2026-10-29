import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { BrushIcon, BulbIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { useChallengeLevel, type ChallengeLevel } from '@/domain/learner'
import { ChoiceGrid, type ChoiceStatus } from '@/features/learn/ChoiceGrid'
import { useLearnMascot } from '@/features/learn/useLearnMascot'
import type { DinoId } from './content'
import {
  brushAt,
  brushNextRow,
  clearedShare,
  DIG_LEVELS,
  newSand,
  planDig,
  UNCOVERED,
  type DigBone,
} from './dig'
import { DINO_ROOT } from './explore'
import { ACTIVITY_LESSONS } from '@/domain/learning'
import { useLessonSeen } from '@/features/learn/learnStore'
import { DinoLesson } from './DinoLesson'
import { BoneShape, ChoiceName, DinoFrame, DinoPicture, StartCard } from './parts'
import { DinoResult } from './run'
import { NEXT_DELAY_MS, useDinoRecorder, useStepLabel, type DinoFinished } from './session'
import { fill, useDinoText } from './text'

const BACK = DINO_ROOT

/** `/worlds/dino/dig`: a start card, then one dig at the child's 'science' level. */
export function DigGame() {
  const level = useChallengeLevel('science')
  const [run, setRun] = useState<{ count: number; level: ChallengeLevel } | null>(null)
  const text = useDinoText()
  const { t } = useTranslation()
  const { say } = useLearnMascot()
  // Learn Before Play: "whose bone is this?" needs the animals and their bones first
  const seen = useLessonSeen(ACTIVITY_LESSONS.dinoAnimals)
  const [review, setReview] = useState(false)

  useEffect(() => {
    if (!run) say('greet', { text: text.modes.dig.title, emoji: '🦴' })
  }, [run, say, text.modes.dig.title])

  if (!run && (!seen || review)) {
    return <DinoLesson title={text.modes.dig.title} back={BACK} onDone={() => setReview(false)} />
  }

  if (!run) {
    return (
      <DinoFrame
        title={text.modes.dig.title}
        back={BACK}
        speak={[text.modes.dig.title, text.dig.how]}
      >
        <StartCard
          picture={
            <span className="flex size-28 items-center justify-center rounded-tile bg-[#e8c88a] sm:size-36 short:size-20">
              <BoneShape dino="stegosaurus" className="size-3/4" />
            </span>
          }
          title={text.modes.dig.title}
          text={text.dig.how}
          action={
            <div className="flex flex-wrap items-center justify-center gap-2 short:justify-start">
              <Button onClick={() => setRun({ count: 1, level })} data-testid="dig-start">
                {text.dig.start}
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
          }
        />
      </DinoFrame>
    )
  }
  return (
    <DigRun
      key={run.count}
      level={run.level}
      onAgain={() => setRun({ count: run.count + 1, level })}
    />
  )
}

/**
 * The sand over a bone. A finger or the mouse brushes it away (tap or drag);
 * the keyboard (Enter / Space on the focused sand) clears it row by row.
 */
function SandBoard({
  dino,
  level,
  uncovered,
  onUncovered,
}: {
  dino: DinoId
  level: ChallengeLevel
  uncovered: boolean
  onUncovered: () => void
}) {
  const text = useDinoText()
  const { grid, brush } = DIG_LEVELS[level]
  const [cleared, setCleared] = useState(() => newSand(grid))
  const board = useRef<HTMLButtonElement>(null)
  const brushing = useRef(false)
  const share = clearedShare(cleared)
  const left = uncovered ? 0 : Math.round((1 - share) * 100)

  useEffect(() => {
    if (!uncovered && share >= UNCOVERED) onUncovered()
  }, [onUncovered, share, uncovered])

  const brushPoint = (clientX: number, clientY: number) => {
    const rect = board.current?.getBoundingClientRect()
    if (!rect || rect.width === 0 || uncovered) return
    const x = ((clientX - rect.left) / rect.width) * grid
    const y = ((clientY - rect.top) / rect.height) * grid
    setCleared((current) => brushAt(current, grid, x, y, brush))
  }

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    brushing.current = true
    event.currentTarget.setPointerCapture?.(event.pointerId)
    brushPoint(event.clientX, event.clientY)
  }
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (brushing.current) brushPoint(event.clientX, event.clientY)
  }
  const onPointerEnd = () => {
    brushing.current = false
  }
  // a click without a pointer (Enter / Space) brushes the next row
  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail === 0 && !uncovered) setCleared((current) => brushNextRow(current, grid))
  }

  return (
    <button
      ref={board}
      type="button"
      disabled={uncovered}
      aria-label={`${text.dig.brush}. ${fill(text.dig.sandLeft, { percent: left })}`}
      data-testid="dig-board"
      data-share={share.toFixed(2)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onClick={onClick}
      className="relative aspect-square w-full touch-none overflow-hidden rounded-panel bg-[#b98b55] shadow-press-lg select-none focus-visible:ring-4 focus-visible:ring-primary disabled:cursor-default"
    >
      <BoneShape dino={dino} className="absolute inset-[8%] size-[84%]" />
      <span
        aria-hidden="true"
        className="absolute inset-0 grid"
        style={{ gridTemplateColumns: `repeat(${grid}, 1fr)` }}
      >
        {cleared.map((done, index) => (
          <span
            key={index}
            className={clsx(
              'bg-[#e8c88a] bg-[radial-gradient(#c9a465_1.5px,transparent_1.6px)] bg-[length:12px_12px] transition-opacity duration-300 motion-reduce:transition-none',
              (done || uncovered) && 'opacity-0',
            )}
          />
        ))}
      </span>
      {!uncovered && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-surface/90 px-3 py-1 font-display text-base font-bold text-ink"
        >
          <BrushIcon size={18} />
          {left}%
        </span>
      )}
    </button>
  )
}

function DigRun({ level, onAgain }: { level: ChallengeLevel; onAgain: () => void }) {
  const text = useDinoText()
  const stepLabel = useStepLabel()
  const { say, reset } = useLearnMascot()
  const [bones] = useState<DigBone[]>(() => planDig(level))
  const record = useDinoRecorder('dig', level)
  const [index, setIndex] = useState(0)
  const [uncovered, setUncovered] = useState(false)
  const [statuses, setStatuses] = useState<Record<string, ChoiceStatus>>({})
  const [misses, setMisses] = useState(0)
  const [solved, setSolved] = useState(false)
  const [firstTry, setFirstTry] = useState(0)
  const [finished, setFinished] = useState<DinoFinished | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const question = useRef<HTMLDivElement>(null)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  useEffect(() => {
    reset()
  }, [index, reset])

  const bone = bones[index]
  const markUncovered = useCallback(() => setUncovered(true), [])

  // once the bone shows, the question comes into view (it may be below the sand on a phone)
  useEffect(() => {
    if (uncovered) {
      say('correct', { text: text.dig.found, emoji: '🦴' })
      question.current?.scrollIntoView?.({ block: 'nearest' })
    }
  }, [say, text.dig.found, uncovered])

  if (finished) {
    return (
      <DinoResult
        title={text.modes.dig.title}
        back={BACK}
        level={level}
        finished={finished}
        onAgain={onAgain}
      />
    )
  }
  if (!bone) return null

  const hint = fill(text.dig.hint, { part: text.dinos[bone.dino].bone })

  const answer = (value: string) => {
    if (solved) return
    if (value === bone.dino) {
      const right = firstTry + (misses === 0 ? 1 : 0)
      setFirstTry(right)
      setStatuses((s) => ({ ...s, [value]: 'correct' }))
      setSolved(true)
      say('correct')
      if (index + 1 >= bones.length) {
        const done = record({ total: bones.length, firstTry: right })
        timer.current = window.setTimeout(() => done && setFinished(done), NEXT_DELAY_MS)
      } else {
        timer.current = window.setTimeout(() => {
          setIndex(index + 1)
          setUncovered(false)
          setStatuses({})
          setMisses(0)
          setSolved(false)
        }, NEXT_DELAY_MS)
      }
      return
    }
    const count = misses + 1
    setMisses(count)
    setStatuses((s) => ({
      ...s,
      [value]: 'wrong',
      ...(count >= 2 ? { [bone.dino]: 'hint' as const } : {}),
    }))
    say('wrong', { text: hint, emoji: '💡' })
  }

  const prompt = uncovered ? text.dig.whose : text.dig.how
  const choices = bone.options.map((id) => ({
    id,
    label: text.dinos[id].name,
    content: (
      <>
        <DinoPicture id={id} eager className="min-h-0 w-full flex-1 scale-125" />
        <ChoiceName name={text.dinos[id].name} />
      </>
    ),
  }))

  return (
    <DinoFrame
      title={text.modes.dig.title}
      back={BACK}
      speak={[prompt]}
      hideMascotShort
      step={{ current: index, total: bones.length, label: stepLabel(index, bones.length) }}
    >
      <section
        key={index}
        data-testid="dig-run"
        data-dino={bone.dino}
        data-level={level}
        data-uncovered={uncovered ? 'true' : 'false'}
        className="mx-auto grid w-full max-w-5xl items-start gap-4 sm:gap-6 lg:grid-cols-2 short:grid-cols-[auto_1fr] short:items-center short:gap-4"
      >
        <div className="mx-auto w-full max-w-sm short:w-[calc(100dvh-10.5rem)] short:max-w-none">
          <SandBoard
            dino={bone.dino}
            level={level}
            uncovered={uncovered}
            onUncovered={markUncovered}
          />
        </div>
        <div ref={question} className="flex min-w-0 flex-col items-center gap-3">
          <h2
            aria-live="polite"
            data-testid="dig-prompt"
            className="text-center font-display text-2xl leading-tight font-extrabold sm:text-3xl short:text-xl"
          >
            {prompt}
          </h2>
          {uncovered ? (
            <>
              {misses > 0 && !solved && (
                <p className="flex items-center gap-2 rounded-card bg-coin-soft px-4 py-2 text-lg font-bold short:text-base">
                  <BulbIcon size={24} className="shrink-0 text-coin-shadow" />
                  {hint}
                </p>
              )}
              <ChoiceGrid
                choices={choices}
                statuses={statuses}
                onChoose={answer}
                disabled={solved}
                className={clsx('short:gap-3', choices.length === 4 && 'sm:grid-cols-2!')}
                cardClassName="min-h-24 gap-1 p-1.5 max-sm:aspect-[3/4] sm:p-3 short:aspect-auto short:h-24 short:min-h-0 short:p-2"
              />
            </>
          ) : (
            <p className="text-center text-lg text-ink-soft">
              {fill(text.dig.step, { current: index + 1, total: bones.length })}
            </p>
          )}
        </div>
      </section>
    </DinoFrame>
  )
}

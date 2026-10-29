import clsx from 'clsx'
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
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
import { ClothBorder, FoodArt, TableItemArt } from './art'
import { isFood, OTHERS, TABLE_TEXT, tableItemLabel, type TableItemId } from './content'
import { askText, buildTableRounds } from './generators'
import { GameHeader, RunDone } from './run'
import { useGameRun } from './useGameRun'

/** Moving less than this (px) is a tap, not a drag. */
const DRAG_THRESHOLD = 8

interface Drag {
  id: TableItemId
  pointerId: number
  x: number
  y: number
  dx: number
  dy: number
  moved: boolean
}

/**
 * "Dasturxon": set the table. Three equal ways to put something on it: tap
 * it, drag it onto the cloth (pointer events: finger, mouse, pen), or Enter /
 * Space. Something that does not belong comes back with a kind word; nothing
 * is timed.
 */
export function TableRun() {
  const [run, setRun] = useState(0)
  // Learn Before Play: the lesson first (and again whenever the child asks)
  const seen = useLessonSeen(ACTIVITY_LESSONS.uzTable)
  const [review, setReview] = useState(false)
  if (!seen || review) return <UzLesson kind="table" onDone={() => setReview(false)} />
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
  const doneText = t('uzbekistan.table.done')
  const { level, reward, finish } = useGameRun('table', doneText)
  const [rounds] = useState(() => buildTableRounds(level))
  const [index, setIndex] = useState(0)
  const [placed, setPlaced] = useState<readonly TableItemId[]>([])
  const [note, setNote] = useState<string | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const mistake = useRef(false)
  const firstTries = useRef<boolean[]>([])
  const cloth = useRef<HTMLDivElement>(null)

  const round = rounds[index]
  const ask = round ? askText(round, language) : ''
  const solved = round ? round.targets.every((id) => placed.includes(id)) : false
  const feedback = solved ? t('uzbekistan.table.ready') : note

  useSpeakable(reward ? null : [ask, feedback])

  useEffect(() => {
    reset()
    return reset
  }, [reset])

  const put = (id: TableItemId) => {
    if (!round || solved || placed.includes(id)) return
    if (round.targets.includes(id)) {
      const next = [...placed, id]
      setPlaced(next)
      setNote(null)
      if (round.targets.every((target) => next.includes(target))) {
        if (firstTries.current.length === index) firstTries.current.push(!mistake.current)
        react('correct', undefined, { speak: false })
      }
    } else {
      mistake.current = true
      setNote(isFood(id) ? TABLE_TEXT.notNow[language] : OTHERS[id].why[language])
    }
  }

  const next = () => {
    if (index + 1 < rounds.length) {
      setIndex(index + 1)
      setPlaced([])
      setNote(null)
      mistake.current = false
      reset()
    } else {
      finish(firstTries.current)
    }
  }

  const overCloth = (x: number, y: number) => {
    const rect = cloth.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return false
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
  }

  const onPointerDown = (id: TableItemId) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (solved || (e.pointerType === 'mouse' && e.button !== 0)) return
    const target = e.currentTarget
    if (typeof target.setPointerCapture === 'function') target.setPointerCapture(e.pointerId)
    setDrag({ id, pointerId: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0, moved: false })
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag || drag.pointerId !== e.pointerId) return
    const dx = e.clientX - drag.x
    const dy = e.clientY - drag.y
    setDrag({ ...drag, dx, dy, moved: drag.moved || Math.hypot(dx, dy) > DRAG_THRESHOLD })
  }
  const onPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag || drag.pointerId !== e.pointerId) return
    const { id, moved } = drag
    setDrag(null)
    // a tap puts it on the table; a drag only when it ends over the cloth
    if (!moved || overCloth(e.clientX, e.clientY)) put(id)
  }

  if (reward || !round) {
    return (
      <RunDone
        kind="table"
        onReview={onReview}
        reward={reward ?? { stars: 0, crystals: 0 }}
        doneText={doneText}
        onAgain={onAgain}
        art={
          <span className="flex gap-2">
            <FoodArt id="non" className="size-24 short:size-16" />
            <FoodArt id="choy" className="size-24 short:size-16" />
          </span>
        }
      />
    )
  }

  return (
    <Screen header={<GameHeader kind="table" />}>
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-3 px-4 pt-3 pb-6 sm:gap-4 sm:px-6 short:gap-2 short:py-2">
        <StepDots
          current={index}
          total={rounds.length}
          label={t('uzbekistan.steps', { current: index + 1, total: rounds.length })}
          className="justify-center"
        />
        <div className="flex items-center gap-3 rounded-card bg-surface p-3 shadow-press short:p-2">
          <p
            className="min-w-0 flex-1 font-display text-xl leading-tight font-extrabold sm:text-2xl short:text-lg"
            data-testid="uz-table-ask"
          >
            {ask}
          </p>
          <SpeakButton fallback={[ask]} />
        </div>

        <div className="grid grid-cols-1 gap-3 min-[600px]:grid-cols-2 sm:gap-4 short:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] short:gap-3">
          {/* the cloth: drop target and what is on it now */}
          <div
            ref={cloth}
            data-testid="uz-cloth"
            data-count={placed.length}
            className={clsx(
              'flex min-h-28 flex-col overflow-hidden sm:min-h-40 rounded-panel bg-[#fff6e6] shadow-press transition-colors min-[600px]:order-2 short:order-2 short:min-h-32',
              drag?.moved && 'ring-4 ring-coin',
            )}
          >
            <ClothBorder className="h-3 w-full" />
            <ul
              aria-label={t('uzbekistan.table.cloth', { count: placed.length })}
              className="flex flex-1 flex-wrap content-center items-center justify-center gap-2 p-3 short:p-2"
            >
              {placed.length === 0 && (
                <li aria-hidden="true" className="font-display text-lg font-bold text-ink-soft/60">
                  {t('uzbekistan.games.table.title')}
                </li>
              )}
              {placed.map((id) => (
                <li key={id} className="flex animate-pop-in flex-col items-center">
                  <TableItemArt id={id} className="size-14 sm:size-16 short:size-11" />
                  <span className="sr-only">{tableItemLabel(id)[language]}</span>
                </li>
              ))}
            </ul>
            <ClothBorder className="h-3 w-full" />
          </div>

          <div className="flex flex-col gap-2 min-[600px]:order-1 short:order-1">
            <p className="text-center text-base text-ink-soft max-sm:hidden short:hidden">
              {t('uzbekistan.table.hint')}
            </p>
            <ul
              aria-label={t('uzbekistan.table.tray')}
              className="flex flex-wrap content-center justify-center gap-2 rounded-panel bg-surface/70 p-2 sm:gap-3 sm:p-3"
            >
              {round.items.map((id) => {
                if (placed.includes(id)) {
                  // its place stays, empty, so the next tap never lands on a picture that moved
                  return (
                    <li
                      key={id}
                      aria-hidden="true"
                      className="h-[5.25rem] w-[5.25rem] rounded-tile border-2 border-dashed border-line-strong sm:h-[6rem] sm:w-24 short:h-[4.25rem] short:w-[4.5rem]"
                    />
                  )
                }
                const label = tableItemLabel(id)[language]
                const dragging = drag?.id === id && drag.moved
                return (
                  <li key={id}>
                    <button
                      type="button"
                      aria-label={t('uzbekistan.table.put', { item: label })}
                      data-testid="uz-table-item"
                      data-item={id}
                      disabled={solved}
                      onPointerDown={onPointerDown(id)}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                      onPointerCancel={() => setDrag(null)}
                      // keyboard (Enter / Space) has no pointer: it puts it on like a tap
                      onClick={(e) => e.detail === 0 && put(id)}
                      style={
                        dragging
                          ? { transform: `translate(${drag.dx}px, ${drag.dy}px)` }
                          : undefined
                      }
                      className={clsx(
                        'relative flex w-[5.25rem] touch-none flex-col items-center gap-0.5 rounded-tile bg-white p-1.5 shadow-press-sm select-none sm:w-24 short:w-[4.5rem] short:p-1',
                        dragging && 'z-10 scale-110 shadow-press-lg',
                      )}
                    >
                      <TableItemArt id={id} className="size-12 sm:size-14 short:size-10" />
                      <span className="w-full truncate text-center text-sm leading-tight font-bold">
                        {label}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 short:flex-row short:justify-center">
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

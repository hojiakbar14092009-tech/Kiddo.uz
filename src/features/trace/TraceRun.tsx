import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { CheckIcon } from '@/components/icons'
import { Screen } from '@/components/layout/Screen'
import { TitleTopBar } from '@/components/layout/TitleTopBar'
import { ActivityReward } from '@/components/reward/ActivityReward'
import { PathTraceBoard, type PathTraceHandle } from '@/components/trace/PathTraceBoard'
import { OFF_PATH, type PathScore } from '@/components/trace/pathScoring'
import { AUTO_PASS, passes } from '@/components/trace/traceScoring'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/Progress'
import { emitActivity } from '@/domain/universe'
import { newId } from '@/lib/id'
import { useChildKey } from '@/store/progressStore'
import { traceResult } from './traceResult'
import { nextTraceItem, traceActivity, traceStrand, type TraceItem } from './traceItems'
import { traceItemName } from './traceText'

type Hint = 'start' | 'offPath' | 'nextStroke' | 'retry' | null

interface Reward {
  stars: number
  crystals: number
}

/** One number or shape on the board; when it is traced, the reward and what next. */
export function TraceRun({ item }: { item: TraceItem }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const childKey = useChildKey()
  const board = useRef<PathTraceHandle>(null)
  const emitted = useRef(false)
  const [failedChecks, setFailedChecks] = useState(0)
  const [hint, setHint] = useState<Hint>('start')
  const [progress, setProgress] = useState(0)
  const [reward, setReward] = useState<Reward | null>(null)
  const name = traceItemName(t, item)
  const next = nextTraceItem(item.set, item.id)
  const multiStroke = item.strokes.length > 1

  const finish = (score: PathScore) => {
    if (emitted.current) return
    emitted.current = true
    setProgress(1)
    const result = traceResult(score, item.strokes.length, failedChecks)
    try {
      const gained = emitActivity({
        id: newId(),
        childKey,
        activity: traceActivity(item),
        strand: traceStrand(item),
        ...result,
      })
      setReward({ stars: gained.stars, crystals: gained.crystals })
    } catch {
      // the child still sees the praise; the universe keeps its own state
      setReward({ stars: 0, crystals: 0 })
    }
  }

  const onStrokeEnd = (score: PathScore, line: PathScore) => {
    setProgress(score.coverage)
    if (passes(score, AUTO_PASS)) {
      finish(score)
      return
    }
    if (line.precision < OFF_PATH) setHint('offPath')
    else if (multiStroke && score.current > 0 && score.current < item.strokes.length)
      setHint('nextStroke')
    else setHint(null)
  }

  const check = () => {
    const current = board.current
    if (!current || reward) return
    if (current.isEmpty()) {
      setHint('start')
      return
    }
    const score = current.score()
    if (passes(score)) {
      finish(score)
      return
    }
    setFailedChecks((count) => count + 1)
    setHint('retry')
    setProgress(0)
    current.clear()
  }

  const prompt =
    item.set === 'numbers'
      ? t('trace.promptNumber', { number: item.id })
      : t('trace.promptShape', { shape: name })
  const hintText = hint && t(`trace.hints.${hint}`)

  return (
    <Screen header={<TitleTopBar title={name} back={`/trace/${item.set}`} />}>
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-4 px-4 pt-2 pb-6 landscape:sm:flex-row landscape:sm:items-center landscape:sm:justify-center landscape:sm:gap-8 short:flex-row short:justify-center short:gap-5 short:py-2">
        <div className="w-full max-w-[min(40rem,calc(100dvh-22rem))] [@media(max-height:640px)_and_(min-height:501px)]:max-w-[calc(100dvh-18rem)] short:w-[calc(100dvh-5.5rem)] short:max-w-none landscape:sm:w-[min(40rem,calc(100dvh-9rem))] landscape:sm:max-w-none">
          <PathTraceBoard
            ref={board}
            strokes={item.strokes}
            label={
              item.set === 'numbers'
                ? t('trace.canvasNumber', { number: item.id })
                : t('trace.canvasShape', { shape: name })
            }
            onStrokeEnd={onStrokeEnd}
            done={reward !== null}
          />
        </div>

        <div className="flex w-full max-w-md flex-col items-center gap-4 text-center [@media(max-height:640px)_and_(min-height:501px)]:gap-3 short:max-w-xs short:gap-2 landscape:sm:max-w-sm">
          {reward ? (
            <>
              <p className="font-display text-3xl font-extrabold text-primary short:text-2xl">
                {t('trace.done')}
              </p>
              <ActivityReward stars={reward.stars} crystals={reward.crystals} />
              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="soft" size="md" onClick={() => navigate(`/trace/${item.set}`)}>
                  {t('trace.chooseOther')}
                </Button>
                {next && (
                  <Button size="md" onClick={() => navigate(`/trace/${item.set}/${next.id}`)}>
                    {t('common.next')}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="font-display text-2xl font-extrabold [@media(max-height:640px)_and_(min-height:501px)]:sr-only short:text-lg">
                {prompt}
              </p>
              <p
                aria-live="polite"
                className="min-h-14 rounded-card bg-coin-soft px-4 py-2 text-lg font-bold text-ink [@media(max-height:640px)_and_(min-height:501px)]:min-h-0 [@media(max-height:640px)_and_(min-height:501px)]:text-base short:min-h-0 short:text-base"
              >
                {hintText}
              </p>
              <ProgressBar
                value={Math.round(progress * 100)}
                max={100}
                label={t('trace.progress')}
                className="max-w-xs"
              />
              <div className="flex gap-3">
                <Button
                  variant="soft"
                  size="md"
                  onClick={() => {
                    board.current?.clear()
                    setProgress(0)
                    setHint('start')
                  }}
                >
                  {t('task.traceClear')}
                </Button>
                <Button size="md" icon={<CheckIcon size={24} />} onClick={check}>
                  {t('task.traceCheck')}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </Screen>
  )
}

import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Screen } from '@/components/layout/Screen'
import { TitleTopBar } from '@/components/layout/TitleTopBar'
import { LockIcon } from '@/components/icons'
import { FitWords } from '@/components/ui/FitWords'
import { openCount } from '@/domain/progress/numberUnlock'
import { useProgress } from '@/store/progressStore'
import { TraceRun } from './TraceRun'
import { TraceThumb } from './TraceThumb'
import { traceItemName } from './traceText'
import {
  findTraceItem,
  isTraceSet,
  TRACE_ITEMS,
  type TraceItem,
  type TraceSetId,
} from './traceItems'

const TILE =
  'flex flex-col items-center justify-center gap-2 rounded-card bg-surface p-4 text-center font-display font-extrabold shadow-press transition-transform active:translate-y-1 active:shadow-press-sm'

/**
 * `/trace`: draw with a finger. The picker leads to letters (the existing
 * letter game), numbers 0–10 and five shapes; `/trace/:set` lists the items,
 * `/trace/:set/:item` is the board.
 */
/** Numbers to trace open five at a time (MVP); shapes are all open. */
function useOpenTraceCount(set: TraceSetId): number {
  const { numberStreaks } = useProgress()
  const items = TRACE_ITEMS[set]
  return set === 'numbers'
    ? openCount(
        items.map((entry) => `trace:${entry.id}`),
        numberStreaks ?? {},
      )
    : items.length
}

export function TracePage() {
  const { set, item } = useParams()
  const open = useOpenTraceCount(set === 'shapes' ? 'shapes' : 'numbers')
  if (set === undefined) return <TracePicker />
  if (!isTraceSet(set)) return <Navigate to="/trace" replace />
  if (item === undefined) return <TraceItems set={set} />
  const found = findTraceItem(set, item)
  if (!found || TRACE_ITEMS[set].indexOf(found) >= open)
    return <Navigate to={`/trace/${set}`} replace />
  return <TraceRun key={`${set}-${item}`} item={found} open={open} />
}

function TracePicker() {
  const { t } = useTranslation()
  const openNumbers = useOpenTraceCount('numbers')
  // MVP: every number and shape in one list (letters keep their own lesson)
  const entries = [
    ...TRACE_ITEMS.numbers.map((entry, index) => ({ entry, locked: index >= openNumbers })),
    ...TRACE_ITEMS.shapes.map((entry) => ({ entry, locked: false })),
  ]
  return (
    <Screen header={<TitleTopBar title={t('trace.title')} back="/home" />}>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-6 short:gap-2 short:py-2">
        <p className="text-center text-xl text-ink-soft short:text-base">{t('trace.pickPrompt')}</p>
        <Link
          to="/tasks/trace"
          className={clsx(
            TILE,
            'min-h-20 w-full flex-row gap-3 text-2xl short:min-h-14 short:text-xl',
          )}
        >
          <Glyph text="Aa" />
          {t('trace.sets.letters')}
        </Link>
        {openNumbers < TRACE_ITEMS.numbers.length && (
          <p className="text-center text-base text-ink-soft">{t('alphabet.numbersLocked')}</p>
        )}
        <TraceGrid entries={entries} />
      </div>
    </Screen>
  )
}

function Glyph({ text }: { text: string }) {
  return (
    <span aria-hidden="true" className="text-5xl text-primary sm:text-7xl short:text-4xl">
      {text}
    </span>
  )
}

function TraceItems({ set }: { set: TraceSetId }) {
  const { t } = useTranslation()
  const open = useOpenTraceCount(set)
  return (
    <Screen header={<TitleTopBar title={t(`trace.sets.${set}`)} back="/trace" />}>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-6 short:gap-2 short:py-2">
        <p className="text-center text-xl text-ink-soft short:text-base">
          {t(set === 'numbers' ? 'trace.pickNumber' : 'trace.pickShape')}
        </p>
        {open < TRACE_ITEMS[set].length && (
          <p className="text-center text-base text-ink-soft">{t('alphabet.numbersLocked')}</p>
        )}
        <TraceGrid
          entries={TRACE_ITEMS[set].map((entry, index) => ({ entry, locked: index >= open }))}
        />
      </div>
    </Screen>
  )
}

function TraceGrid({ entries }: { entries: { entry: TraceItem; locked: boolean }[] }) {
  const { t } = useTranslation()
  return (
    <ul className="grid grid-cols-3 gap-3 min-[480px]:grid-cols-4 sm:grid-cols-6 sm:gap-4 short:grid-cols-6">
      {entries.map(({ entry, locked }) =>
        locked ? (
          <li key={`${entry.set}-${entry.id}`}>
            <span
              role="img"
              aria-label={t('alphabet.lockedNumber', { number: entry.id })}
              className={clsx(
                TILE,
                'relative aspect-square w-full text-ink-soft opacity-55 short:aspect-auto short:h-20',
              )}
            >
              <TraceThumb strokes={entry.strokes} className="size-14 sm:size-20 short:size-12" />
              <LockIcon aria-hidden="true" size={20} className="absolute top-2 right-2" />
            </span>
          </li>
        ) : (
          <li key={`${entry.set}-${entry.id}`}>
            <Link
              to={`/trace/${entry.set}/${entry.id}`}
              aria-label={traceItemName(t, entry)}
              className={clsx(
                TILE,
                'aspect-square w-full text-primary short:aspect-auto short:h-20',
              )}
            >
              <TraceThumb strokes={entry.strokes} className="size-12 sm:size-20 short:size-12" />
              {entry.set === 'shapes' && (
                // a phone's tile is too narrow for "Шестиугольник": the picture says it, the label reads it
                <span className="hidden w-full sm:block">
                  <FitWords
                    text={traceItemName(t, entry)}
                    className="text-center text-base text-ink short:sr-only"
                  />
                </span>
              )}
            </Link>
          </li>
        ),
      )}
    </ul>
  )
}

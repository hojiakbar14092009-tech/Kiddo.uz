import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Screen } from '@/components/layout/Screen'
import { TitleTopBar } from '@/components/layout/TitleTopBar'
import { Img3D } from '@/components/ui/Img3D'
import { TraceRun } from './TraceRun'
import { TraceThumb } from './TraceThumb'
import { traceItemName } from './traceText'
import { findTraceItem, isTraceSet, TRACE_ITEMS, type TraceSetId } from './traceItems'

const TILE =
  'flex flex-col items-center justify-center gap-2 rounded-card bg-surface p-4 text-center font-display font-extrabold shadow-press transition-transform active:translate-y-1 active:shadow-press-sm'

/**
 * `/trace`: draw with a finger. The picker leads to letters (the existing
 * letter game), numbers 0–10 and five shapes; `/trace/:set` lists the items,
 * `/trace/:set/:item` is the board.
 */
export function TracePage() {
  const { set, item } = useParams()
  if (set === undefined) return <TracePicker />
  if (!isTraceSet(set)) return <Navigate to="/trace" replace />
  if (item === undefined) return <TraceItems set={set} />
  const found = findTraceItem(set, item)
  if (!found) return <Navigate to={`/trace/${set}`} replace />
  return <TraceRun key={`${set}-${item}`} item={found} />
}

function TracePicker() {
  const { t } = useTranslation()
  const choices = [
    { to: '/tasks/trace', label: t('trace.sets.letters'), visual: <Glyph text="Aa" /> },
    { to: '/trace/numbers', label: t('trace.sets.numbers'), visual: <Glyph text="123" /> },
    {
      to: '/trace/shapes',
      label: t('trace.sets.shapes'),
      visual: <Img3D name="star" className="size-20 sm:size-28 short:size-12" />,
    },
  ]
  return (
    <Screen header={<TitleTopBar title={t('trace.title')} back="/home" />}>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 short:gap-3 short:py-2">
        <p className="text-center text-xl text-ink-soft short:text-base">{t('trace.pickPrompt')}</p>
        <ul className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-3 short:grid-cols-3 short:gap-3">
          {choices.map((choice) => (
            <li key={choice.to}>
              <Link
                to={choice.to}
                className={clsx(
                  TILE,
                  'min-h-36 w-full text-2xl sm:min-h-52 sm:text-3xl short:min-h-28 short:text-xl',
                )}
              >
                {choice.visual}
                {choice.label}
              </Link>
            </li>
          ))}
        </ul>
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
  return (
    <Screen header={<TitleTopBar title={t(`trace.sets.${set}`)} back="/trace" />}>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-6 short:gap-2 short:py-2">
        <p className="text-center text-xl text-ink-soft short:text-base">
          {t(set === 'numbers' ? 'trace.pickNumber' : 'trace.pickShape')}
        </p>
        <ul
          className={clsx(
            'grid gap-3 sm:gap-4',
            set === 'numbers'
              ? 'grid-cols-3 min-[480px]:grid-cols-4 sm:grid-cols-6 short:grid-cols-6'
              : 'grid-cols-2 min-[480px]:grid-cols-3 sm:grid-cols-5 short:grid-cols-5',
          )}
        >
          {TRACE_ITEMS[set].map((entry) => (
            <li key={entry.id}>
              <Link
                to={`/trace/${set}/${entry.id}`}
                aria-label={traceItemName(t, entry)}
                className={clsx(
                  TILE,
                  'aspect-square w-full text-primary short:aspect-auto short:h-20',
                )}
              >
                <TraceThumb strokes={entry.strokes} className="size-14 sm:size-20 short:size-12" />
                {set === 'shapes' && (
                  <span className="text-base text-ink short:sr-only">
                    {traceItemName(t, entry)}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Screen>
  )
}

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useChildMemory } from '@/domain/learningMemory/store'
import { useUniverseStore } from '@/domain/universe'
import { dayKey } from '@/features/tasks/rules'
import type { ChildProfile } from '@/store/familyStore'
import { useProgress } from '@/store/progressStore'
import { useLanguage } from '@/store/settingsStore'
import { Panel } from '../dashboard/Panel'
import { dateOfDay } from '../insights/insights'
import type { ChildInsights } from '../insights/useChildInsights'
import { strugglingLetters } from '../report'
import { firstName, weeklyReport, weeklyReportLines } from './weeklyReport'

/*
 * The weekly report (Phase 47): the last seven days in a few plain lines a
 * parent can read, share or copy. Built from the dashboard's own insights;
 * the same text is what the Telegram bot (Phase 56) will send.
 */

type Status = 'idle' | 'copied' | 'copyFailed' | 'shareFailed'

/** A copy / share outcome, kept with the text it was about. */
interface Outcome {
  status: Status
  text: string
}

const BUTTON =
  'inline-flex min-h-12 items-center justify-center rounded-full border-2 border-line-strong bg-surface px-5 font-semibold text-ink'

function canShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

export function WeeklyReportPanel({
  child,
  insights,
}: {
  child: ChildProfile
  insights: ChildInsights
}) {
  const { t } = useTranslation()
  const progress = useProgress(child.id)
  const language = useLanguage()
  const memory = useChildMemory(child.id)
  const recent = useUniverseStore((state) => state.byChild[child.id]?.recent)
  // the live local day, as useChildInsights reads it (a new day shows on the next render)
  const today = dayKey()
  const [shareable] = useState(canShare)
  const [outcome, setOutcome] = useState<Outcome>({ status: 'idle', text: '' })

  const report = useMemo(
    () =>
      weeklyReport(
        {
          runs: insights.runs,
          minutesByDay: progress.minutesByDay,
          strengths: insights.strengths,
          suggestions: insights.suggestions,
          memory: memory.skills,
          struggling: strugglingLetters(progress, language),
          language,
          homeworks: child.homeworks ?? [],
          recent: recent ?? [],
        },
        dateOfDay(today),
      ),
    [insights, progress, memory.skills, language, child.homeworks, recent, today],
  )
  const lines = weeklyReportLines(t, child, report)
  const text = lines.join('\n')
  // an outcome counts only for the text on screen: another child, a new day or
  // another language starts idle, and a late result for an older text is ignored
  const status: Status = outcome.text === text ? outcome.status : 'idle'

  async function copy() {
    const sent = text
    try {
      if (!navigator.clipboard?.writeText) throw new Error('no clipboard')
      await navigator.clipboard.writeText(sent)
      setOutcome({ status: 'copied', text: sent })
    } catch {
      setOutcome({ status: 'copyFailed', text: sent })
    }
  }

  async function share() {
    const sent = text
    try {
      await navigator.share({ title: t('parent.weekly.title'), text: sent })
      setOutcome({ status: 'idle', text: sent })
    } catch (error) {
      // the parent closed the share sheet: nothing went wrong
      if (error instanceof DOMException && error.name === 'AbortError') {
        setOutcome({ status: 'idle', text: sent })
        return
      }
      setOutcome({ status: 'shareFailed', text: sent })
    }
  }

  const stats = [
    {
      label: t('parent.weekly.activeDays'),
      value: t('parent.weekly.outOfSeven', { days: report.activeDays }),
    },
    { label: t('parent.weekly.minutes'), value: String(report.totalMinutes) },
    { label: t('parent.weekly.activities'), value: String(report.activitiesFinished) },
  ]

  return (
    <Panel title={t('parent.weekly.title')} id="weekly-report" className="lg:col-span-2">
      <div data-testid="weekly-report" className="flex min-w-0 flex-col gap-4">
        <p className="text-ink-soft">{t('parent.weekly.intro')}</p>
        {report.empty ? (
          <p className="text-ink-soft">
            {t('parent.weekly.empty', { name: firstName(child.name) })}
          </p>
        ) : (
          <>
            <dl className="grid grid-cols-3 gap-2 sm:gap-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex min-w-0 flex-col gap-1 rounded-2xl bg-cream p-3"
                >
                  <dt className="text-sm break-words text-ink-soft">{stat.label}</dt>
                  <dd className="font-display text-2xl font-extrabold tabular-nums">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
            {lines.length > 1 && (
              <ul className="flex list-disc flex-col gap-1 pl-5 break-words">
                {lines.slice(1).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              {shareable && (
                <button type="button" className={BUTTON} onClick={() => void share()}>
                  {t('parent.weekly.share')}
                </button>
              )}
              <button type="button" className={BUTTON} onClick={() => void copy()}>
                {t('parent.weekly.copy')}
              </button>
            </div>
            <p role="status" className="min-h-6 font-semibold text-primary-ink">
              {status === 'copied' ? t('parent.weekly.copied') : ''}
            </p>
            {(status === 'copyFailed' || status === 'shareFailed') && (
              <p role="alert" className="rounded-2xl bg-oops-soft px-4 py-2 text-oops-ink">
                {t(
                  status === 'copyFailed'
                    ? 'parent.weekly.copyFailed'
                    : 'parent.weekly.shareFailed',
                )}
              </p>
            )}
            {/* opened when copying failed, so the text to select by hand is in view */}
            <details
              key={status === 'copyFailed' ? 'open' : 'closed'}
              open={status === 'copyFailed'}
              className="text-ink-soft"
            >
              <summary className="flex min-h-11 cursor-pointer items-center font-semibold">
                {t('parent.weekly.showText')}
              </summary>
              <p className="whitespace-pre-line break-words select-all">{text}</p>
            </details>
          </>
        )}
      </div>
    </Panel>
  )
}

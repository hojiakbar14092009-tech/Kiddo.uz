import type { TFunction } from 'i18next'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CheckIcon, ChevronRightIcon, HomeIcon, MedalIcon } from '@/components/icons'
import { toast } from '@/components/ui/toast'
import { useUniverseStore } from '@/domain/universe/store'
import { useLearnStore } from '@/features/learn/learnStore'
import { dayKey } from '@/features/tasks/rules'
import { tDynamic } from '@/lib/tDynamic'
import { useFamilyStore, type ChildProfile } from '@/store/familyStore'
import { useParentStore } from '@/store/parentStore'
import { useProgressStore } from '@/store/progressStore'
import { Panel } from '../dashboard/Panel'
import { buildChildExport, exportFileName } from './exportData'
import type { StrandRow, Suggestion } from './insights'
import { levelWord, QUIET_LINK, runName, strandName } from './insightText'
import type { ChildInsights } from './useChildInsights'
import { WeekChart } from './WeekChart'

/*
 * The insight panels of the parent report (Phase 9). Calm and factual, for
 * adults: no ranking against other children, no red failure words. Helpers
 * take `TFunction` (not `ReturnType<typeof useTranslation>['t']`, TS2589).
 */

const PROFILES = '/parent/dashboard?tab=profiles'

function percent(value: number): number {
  return Math.round(value * 100)
}

// ------------------------------------------------------------ skills

function StrandItem({ row, t }: { row: StrandRow; t: TFunction }) {
  return (
    <li
      data-testid={`strand-${row.strand}`}
      className="flex flex-col gap-1 rounded-2xl border-2 border-line px-4 py-3"
    >
      <span className="font-display text-lg font-bold">{strandName(t, row.strand)}</span>
      {row.level !== null && <span className="font-semibold">{levelWord(t, row.level)}</span>}
      <span className="text-sm text-ink-soft">
        {row.accuracy === null
          ? t(
              row.strand === 'art'
                ? 'parent.insights.skills.noAccuracy'
                : 'parent.insights.skills.notScored',
            )
          : t('parent.insights.skills.accuracy', {
              percent: percent(row.accuracy),
              count: row.answered,
            })}
        {' · '}
        {t('parent.insights.skills.runs', { count: row.runs })}
      </span>
    </li>
  )
}

export function SkillsPanel({ child, insights }: { child: ChildProfile; insights: ChildInsights }) {
  const { t } = useTranslation()
  const { active, untouched } = insights.skills
  return (
    <Panel title={t('parent.insights.skills.title')} className="lg:col-span-2" id="skills">
      <p className="text-ink-soft">{t('parent.insights.skills.intro', { name: child.name })}</p>
      {active.length === 0 ? (
        <p className="text-ink-soft">{t('parent.insights.skills.empty', { name: child.name })}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((row) => (
            <StrandItem key={row.strand} row={row} t={t} />
          ))}
        </ul>
      )}
      {untouched.length > 0 && (
        <p className="text-sm text-ink-soft">
          {t('parent.insights.skills.untouched', {
            list: untouched.map((strand) => strandName(t, strand)).join(', '),
          })}
        </p>
      )}
    </Panel>
  )
}

// ------------------------------------------------------------ this week

export function WeekPanel({ insights }: { insights: ChildInsights }) {
  const { t } = useTranslation()
  const { week } = insights
  // Own names: not every browser ships Uzbek date names.
  const weekdays = t('parent.report.weekdays').split(',')
  const label = (day: string) => weekdays[new Date(`${day}T12:00:00`).getDay()] ?? day
  const minutesUnit = (count: number) => t('parent.insights.week.peakMinutes', { count })
  // three measures of the same seven days: one chart each (one axis per chart, never two)
  const charts = [
    {
      id: 'minutes',
      title: t('parent.insights.week.minutes'),
      summary: t('parent.insights.week.chartMinutes', { total: week.totalMinutes }),
      unit: minutesUnit,
      total: t('parent.insights.week.totalMinutes', { count: week.totalMinutes }),
    },
    {
      id: 'activities',
      title: t('parent.insights.week.activities'),
      summary: t('parent.insights.week.chartActivities', { total: week.totalActivities }),
      unit: (count: number) => String(count),
      total: t('parent.insights.week.totalActivities', { count: week.totalActivities }),
    },
    {
      id: 'coins',
      title: t('parent.insights.week.coins'),
      summary: t('parent.insights.week.chartCoins', { total: week.totalCoins }),
      unit: (count: number) => String(count),
      total: t('parent.insights.week.totalCoins', { count: week.totalCoins }),
    },
  ] as const

  return (
    <Panel title={t('parent.insights.week.title')} className="lg:col-span-2" id="this-week">
      {week.activeDays === 0 ? (
        <p className="text-ink-soft">{t('parent.insights.week.empty')}</p>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {charts.map((chart) => (
              <div key={chart.id} className="flex flex-col gap-2">
                <WeekChart
                  testId={`week-${chart.id}`}
                  title={chart.title}
                  summary={chart.summary}
                  peakLabel={chart.unit}
                  bars={week.days.map((day) => ({
                    day: day.day,
                    label: label(day.day),
                    value: day[chart.id],
                    tooltip: `${label(day.day)}: ${chart.unit(day[chart.id])}`,
                  }))}
                />
                <p className="font-semibold">{chart.total}</p>
              </div>
            ))}
          </div>

          <details className="rounded-2xl border-2 border-line px-4 py-2">
            <summary className="min-h-10 cursor-pointer py-2 font-semibold">
              {t('parent.insights.week.showTable')}
            </summary>
            <table className="mt-2 w-full text-left tabular-nums" data-testid="week-table">
              <thead>
                <tr className="text-sm text-ink-soft">
                  <th scope="col" className="py-1 font-semibold">
                    {t('parent.insights.week.day')}
                  </th>
                  <th scope="col" className="py-1 text-right font-semibold">
                    {t('parent.insights.week.minutesCol')}
                  </th>
                  <th scope="col" className="py-1 text-right font-semibold">
                    {t('parent.insights.week.activitiesCol')}
                  </th>
                  <th scope="col" className="py-1 text-right font-semibold">
                    {t('parent.insights.week.coinsCol')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {week.days.map((day) => (
                  <tr key={day.day}>
                    <th scope="row" className="py-1 font-normal">
                      {label(day.day)} <span className="text-ink-soft">{day.day.slice(5)}</span>
                    </th>
                    <td className="py-1 text-right">{day.minutes}</td>
                    <td className="py-1 text-right">{day.activities}</td>
                    <td className="py-1 text-right">{day.coins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="font-display text-lg font-bold">{t('parent.insights.week.earned')}</h3>
        <ul className="flex flex-wrap gap-2" data-testid="week-earned">
          {(
            [
              ['stars', week.earned.star],
              ['crystals', week.earned.crystal],
              ['scrolls', week.earned.scroll],
            ] as const
          ).map(([key, count]) => (
            <li key={key} className="rounded-full bg-cream px-4 py-2 font-semibold tabular-nums">
              {t(`parent.insights.week.${key}`, { count })}
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  )
}

// ------------------------------------------------------------ what was played

const SHOWN_RUNS = 10

/** "23.10 14:05": numeric, the same in every language (not every browser has Uzbek dates). */
function shortDateTime(iso: string): string {
  const date = new Date(iso)
  const two = (n: number) => String(n).padStart(2, '0')
  return `${two(date.getDate())}.${two(date.getMonth() + 1)} ${two(date.getHours())}:${two(date.getMinutes())}`
}

export function PlayedPanel({ child, insights }: { child: ChildProfile; insights: ChildInsights }) {
  const { t } = useTranslation()
  const runs = insights.runs.slice(0, SHOWN_RUNS)
  return (
    <Panel title={t('parent.insights.played.title', { name: child.name })} id="played">
      {runs.length === 0 ? (
        <p className="text-ink-soft">{t('parent.insights.played.empty')}</p>
      ) : (
        <ul className="flex flex-col divide-y-2 divide-line" data-testid="played-list">
          {runs.map((run) => (
            <li key={run.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2">
              <span className="min-w-0 flex-1 font-semibold">{runName(t, run)}</span>
              <time dateTime={run.at} className="text-sm text-ink-soft tabular-nums">
                {shortDateTime(run.at)}
              </time>
              <span className="w-full text-sm text-ink-soft">{strandName(t, run.strand)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

// ------------------------------------------------------------ practice & strengths

function suggestionText(t: TFunction, item: Suggestion): string {
  if (item.kind === 'skill') {
    return t('parent.insights.practice.skill', {
      skill: tDynamic(t, item.nameKey),
    })
  }
  return item.kind === 'strand'
    ? t('parent.insights.practice.strand')
    : t('parent.insights.practice.explore')
}

export function PracticePanel({
  child,
  insights,
}: {
  child: ChildProfile
  insights: ChildInsights
}) {
  const { t } = useTranslation()
  const setActiveChild = useFamilyStore((state) => state.setActiveChild)
  return (
    <Panel title={t('parent.insights.practice.title')} id="practice">
      <p className="text-ink-soft">{t('parent.insights.practice.intro')}</p>
      {insights.suggestions.length === 0 ? (
        <p className="text-ink-soft">{t('parent.insights.practice.none')}</p>
      ) : (
        <ul className="flex flex-col gap-3" data-testid="suggestions">
          {insights.suggestions.map((item) => {
            const area = strandName(t, item.strand)
            return (
              <li
                key={`${item.kind}-${item.strand}`}
                className="flex flex-col gap-2 rounded-2xl bg-cream p-4"
              >
                <span className="font-display text-lg font-bold">{area}</span>
                <span>{suggestionText(t, item)}</span>
                <Link
                  to={item.route}
                  className={`${QUIET_LINK} self-start`}
                  aria-label={t('parent.insights.practice.openNamed', { area, name: child.name })}
                  // the activity is played as the child this report is about
                  onClick={() => setActiveChild(child.id)}
                >
                  {t('parent.insights.practice.open')}
                  <ChevronRightIcon size={18} />
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <h3 className="font-display text-lg font-bold">{t('parent.insights.practice.strengths')}</h3>
      {insights.strengths.length === 0 ? (
        <p className="text-ink-soft">{t('parent.insights.practice.strengthsEmpty')}</p>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="strengths">
          {insights.strengths.map((row) => (
            <li key={row.strand} className="flex items-start gap-2">
              <CheckIcon size={20} className="mt-0.5 shrink-0 text-primary-ink" />
              <span>
                <span className="font-semibold">{strandName(t, row.strand)}</span>
                <span className="text-ink-soft">
                  {row.level !== null && ` · ${levelWord(t, row.level)}`}
                  {row.accuracy !== null &&
                    ` · ${t('parent.insights.skills.accuracy', { percent: percent(row.accuracy), count: row.answered })}`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

// ------------------------------------------------------------ healthy play

export function HealthPanel({ child, insights }: { child: ChildProfile; insights: ChildInsights }) {
  const { t } = useTranslation()
  const { health } = insights
  return (
    <Panel title={t('parent.insights.health.title')} id="healthy-play">
      {health.daysPlayed === 0 ? (
        <p className="text-ink-soft">{t('parent.insights.health.none')}</p>
      ) : (
        <dl className="grid gap-3 min-[400px]:grid-cols-2">
          <div className="flex flex-col gap-1 rounded-2xl bg-cream p-4">
            <dt className="text-sm text-ink-soft">{t('parent.insights.health.averageLabel')}</dt>
            <dd className="font-display text-2xl font-extrabold">
              {t('parent.insights.week.peakMinutes', { count: health.averageMinutes })}
            </dd>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl bg-cream p-4">
            <dt className="text-sm text-ink-soft">{t('parent.insights.health.daysLabel')}</dt>
            <dd className="font-display text-2xl font-extrabold">
              {t('parent.insights.health.daysValue', { count: health.daysPlayed })}
            </dd>
          </div>
        </dl>
      )}
      <p className="font-semibold">
        {t('parent.insights.health.limit', { count: child.dailyLimitMinutes })}
      </p>
      <p className="text-ink-soft">{t('parent.insights.health.guide')}</p>
      <p className="text-ink-soft">{t('parent.insights.health.rest')}</p>
      <Link to={PROFILES} className={`${QUIET_LINK} self-start`}>
        {t('parent.insights.health.editLimit')}
        <ChevronRightIcon size={18} />
      </Link>
    </Panel>
  )
}

// ------------------------------------------------------------ medals & city

export function MedalsCityRow({ insights }: { insights: ChildInsights }) {
  const { t } = useTranslation()
  const { medals } = insights
  return (
    <Panel title={t('parent.insights.progress.title')} className="lg:col-span-2" id="medals-city">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2" data-testid="medals">
          <p className="flex items-center gap-2 font-semibold">
            <MedalIcon size={22} className="shrink-0 text-ink-soft" />
            {t('parent.insights.progress.medals', {
              count: medals.medalsTotal,
              total: medals.medalsPossible,
            })}
          </p>
          {medals.medalsTotal === 0 ? (
            <p className="text-sm text-ink-soft">{t('parent.insights.progress.noMedals')}</p>
          ) : (
            <ul className="flex flex-wrap gap-2 text-sm">
              {(['gold', 'silver', 'bronze'] as const).map((tier) => (
                <li key={tier} className="rounded-full bg-cream px-3 py-1 font-semibold">
                  {t(`parent.insights.progress.${tier}`, { count: medals.medals[tier] })}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-col gap-2" data-testid="city">
          <p className="flex items-center gap-2 font-semibold">
            <HomeIcon size={22} className="shrink-0 text-ink-soft" />
            {t('parent.insights.progress.city', { count: medals.upgrades })}
          </p>
          {medals.buildings.length === 0 ? (
            <p className="text-sm text-ink-soft">{t('parent.insights.progress.noCity')}</p>
          ) : (
            <ul className="flex flex-wrap gap-2 text-sm">
              {medals.buildings.map((item) => (
                <li key={item.id} className="rounded-full bg-cream px-3 py-1">
                  {t('parent.insights.progress.building', {
                    name: tDynamic(t, item.nameKey),
                    level: item.level,
                    max: item.maxLevel,
                  })}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  )
}

// ------------------------------------------------------------ data & privacy

/** Saves a JSON file in the browser (no network). */
function downloadJson(fileName: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function galleryMeta(childId: string) {
  try {
    const { studioGallery } = await import('@/features/studio/gallery')
    const works = await studioGallery().list(childId)
    return works.map(({ id, childKey, createdAt, bytes }) => ({ id, childKey, createdAt, bytes }))
  } catch {
    // no gallery storage in this browser: the export goes on without it
    return []
  }
}

export function DataPanel({ child }: { child: ChildProfile }) {
  const { t } = useTranslation()
  const session = useParentStore((state) => state.session)
  const [busy, setBusy] = useState(false)
  const cloud = session?.mode === 'cloud'

  const exportData = async () => {
    setBusy(true)
    try {
      const data = buildChildExport({
        child,
        progress: useProgressStore.getState().byChild[child.id],
        learn: useLearnStore.getState().byChild[child.id],
        universe: useUniverseStore.getState().byChild[child.id],
        gallery: await galleryMeta(child.id),
        storage: cloud ? 'cloud' : 'device',
      })
      downloadJson(exportFileName(child.name, dayKey()), data)
      toast(t('parent.insights.data.exported'), 'success')
    } catch {
      toast(t('parent.insights.data.exportFailed'), 'warning')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel title={t('parent.insights.data.title')} className="lg:col-span-2" id="data-privacy">
      <p data-testid="data-location" className="font-semibold">
        {session?.mode === 'cloud'
          ? t('parent.insights.data.cloud', { email: session.email })
          : t('parent.insights.data.device')}
      </p>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => void exportData()}
          disabled={busy}
          className={`${QUIET_LINK} self-start text-left disabled:opacity-50`}
        >
          {t('parent.insights.data.export')}
        </button>
        <p className="text-sm text-ink-soft">{t('parent.insights.data.exportHint')}</p>
      </div>
      <p className="text-ink-soft">{t('parent.insights.data.remove', { name: child.name })}</p>
      <Link to={PROFILES} className={`${QUIET_LINK} self-start`}>
        {t('parent.insights.data.toProfiles')}
        <ChevronRightIcon size={18} />
      </Link>
    </Panel>
  )
}

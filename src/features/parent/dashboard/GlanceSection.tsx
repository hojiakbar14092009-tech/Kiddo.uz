import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useUniverseStore } from '@/domain/universe'
import { homeworkStatus } from '@/features/homework/status'
import { ChildAvatar } from '@/features/profiles/ChildAvatar'
import { dayKey } from '@/features/tasks/rules'
import { childAge, type ChildProfile } from '@/store/familyStore'
import { useProgress } from '@/store/progressStore'
import { daySummary } from '../report'
import type { ChildInsights } from '../insights/useChildInsights'
import { runName, strandName } from '../insights/insightText'
import { tDynamic } from '@/lib/tDynamic'
import { formatDayMonth } from '@/lib/dates'
import { useGarden } from '@/domain/garden/hooks'
import { useChildMemory } from '@/domain/learningMemory/store'
import { parentSkillNameKey } from '../insights/skillLabel'
import { activityTrend, gettingStronger, learningNow, recentlyMastered, runsOnDay } from './glance'

/*
 * Parent Center 2.0 first view (full contract): the answers a parent looks
 * for first, in plain words — my child, today, what they are learning, what
 * is getting stronger, what to practise, homework, achievements, recent
 * activity. Each card links to its detailed panel below. Only real data:
 * with too little play it says so instead of guessing; no raw keys, no
 * scores, no labels like "weak".
 */

function Card({
  title,
  href,
  testId,
  children,
}: {
  title: string
  href?: string
  testId: string
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <section
      aria-labelledby={`${testId}-title`}
      data-testid={testId}
      className="flex flex-col gap-2 rounded-2xl border-2 border-line bg-surface p-4"
    >
      <h3 id={`${testId}-title`} className="font-display text-lg font-extrabold">
        {title}
      </h3>
      <div className="flex flex-1 flex-col gap-1 text-ink">{children}</div>
      {href &&
        (href.startsWith('#') ? (
          <a
            href={href}
            aria-describedby={`${testId}-title`}
            className="self-start text-sm font-semibold text-primary-ink underline"
          >
            {t('parent.glance.more')}
          </a>
        ) : (
          <Link
            to={href}
            replace
            aria-describedby={`${testId}-title`}
            className="self-start text-sm font-semibold text-primary-ink underline"
          >
            {t('parent.glance.more')}
          </Link>
        ))}
    </section>
  )
}

function Quiet({ children }: { children: ReactNode }) {
  return <p className="text-ink-soft">{children}</p>
}

export function GlanceSection({
  child,
  insights,
}: {
  child: ChildProfile
  insights: ChildInsights
}) {
  const { t } = useTranslation()
  const progress = useProgress(child.id)
  const today = daySummary(progress, dayKey())
  const recent = useUniverseStore((state) => state.byChild[child.id]?.recent)
  const homeworks = child.homeworks ?? []
  const statuses = homeworks.map((homework) => homeworkStatus(homework, recent))
  const open = statuses.filter((status) => status === 'assigned' || status === 'started').length
  const done = statuses.filter((status) => status === 'completed').length
  const practice = statuses.filter((status) => status === 'practice').length
  // every kind of activity today; what is learnt now (two weeks); what really rose
  const [now] = useState(() => new Date())
  const todayRuns = runsOnDay(insights.runs, dayKey())
  const learning = learningNow(insights.runs, now)
  const stronger = gettingStronger(insights.runs, now)
  const memory = useChildMemory(child.id)
  // one line per name: several maths skills share a family name ("Adding"), and a
  // name still being practised is not also "mastered" (as in the memory panel)
  const memoryRecent = recentlyMastered(memory.skills, now)
  const practising = new Set(
    memoryRecent.practising.map((skill) => tDynamic(t, parentSkillNameKey(skill))),
  )
  const mastered = [
    ...new Map(
      memoryRecent.mastered
        .map((skill) => [tDynamic(t, parentSkillNameKey(skill)), skill] as const)
        .filter(([name]) => !practising.has(name)),
    ).entries(),
  ].slice(0, 3)
  const garden = useGarden(child.id).summary
  const trend = activityTrend(insights.runs, now)
  const lastRuns = [...insights.runs].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3)
  const medals = insights.medals

  return (
    <section
      aria-labelledby="glance-title"
      className="flex flex-col gap-3 lg:col-span-2"
      data-testid="parent-glance"
    >
      <h2 id="glance-title" className="sr-only">
        {t('parent.glance.title', { name: child.name })}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card title={t('parent.glance.child')} testId="glance-child">
          <div className="flex items-center gap-3">
            <ChildAvatar child={child} size={48} />
            <div className="flex flex-col">
              <span className="font-display text-xl font-extrabold">{child.name}</span>
              <span className="text-ink-soft">
                {t('parent.glance.age', { count: childAge(child) })}
              </span>
            </div>
          </div>
        </Card>

        <Card title={t('parent.glance.today')} testId="glance-today">
          {todayRuns === 0 && today.minutes === 0 ? (
            <Quiet>{t('parent.glance.todayNone')}</Quiet>
          ) : (
            <>
              <p>{t('parent.glance.todayActivities', { count: todayRuns })}</p>
              <p className="text-ink-soft">
                {t('parent.glance.todayMinutes', {
                  minutes: today.minutes,
                  limit: child.dailyLimitMinutes,
                })}
              </p>
            </>
          )}
        </Card>

        <Card title={t('parent.glance.learning')} href="#skills" testId="glance-learning">
          {learning.length === 0 ? (
            <Quiet>{t('parent.glance.needMore')}</Quiet>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {learning.map((strand) => (
                <li key={strand} className="rounded-full bg-sky-soft px-3 py-0.5 font-semibold">
                  {strandName(t, strand)}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t('parent.glance.stronger')} href="#skills" testId="glance-stronger">
          {stronger.length === 0 ? (
            <Quiet>{t('parent.glance.strongerNone')}</Quiet>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {stronger.map((strand) => (
                <li
                  key={strand}
                  className="rounded-full bg-primary-soft px-3 py-0.5 font-semibold text-primary-ink"
                >
                  {strandName(t, strand)}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t('parent.glance.mastered')} href="#memory" testId="glance-mastered">
          {mastered.length === 0 ? (
            <Quiet>{t('parent.glance.masteredNone')}</Quiet>
          ) : (
            <ul className="flex flex-col gap-1">
              {mastered.map(([name, skill]) => (
                <li key={skill} className="font-semibold">
                  {name}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t('parent.glance.practice')} href="#practice" testId="glance-practice">
          {insights.suggestions.length === 0 ? (
            <Quiet>{t('parent.glance.practiceNone')}</Quiet>
          ) : (
            <ul className="flex flex-col gap-1">
              {insights.suggestions.map((item) => (
                <li key={`${item.kind}-${item.strand}`}>
                  {item.kind === 'skill'
                    ? tDynamic(t, item.nameKey)
                    : item.kind === 'explore'
                      ? t('parent.glance.tryNew', { area: strandName(t, item.strand) })
                      : strandName(t, item.strand)}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title={t('parent.glance.homework')}
          href="/parent/dashboard?tab=homework"
          testId="glance-homework"
        >
          {homeworks.length === 0 ? (
            <Quiet>{t('parent.glance.homeworkNone')}</Quiet>
          ) : (
            <>
              <p>{t('parent.glance.homeworkOpen', { count: open })}</p>
              <p className="text-ink-soft">{t('parent.glance.homeworkDone', { count: done })}</p>
              {practice > 0 && (
                <p className="text-ink-soft">
                  {t('parent.glance.homeworkPractice', { count: practice })}
                </p>
              )}
            </>
          )}
        </Card>

        <Card title={t('parent.glance.garden')} href="#memory" testId="glance-garden">
          {garden.total === 0 ? (
            <Quiet>{t('parent.glance.gardenNone')}</Quiet>
          ) : (
            <>
              <p>{t('parent.glance.gardenGrowing', { count: garden.growing })}</p>
              <p className="text-ink-soft">
                {t('parent.glance.gardenBloom', { count: garden.bloom })}
              </p>
            </>
          )}
        </Card>

        <Card
          title={t('parent.glance.achievements')}
          href="#medals-city"
          testId="glance-achievements"
        >
          {medals.medalsTotal === 0 && progress.stickers.length === 0 ? (
            <Quiet>{t('parent.glance.achievementsNone')}</Quiet>
          ) : (
            <>
              <p>
                {t('parent.glance.medals', {
                  count: medals.medalsTotal,
                  total: medals.medalsPossible,
                })}
              </p>
              <p className="text-ink-soft">
                {t('parent.glance.stickers', { count: progress.stickers.length })}
              </p>
            </>
          )}
        </Card>

        <Card title={t('parent.glance.trend')} href="#this-week" testId="glance-trend">
          {trend.direction === 'none' ? (
            <Quiet>{t('parent.glance.trendNone')}</Quiet>
          ) : (
            <>
              <p>{t(`parent.glance.trend_${trend.direction}`)}</p>
              <p className="text-ink-soft tabular-nums">
                {t('parent.glance.trendDays', { now: trend.thisWeek, before: trend.lastWeek })}
              </p>
            </>
          )}
        </Card>

        <Card title={t('parent.glance.history')} href="#played" testId="glance-history">
          {lastRuns.length === 0 ? (
            <Quiet>{t('parent.glance.historyNone')}</Quiet>
          ) : (
            <ul className="flex flex-col gap-1">
              {lastRuns.map((run) => (
                <li key={run.id} className="flex justify-between gap-2">
                  <span className="truncate">{runName(t, run)}</span>
                  <time dateTime={run.at} className="shrink-0 text-ink-soft tabular-nums">
                    {formatDayMonth(new Date(run.at))}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </section>
  )
}

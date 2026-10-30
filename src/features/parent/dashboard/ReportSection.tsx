import { useTranslation } from 'react-i18next'
import { findLetter } from '@/content/alphabet'
import { LANGUAGE_INFO } from '@/content/languages'
import { GAME_META } from '@/features/tasks/gameMeta'
import { isGameType } from '@/features/tasks/games'
import { dayKey } from '@/features/tasks/rules'
import type { ChildProfile } from '@/store/familyStore'
import { useProgress } from '@/store/progressStore'
import { useLanguage } from '@/store/settingsStore'
import { confusionPairs, daySummary, strugglingLetters } from '../report'
import {
  DataPanel,
  HealthPanel,
  MedalsCityRow,
  PlayedPanel,
  PracticePanel,
  SkillsPanel,
  WeekPanel,
} from '../insights/InsightsPanels'
import { useChildInsights } from '../insights/useChildInsights'
import { ActivityPanel } from './ActivityPanel'
import { LearnResultsPanel } from './LearnResultsPanel'
import { FocusPanel } from '../insights/FocusPanel'
import { MemoryPanel } from '../insights/MemoryPanel'
import { Panel } from './Panel'
import { GlanceSection } from './GlanceSection'

/** Today, the week and the letters that need practice – for one child. */
export function ReportSection({ child }: { child: ChildProfile }) {
  const { t, i18n } = useTranslation()
  const progress = useProgress(child.id)
  const language = useLanguage()
  const today = daySummary(progress, dayKey())
  const insights = useChildInsights(child)
  const pairs = confusionPairs(progress)
  const struggling = strugglingLetters(progress, language)
  const time = new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit' })
  const letterName = (lang: typeof language, id: string) => findLetter(lang, id)?.upper ?? id

  const stats = [
    { label: t('parent.report.tasks'), value: today.tasks },
    { label: t('parent.report.coins'), value: today.coins },
    {
      label: t('parent.report.minutes'),
      value: t('parent.report.minutesOf', {
        minutes: today.minutes,
        limit: child.dailyLimitMinutes,
      }),
    },
    { label: t('parent.report.mistakes'), value: today.mistakes },
  ]

  return (
    <div className="grid gap-5 lg:grid-flow-row-dense lg:grid-cols-2">
      {/* the first view: the questions a parent asks first, each linked to its details below */}
      <GlanceSection child={child} insights={insights} />
      <Panel title={t('parent.report.today')} className="lg:col-span-2">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1 rounded-2xl bg-cream p-4">
              <dt className="text-sm text-ink-soft">{stat.label}</dt>
              <dd className="font-display text-2xl font-extrabold tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>

        {today.results.length === 0 ? (
          <p className="text-ink-soft">{t('parent.report.nothingToday')}</p>
        ) : (
          <ul className="flex flex-col divide-y-2 divide-line">
            {today.results.map((result) => (
              <li key={result.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                <span className="w-14 text-ink-soft tabular-nums">
                  {time.format(new Date(result.finishedAt))}
                </span>
                <span className="flex-1 font-semibold">
                  {isGameType(result.type)
                    ? `${GAME_META[result.type].emoji} ${t(GAME_META[result.type].titleKey)}`
                    : t('parent.report.exam')}{' '}
                  <span className="font-normal text-ink-soft">
                    ({LANGUAGE_INFO[result.language].shortLabel})
                  </span>
                </span>
                <span>{'★'.repeat(result.stars)}</span>
                <span className="font-semibold">+{result.coins}</span>
                <span className="text-ink-soft">
                  {t('parent.report.mistakeCount', { count: result.mistakes })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <WeekPanel insights={insights} />
      <MedalsCityRow insights={insights} />
      <SkillsPanel child={child} insights={insights} />
      <PracticePanel child={child} insights={insights} />
      <FocusPanel child={child} />
      <MemoryPanel child={child} />
      <PlayedPanel child={child} insights={insights} />
      <HealthPanel child={child} insights={insights} />

      <Panel title={t('parent.report.mistakesTitle')}>
        {pairs.length === 0 && struggling.length === 0 ? (
          <p className="text-ink-soft">{t('parent.report.noMistakes')}</p>
        ) : (
          <>
            {pairs.length > 0 && (
              <ul className="flex flex-col gap-2">
                {pairs.map((pair) => (
                  <li
                    key={`${pair.language}-${pair.targetId}-${pair.chosenId}`}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-oops-soft px-4 py-2"
                  >
                    <span>
                      {t('parent.report.confusion', {
                        chosen: letterName(pair.language, pair.chosenId),
                        target: letterName(pair.language, pair.targetId),
                      })}
                    </span>
                    <span className="font-semibold whitespace-nowrap">
                      {t('parent.report.times', { count: pair.count })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {struggling.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-ink-soft">{t('parent.report.practice')}</p>
                <ul className="flex flex-wrap gap-2">
                  {struggling.map((entry) => (
                    <li
                      key={entry.letterId}
                      className="rounded-2xl bg-cream px-3 py-1 font-display text-xl font-bold"
                    >
                      {letterName(language, entry.letterId)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </Panel>
      <LearnResultsPanel child={child} />
      <ActivityPanel child={child} />
      <DataPanel child={child} />
    </div>
  )
}

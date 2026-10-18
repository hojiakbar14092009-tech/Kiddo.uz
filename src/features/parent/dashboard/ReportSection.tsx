import { useTranslation } from 'react-i18next'
import { findLetter } from '@/content/alphabet'
import { LANGUAGE_INFO } from '@/content/languages'
import { GAME_META } from '@/features/tasks/gameMeta'
import { isGameType } from '@/features/tasks/games'
import { dayKey } from '@/features/tasks/rules'
import type { ChildProfile } from '@/store/familyStore'
import { useProgress } from '@/store/progressStore'
import { useLanguage } from '@/store/settingsStore'
import { confusionPairs, daySummary, strugglingLetters, weeklyCoins } from '../report'
import { Panel } from './Panel'

/** Today, the week and the letters that need practice – for one child. */
export function ReportSection({ child }: { child: ChildProfile }) {
  const { t, i18n } = useTranslation()
  const progress = useProgress(child.id)
  const language = useLanguage()
  const today = daySummary(progress, dayKey())
  const week = weeklyCoins(progress)
  const weekMax = Math.max(1, ...week.map((entry) => entry.coins))
  const pairs = confusionPairs(progress)
  const struggling = strugglingLetters(progress, language)
  const time = new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit' })
  // Own names: not every browser ships Uzbek date names.
  const weekdays = t('parent.report.weekdays').split(',')
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
    <div className="grid gap-5 lg:grid-cols-2">
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

      <Panel title={t('parent.report.week')}>
        <ol className="flex h-44 items-end gap-2" aria-label={t('parent.report.weekLabel')}>
          {week.map((entry) => {
            const date = new Date(`${entry.day}T12:00:00`)
            return (
              <li
                key={entry.day}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1"
              >
                <span className="sr-only">{`${weekdays[date.getDay()]}: ${entry.coins}`}</span>
                <span aria-hidden="true" className="text-sm font-semibold tabular-nums">
                  {entry.coins}
                </span>
                <span
                  aria-hidden="true"
                  className="w-full rounded-t-xl bg-coin"
                  style={{ height: `${Math.max(4, (entry.coins / weekMax) * 100)}%` }}
                />
                <span aria-hidden="true" className="text-sm text-ink-soft">
                  {weekdays[date.getDay()]}
                </span>
              </li>
            )
          })}
        </ol>
      </Panel>

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
    </div>
  )
}

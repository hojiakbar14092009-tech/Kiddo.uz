import { useTranslation } from 'react-i18next'
import { Img3D } from '@/features/learn/Img3D'
import { needsReview, useLearnStore, type LearnChild } from '@/features/learn/learnStore'
import { LEARN_SECTIONS } from '@/features/learn/sections'
import type { ChildProfile } from '@/store/familyStore'
import { Panel } from './Panel'

const EMPTY: LearnChild = {
  skills: {},
  attempts: [],
  sessions: [],
  rewarded: [],
  stages: {},
  lastOrder: {},
}

/**
 * Results of the new learning sections for one child: the last short check
 * of each section (answers right on the child's own, answers given with help),
 * how many topics need practice again, and the latest checks.
 */
export function LearnResultsPanel({ child }: { child: ChildProfile }) {
  const { t, i18n } = useTranslation()
  const learn = useLearnStore((state) => state.byChild[child.id] ?? EMPTY)
  const tests = learn.sessions.filter((session) => session.mode === 'test')
  const date = new Intl.DateTimeFormat(i18n.language, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  const rows = LEARN_SECTIONS.map((section) => {
    const last = tests.find((session) => session.section === section.id) ?? null
    const count = tests.filter((session) => session.section === section.id).length
    const review = Object.values(learn.skills).filter(
      (stat) => stat.section === section.id && needsReview(stat),
    ).length
    const practised = learn.attempts.some((attempt) => attempt.section === section.id)
    return { section, last, count, review, practised }
  })

  return (
    <Panel title={t('learn.parent.title')} className="lg:col-span-2" id="learn-results">
      {!rows.some((row) => row.practised || row.last) ? (
        <p className="text-ink-soft">{t('learn.parent.empty')}</p>
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map(({ section, last, count, review, practised }) => (
              <li
                key={section.id}
                data-testid={`learn-row-${section.id}`}
                className="flex items-start gap-3 rounded-2xl bg-cream p-4"
              >
                <Img3D name={section.icon} className="size-12 shrink-0" />
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="font-display text-lg font-extrabold">
                    {t(`learn.sections.${section.id}`)}
                  </span>
                  {last ? (
                    <>
                      <span className="font-semibold">
                        {t('learn.result.independent', {
                          correct: last.independent,
                          total: last.total,
                        })}
                      </span>
                      {last.helped > 0 && (
                        <span className="text-sm text-ink-soft">
                          {t('learn.result.helped', { count: last.helped })}
                        </span>
                      )}
                      <span className="text-sm text-ink-soft">
                        {t('learn.parent.tests', { count })}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-ink-soft">
                      {practised ? t('learn.parent.noTest') : t('learn.parent.notStarted')}
                    </span>
                  )}
                  {review > 0 && (
                    <span className="text-sm font-semibold text-oops-ink">
                      {t('learn.parent.review', { count: review })}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {tests.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="font-display text-lg font-bold">{t('learn.parent.latest')}</h3>
              <ul className="flex flex-col divide-y-2 divide-line">
                {tests.slice(0, 8).map((session) => (
                  <li key={session.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                    <span className="w-32 text-ink-soft tabular-nums">
                      {date.format(new Date(session.at))}
                    </span>
                    <span className="flex-1 font-semibold">
                      {t(`learn.sections.${session.section}`)}
                    </span>
                    <span className="tabular-nums">
                      {session.independent}/{session.total}
                    </span>
                    {session.helped > 0 && (
                      <span className="text-ink-soft">
                        {t('learn.parent.helpedShort', { count: session.helped })}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-sm text-ink-soft">{t('learn.result.note')}</p>
        </>
      )}
    </Panel>
  )
}

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { tashkentDay } from '@/lib/dates'
import { useAttentionStore, type AttentionDay, type AttentionEvent } from '@/store/attentionStore'
import { useActiveChild } from '@/store/familyStore'
import { useChildKey } from '@/store/progressStore'
import { useLanguage } from '@/store/settingsStore'

const SHOWN_DAYS = 7
const ROWS: readonly AttentionEvent[] = ['reminders', 'away', 'offers', 'games']

/** The last `count` days, oldest first, as `YYYY-MM-DD` (Tashkent days, like the log). */
function lastDays(count: number, now = new Date()): string[] {
  return Array.from({ length: count }, (_, i) =>
    tashkentDay(new Date(now.getTime() - (count - 1 - i) * 86_400_000)),
  )
}

/**
 * The parent's attention report (Phase 71): for the active child, how often the
 * robot had to call them back over the last week, how often they left and came
 * back, and whether the games it offered were taken. Only counts, kept on this
 * device; nothing the camera saw is in it.
 */
export function AttentionReport() {
  const { t } = useTranslation()
  const language = useLanguage()
  const childKey = useChildKey()
  const child = useActiveChild()
  const log = useAttentionStore((state) => state.log[childKey])

  const { days, totals, peak } = useMemo(() => {
    const keys = lastDays(SHOWN_DAYS)
    const rows = keys.map(
      (day) => ({ day, ...(log?.[day] ?? null) }) as { day: string } & Partial<AttentionDay>,
    )
    const sum = Object.fromEntries(
      ROWS.map((row) => [row, rows.reduce((total, day) => total + (day[row] ?? 0), 0)]),
    ) as Record<AttentionEvent, number>
    const calls = rows.map((row) => (row.reminders ?? 0) + (row.away ?? 0))
    return {
      days: rows.map((row, i) => ({ day: row.day, calls: calls[i]! })),
      totals: sum,
      peak: Math.max(1, ...calls),
    }
  }, [log])

  const weekday = new Intl.DateTimeFormat(language === 'uz' ? 'uz-UZ' : language, {
    weekday: 'short',
    timeZone: 'UTC',
  })
  const label = (day: string) => weekday.format(new Date(`${day}T00:00:00Z`))
  const empty = ROWS.every((row) => totals[row] === 0)

  return (
    <section className="mt-2 flex flex-col gap-3" data-testid="attention-report">
      <h3 className="font-display text-lg font-bold">
        {child
          ? t('attentionSettings.reportTitle', { name: child.name })
          : t('attentionSettings.reportGuest')}
      </h3>
      <p className="text-sm text-ink-soft">{t('attentionSettings.reportHint')}</p>
      {empty ? (
        <p className="text-ink-soft" data-testid="attention-report-empty">
          {t('attentionSettings.reportEmpty')}
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-2">
            {ROWS.map((row) => (
              <div key={row} className="rounded-2xl bg-cream p-3">
                <dt className="text-sm text-ink-soft">{t(`attentionSettings.${row}`)}</dt>
                <dd
                  className="font-display text-2xl font-bold tabular-nums"
                  data-testid={`attention-total-${row}`}
                >
                  {totals[row]}
                </dd>
              </div>
            ))}
          </dl>
          <figure>
            <figcaption className="mb-2 text-sm font-semibold text-ink-soft">
              {t('attentionSettings.chart')}
            </figcaption>
            <ol className="flex h-28 items-end gap-2" aria-label={t('attentionSettings.chart')}>
              {days.map(({ day, calls }) => (
                <li
                  key={day}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                >
                  <span className="text-xs font-semibold tabular-nums text-ink-soft">
                    {calls || ''}
                  </span>
                  <span
                    className="w-full max-w-8 rounded-t-[4px] bg-primary"
                    style={{
                      height: `${Math.max(calls ? 6 : 2, (calls / peak) * 72)}%`,
                      opacity: calls ? 1 : 0.25,
                    }}
                    title={t('attentionSettings.dayCount', { day: label(day), count: calls })}
                  />
                  <span className="text-xs text-ink-soft">{label(day)}</span>
                  <span className="sr-only">
                    {t('attentionSettings.dayCount', { day: label(day), count: calls })}
                  </span>
                </li>
              ))}
            </ol>
          </figure>
        </>
      )}
    </section>
  )
}

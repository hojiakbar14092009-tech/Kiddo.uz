import { useEffect, useMemo, useState } from 'react'
import { useAnalyticsStore } from '@/domain/analytics'
import { retentionOf, type Retention } from './retention'
import { tashkentDay } from '@/lib/dates'
import { CountUp } from './CountUp'
import { IconChip, type AdminIconName } from './icons'

/** Whole percent of `whole` that `part` is, or null when nobody is due yet. */
function share(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 100) : null
}

const percent = (n: number) => `${Math.round(n)}%`

function useRetention(source: 'device' | 'cloud'): Retention | null | 'error' {
  const log = useAnalyticsStore((state) => state.log)
  const local = useMemo<Retention>(() => retentionOf(log, tashkentDay()), [log])
  const [cloud, setCloud] = useState<Retention | null | 'error'>(null)
  useEffect(() => {
    if (source !== 'cloud') return undefined
    let alive = true
    void (async () => {
      const { getAdminSupabase } = await import('@/services/supabase/client')
      const supabase = getAdminSupabase()
      if (!supabase) return
      const { data, error } = await supabase.rpc('admin_retention', { p_days: 30 })
      if (!alive) return
      const row = (data as Record<string, number>[] | null)?.[0]
      setCloud(
        error || !row
          ? 'error'
          : {
              installs: Number(row.installs),
              due2: Number(row.eligible_day2),
              day2: Number(row.returned_day2),
              due7: Number(row.eligible_day7),
              day7: Number(row.returned_day7),
            },
      )
    })()
    return () => {
      alive = false
    }
  }, [source])
  return source === 'cloud' ? cloud : local
}

/** Bosh sahifa KPI: yangi qurilmalar, 2-kun va 7-kun qaytganlar (30 kun). */
export function RetentionTiles({ source }: { source: 'device' | 'cloud' }) {
  const retention = useRetention(source)
  if (retention === 'error') {
    return (
      <p role="alert" className="text-sm text-[var(--a-coral)] lg:col-span-4 xl:col-span-3">
        Qaytish ko‘rsatkichlari olinmadi (0019 migratsiyasi qo‘llanganmi?).
      </p>
    )
  }
  const tiles: {
    label: string
    icon: AdminIconName
    value: number | null
    format?: (n: number) => string
    hint: string
  }[] = [
    {
      label: 'Yangi qurilmalar (30 kun)',
      icon: 'installs',
      value: retention ? retention.installs : null,
      hint: 'ilovani birinchi ochgan',
    },
    {
      label: '2-kun qaytdi',
      icon: 'day2',
      value: retention ? share(retention.day2, retention.due2) : null,
      format: percent,
      hint: retention ? `${retention.day2} / ${retention.due2} ta qurilma` : '',
    },
    {
      label: '7-kun qaytdi',
      icon: 'day7',
      value: retention ? share(retention.day7, retention.due7) : null,
      format: percent,
      hint: retention ? `${retention.day7} / ${retention.due7} ta qurilma` : '',
    },
  ]
  return (
    <>
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="kd-panel kd-kpi flex flex-col gap-1 p-4"
          data-testid="retention-tile"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-[var(--a-ink-soft)]">{tile.label}</span>
            <IconChip name={tile.icon} />
          </div>
          <span className="kd-num text-xl font-bold sm:text-3xl">
            {tile.value === null ? (
              retention ? (
                '—'
              ) : (
                '…'
              )
            ) : (
              <CountUp value={tile.value} format={tile.format} />
            )}
          </span>
          <span className="text-xs text-[var(--a-ink-faint)]">{tile.hint}</span>
        </div>
      ))}
    </>
  )
}

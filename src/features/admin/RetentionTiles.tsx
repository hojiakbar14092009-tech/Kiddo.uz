import { useEffect, useMemo, useState } from 'react'
import { useAnalyticsStore } from '@/domain/analytics'
import { retentionOf, type Retention } from './retention'
import { tashkentDay } from '@/lib/dates'

function share(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—'
}

function useRetention(source: 'device' | 'cloud'): Retention | null | 'error' {
  const log = useAnalyticsStore((state) => state.log)
  const local = useMemo<Retention>(() => retentionOf(log, tashkentDay()), [log])
  const [cloud, setCloud] = useState<Retention | null | 'error'>(null)
  useEffect(() => {
    if (source !== 'cloud') return undefined
    let alive = true
    void (async () => {
      const { getSupabase } = await import('@/services/supabase/client')
      const supabase = getSupabase()
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
  const tiles = [
    {
      label: 'Yangi qurilmalar (30 kun)',
      value: retention ? String(retention.installs) : '…',
      hint: 'ilovani birinchi ochgan',
    },
    {
      label: '2-kun qaytdi',
      value: retention ? share(retention.day2, retention.due2) : '…',
      hint: retention ? `${retention.day2} / ${retention.due2} ta qurilma` : '',
    },
    {
      label: '7-kun qaytdi',
      value: retention ? share(retention.day7, retention.due7) : '…',
      hint: retention ? `${retention.day7} / ${retention.due7} ta qurilma` : '',
    },
  ]
  return (
    <>
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="kd-panel flex flex-col gap-1 p-4"
          data-testid="retention-tile"
        >
          <span className="text-sm text-[var(--a-ink-soft)]">{tile.label}</span>
          <span className="kd-num text-xl font-bold sm:text-3xl">{tile.value}</span>
          <span className="text-xs text-[var(--a-ink-faint)]">{tile.hint}</span>
        </div>
      ))}
    </>
  )
}

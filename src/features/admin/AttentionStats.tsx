import { useEffect, useMemo, useState } from 'react'
import { useAnalyticsStore, withinDays, type AnalyticsEventName } from '@/domain/analytics'
import { tashkentDay } from '@/lib/dates'
import { Panel } from './AdminSections'
import { STEP_LABELS } from './analyticsLabels'

/*
 * Diqqat yordamchisi (Phase 71): how families use the attention helper, as counts
 * only. No camera picture ever leaves a child's device, so there is none to show
 * here: the admin sees how many devices allowed it, used the camera, had the robot
 * call a child back, and took the games it offered.
 */

const ATTENTION_ROWS: readonly AnalyticsEventName[] = [
  'attention_yes',
  'attention_no',
  'attention_camera',
  'attention_nudge',
  'attention_offer',
  'attention_offer_taken',
]

interface AttentionRow {
  name: AnalyticsEventName
  /** Devices (installs) with this at least once in the period. */
  installs: number
  /** Days it happened on, summed over the devices. */
  days: number
}

type Load =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; rows: AttentionRow[] }

function useCloudAttention(days: number, enabled: boolean): Load {
  const [result, setResult] = useState<{ days: number; load: Load } | null>(null)
  useEffect(() => {
    if (!enabled) return undefined
    let alive = true
    void (async () => {
      let load: Load
      try {
        const { getAdminSupabase } = await import('@/services/supabase/client')
        const supabase = getAdminSupabase()
        if (!supabase) throw new Error('Supabase sozlanmagan.')
        const { data, error } = await supabase.rpc('admin_attention_stats', { p_days: days })
        if (error) throw new Error(error.message)
        const found = new Map(
          ((data ?? []) as { name: string; installs: number; days: number }[]).map((row) => [
            row.name,
            row,
          ]),
        )
        load = {
          status: 'ready',
          rows: ATTENTION_ROWS.map((name) => ({
            name,
            installs: Number(found.get(name)?.installs ?? 0),
            days: Number(found.get(name)?.days ?? 0),
          })),
        }
      } catch (reason) {
        load = { status: 'error', message: (reason as Error).message }
      }
      if (alive) setResult({ days, load })
    })()
    return () => {
      alive = false
    }
  }, [days, enabled])
  return result && result.days === days ? result.load : { status: 'loading' }
}

export function AttentionStats({ source, days }: { source: 'device' | 'cloud'; days: number }) {
  const log = useAnalyticsStore((state) => state.log)
  const local = useMemo<AttentionRow[]>(() => {
    const recent = withinDays(log, tashkentDay(), days)
    return ATTENTION_ROWS.map((name) => {
      const mine = recent.filter((event) => event.name === name)
      return { name, installs: new Set(mine.map((event) => event.install)).size, days: mine.length }
    })
  }, [days, log])
  const cloud = useCloudAttention(days, source === 'cloud')
  const load: Load = source === 'cloud' ? cloud : { status: 'ready', rows: local }

  return (
    <Panel title="Diqqat yordamchisi">
      <p className="mb-3 max-w-prose text-sm text-[var(--a-ink-soft)]">
        Faqat sonlar. Kamera tasviri bola qurilmasidan hech qachon chiqmaydi, shuning uchun bu yerda
        video yo‘q va bo‘lmaydi. Ota-ona har bir bolaning hisobotini o‘z Sozlamalarida ko‘radi.
      </p>
      {load.status === 'loading' && <p className="text-[var(--a-ink-soft)]">Yuklanmoqda…</p>}
      {load.status === 'error' && (
        <p role="alert" className="text-sm font-bold text-[var(--a-coral)]">
          Ma’lumot olinmadi: {load.message}. Supabase’da 0023_attention.sql migratsiyasi
          bajarilganini tekshiring.
        </p>
      )}
      {load.status === 'ready' && (
        <table className="w-full text-sm" data-testid="admin-attention">
          <thead>
            <tr className="text-left text-[var(--a-ink-soft)]">
              <th className="py-2 font-bold">Nima bo‘ldi</th>
              <th className="py-2 text-right font-bold">Qurilmalar</th>
              <th className="py-2 text-right font-bold">Kunlar</th>
            </tr>
          </thead>
          <tbody>
            {load.rows.map((row) => (
              <tr
                key={row.name}
                className="border-t border-[var(--a-line)]"
                data-testid={`admin-attention-${row.name}`}
              >
                <td className="py-2">{STEP_LABELS[row.name]}</td>
                <td className="kd-num py-2 text-right">{row.installs}</td>
                <td className="kd-num py-2 text-right">{row.days}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  )
}

import clsx from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import {
  exitsOf,
  funnelOf,
  FUNNEL_STEPS,
  useAnalyticsStore,
  withinDays,
  type ExitRow,
  type FunnelRow,
} from '@/domain/analytics'
import { tashkentDay } from '@/lib/dates'
import { Panel } from './AdminSections'
import { screenName, STEP_LABELS } from './analyticsLabels'

/*
 * Analitika (Phase 37): how far families get and where the app is left,
 * from anonymous events only (installs, never people). Device admin: this
 * device's events; cloud admin: everyone's, as counts from the server.
 */

interface Report {
  funnel: FunnelRow[]
  exits: ExitRow[]
}

type Load =
  { status: 'loading' } | { status: 'error'; message: string } | ({ status: 'ready' } & Report)

function useCloudReport(days: number, enabled: boolean): Load {
  const [result, setResult] = useState<{ days: number; load: Load } | null>(null)
  useEffect(() => {
    if (!enabled) return undefined
    let alive = true
    const done = (load: Load) => {
      if (alive) setResult({ days, load })
    }
    void (async () => {
      try {
        const { getSupabase } = await import('@/services/supabase/client')
        const supabase = getSupabase()
        if (!supabase) throw new Error('Supabase sozlanmagan.')
        const [funnel, exits] = await Promise.all([
          supabase.rpc('admin_analytics_funnel', { p_days: days }),
          supabase.rpc('admin_analytics_exits', { p_days: days }),
        ])
        if (funnel.error || exits.error) throw new Error((funnel.error ?? exits.error)!.message)
        const counts = new Map(
          ((funnel.data ?? []) as { name: string; installs: number }[]).map((row) => [
            row.name,
            Number(row.installs),
          ]),
        )
        done({
          status: 'ready',
          funnel: FUNNEL_STEPS.map((step) => ({ step, installs: counts.get(step) ?? 0 })),
          exits: ((exits.data ?? []) as { screen: string; closes: number }[])
            .slice(0, 8)
            .map((row) => ({ screen: row.screen, count: Number(row.closes) })),
        })
      } catch (reason) {
        done({ status: 'error', message: (reason as Error).message })
      }
    })()
    return () => {
      alive = false
    }
  }, [days, enabled])
  // a period not loaded yet shows "loading" (no state set during the effect)
  return result && result.days === days ? result.load : { status: 'loading' }
}

export function AnalyticsSection({ source }: { source: 'device' | 'cloud' }) {
  const [days, setDays] = useState(30)
  const log = useAnalyticsStore((state) => state.log)
  const local = useMemo<Report>(() => {
    const recent = withinDays(log, tashkentDay(), days)
    return { funnel: funnelOf(recent), exits: exitsOf(recent) }
  }, [log, days])
  const cloud = useCloudReport(days, source === 'cloud')
  const load: Load = source === 'cloud' ? cloud : { status: 'ready', ...local }

  return (
    <div className="flex flex-col gap-4" data-testid="admin-analytics">
      <Panel title="Oilalar yo‘li">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <p className="mr-auto max-w-prose text-sm text-[var(--a-ink-soft)]">
            Har bir qadamga yetgan qurilmalar soni. Raqamlar ismsiz: kim ekani saqlanmaydi.
            {source === 'device' &&
              ' Bu faqat shu qurilmaning ma’lumoti; barcha oilalarni ko‘rish uchun admin hisobi bilan kiring.'}
          </p>
          <div role="group" aria-label="Davr" className="flex gap-1">
            {[7, 30].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setDays(value)}
                aria-pressed={days === value}
                className={clsx(
                  'h-9 rounded-full px-4 text-sm font-bold',
                  days === value
                    ? 'bg-[var(--a-accent)] text-[var(--a-accent-ink)]'
                    : 'border border-[var(--a-line)] text-[var(--a-ink-soft)]',
                )}
              >
                {value} kun
              </button>
            ))}
          </div>
        </div>
        {load.status === 'loading' && <p className="text-[var(--a-ink-soft)]">Yuklanmoqda…</p>}
        {load.status === 'error' && (
          <p role="alert" className="text-sm font-bold text-[var(--a-coral)]">
            Ma’lumot olinmadi: {load.message}. Supabase’da 0016_analytics.sql migratsiyasi
            bajarilganini tekshiring.
          </p>
        )}
        {load.status === 'ready' && <Funnel rows={load.funnel} />}
      </Panel>

      <Panel title="Ilova qayerda yopilgan">
        <p className="mb-3 text-sm text-[var(--a-ink-soft)]">
          Bola ilovadan chiqqan paytdagi sahifa. Ro‘yxat tepasidagi sahifalarni birinchi bo‘lib
          tekshirish kerak.
        </p>
        {load.status === 'ready' &&
          (load.exits.length === 0 ? (
            <p className="text-[var(--a-ink-soft)]">Hali ma’lumot yo‘q.</p>
          ) : (
            <table className="w-full text-sm" data-testid="admin-exits">
              <thead>
                <tr className="text-left text-[var(--a-ink-soft)]">
                  <th className="py-2 font-bold">Sahifa</th>
                  <th className="py-2 text-right font-bold">Yopilgan</th>
                </tr>
              </thead>
              <tbody>
                {load.exits.map((row) => (
                  <tr key={row.screen} className="border-t border-[var(--a-line)]">
                    <td className="py-2">
                      {screenName(row.screen)}{' '}
                      <span className="text-[var(--a-ink-faint)]">{row.screen}</span>
                    </td>
                    <td className="kd-num py-2 text-right">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
      </Panel>
    </div>
  )
}

/** One bar per step, as long as its share of the first step; the loss from the step before beside it. */
function Funnel({ rows }: { rows: readonly FunnelRow[] }) {
  const first = rows[0]?.installs ?? 0
  if (first === 0) {
    return <p className="text-[var(--a-ink-soft)]">Bu davrda hali hech kim ilovani ochmagan.</p>
  }
  return (
    <ol className="flex flex-col gap-3" data-testid="admin-funnel">
      {rows.map((row, index) => {
        const share = row.installs / first
        const before = index > 0 ? rows[index - 1]!.installs : row.installs
        const lost = Math.max(0, before - row.installs)
        return (
          <li key={row.step} data-step={row.step} data-installs={row.installs}>
            <div className="mb-1 flex flex-wrap items-baseline gap-x-3 text-sm">
              <span className="font-bold text-[var(--a-ink)]">{STEP_LABELS[row.step]}</span>
              <span className="kd-num text-[var(--a-ink)]">{row.installs}</span>
              <span className="kd-num text-[var(--a-ink-soft)]">{Math.round(share * 100)}%</span>
              {index > 0 && lost > 0 && (
                <span className="kd-num ml-auto text-[var(--a-coral)]">−{lost} chiqib ketdi</span>
              )}
            </div>
            <div className="h-3 rounded-full bg-[var(--a-raise)]" aria-hidden="true">
              <div
                className="h-3 rounded-full bg-[var(--a-accent)]"
                style={{ width: `${Math.min(100, Math.max(share > 0 ? 2 : 0, share * 100))}%` }}
              />
            </div>
          </li>
        )
      })}
    </ol>
  )
}

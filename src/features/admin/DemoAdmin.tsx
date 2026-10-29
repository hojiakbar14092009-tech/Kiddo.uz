import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { DEMO_PROMO_CODES } from '@/config/demoPromoCodes'
import { snapshotOf } from '@/domain/universe/progression'
import { useFamilyStore } from '@/store/familyStore'
import { isProActive, normalizePromo, useSubscriptionStore } from '@/store/subscriptionStore'
import type { AdminData } from './adminData'
import { Panel } from './AdminSections'

/*
 * The demo admin's own screens (Phase 20): what the children on this device
 * learn, and the demo switches (simulated PRO, the ten demo promo codes, a
 * reset). Nothing here is a payment, and nothing reaches a server.
 */

const STRAND_NAMES: Record<string, string> = {
  number: 'Matematika',
  language: 'Til',
  letters: 'Harflar',
  reading: 'O‘qish',
  logic: 'Mantiq',
  science: 'Fan',
  space: 'Koinot',
  art: 'Ijod',
  social: 'Tuyg‘ular',
}

const DAY = 86_400_000

export function DemoBanner() {
  return (
    <p
      data-testid="demo-admin-banner"
      className="kd-panel flex items-center gap-2 px-4 py-2 text-sm text-[var(--a-ink-soft)]"
    >
      <span aria-hidden="true" className="inline-block size-2 rounded-full bg-[var(--a-gold)]" />
      <span>
        <b className="text-[var(--a-ink)]">Demo boshqaruv rejimi</b> – faqat shu qurilmadagi
        ma’lumotlar; to‘lovlar va haqiqiy hisoblar ishlatilmaydi.
      </span>
    </p>
  )
}

/** What the children on this device have been learning (no money figures in the demo). */
export function DemoOverview({ data }: { data: AdminData }) {
  const children = useFamilyStore((state) => state.children)
  const pro = useSubscriptionStore((state) => isProActive(state))
  // the moment the panel opened: "the last 7 days" does not move while it is open
  const [now] = useState(() => Date.now())
  const stats = useMemo(() => {
    const runs = children.flatMap((child) =>
      snapshotOf(child.id).recent.map((run) => ({ ...run, child: child.name })),
    )
    const week = runs.filter((run) => now - Date.parse(run.at) < 7 * DAY)
    const homeworks = children.flatMap((child) => child.homeworks ?? [])
    const byStrand = new Map<string, number>()
    for (const run of week) byStrand.set(run.strand, (byStrand.get(run.strand) ?? 0) + 1)
    return {
      week: week.length,
      threeStars: week.filter((run) => run.stars >= 3).length,
      open: homeworks.filter((hw) => !hw.completedAt).length,
      done: homeworks.filter((hw) => hw.completedAt).length,
      strands: [...byStrand.entries()].sort((a, b) => b[1] - a[1]),
      latest: [...runs].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 6),
    }
  }, [children, now])
  const coins = data.children.reduce((sum, child) => sum + child.coins, 0)
  const max = Math.max(1, ...stats.strands.map(([, n]) => n))

  const kpis = [
    { label: 'Bolalar', value: children.length, note: 'shu qurilmada' },
    { label: 'Mashg‘ulotlar', value: stats.week, note: 'oxirgi 7 kun' },
    { label: 'Uy vazifalari', value: stats.open, note: `${stats.done} tasi bajarilgan` },
    { label: 'Tangalar', value: coins, note: pro ? 'Demo PRO yoqilgan' : 'PRO o‘chiq' },
  ]

  return (
    <div className="grid gap-4 xl:grid-cols-3" data-testid="demo-overview">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:col-span-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="kd-panel flex flex-col gap-1 p-4">
            <span className="text-sm text-[var(--a-ink-soft)]">{kpi.label}</span>
            <span className="kd-num text-2xl font-bold sm:text-3xl">{kpi.value}</span>
            <span className="text-xs text-[var(--a-ink-faint)]">{kpi.note}</span>
          </div>
        ))}
      </div>
      <Panel title="Nimani o‘rganishyapti (7 kun)" className="xl:col-span-2">
        {stats.strands.length === 0 ? (
          <p className="text-sm text-[var(--a-ink-soft)]">
            Hali mashg‘ulot yo‘q. Bola bir nechta o‘yin o‘ynasa, bu yerda sohalar bo‘yicha
            ko‘rinadi.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {stats.strands.map(([strand, count]) => (
              <li key={strand} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-sm font-bold">
                  {STRAND_NAMES[strand] ?? strand}
                </span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--a-raise)]">
                  <span
                    className="block h-full rounded-full bg-[var(--a-accent)]"
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </span>
                <span className="kd-num w-8 text-right text-sm">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="Bolalar" className="xl:col-span-3">
        {data.children.length === 0 ? (
          <p className="text-sm text-[var(--a-ink-soft)]">
            Bu qurilmada hali bola profili yo‘q. Ota-ona bo‘limida profil qo‘shiladi.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="demo-children">
            {data.children.map((child) => (
              <li key={child.id} className="flex flex-col gap-1 rounded-lg bg-[var(--a-raise)] p-3">
                <span className="font-bold">{child.name}</span>
                <span className="text-sm text-[var(--a-ink-soft)]">
                  {child.age === null ? 'Yoshi ko‘rsatilmagan' : `${child.age} yosh`} ·{' '}
                  <span className="kd-num">{child.coins}</span> tanga
                </span>
                <span className="text-xs text-[var(--a-ink-faint)]">
                  {child.lastSeen
                    ? `Oxirgi faollik: ${new Date(child.lastSeen).toLocaleDateString('uz-UZ')}`
                    : 'Hali o‘ynamagan'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="So‘nggi mashg‘ulotlar">
        {stats.latest.length === 0 ? (
          <p className="text-sm text-[var(--a-ink-soft)]">Hali hech narsa yo‘q.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {stats.latest.map((run) => (
              <li key={run.id} className="flex items-center gap-2">
                <span className="flex-1 font-bold">{run.child}</span>
                <span className="text-[var(--a-ink-soft)]">
                  {STRAND_NAMES[run.strand] ?? run.strand}
                </span>
                <span aria-label={`${run.stars} yulduz`} className="text-[var(--a-gold)]">
                  {'★'.repeat(Math.max(0, Math.min(3, run.stars)))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}

/** Simulated PRO, the ten demo promo codes and a reset. */
export function DemoControls() {
  const subscription = useSubscriptionStore()
  const active = isProActive(subscription)
  const demoOn = active && subscription.source === 'demo'
  const real = active && subscription.source !== 'demo'
  const used = new Set(subscription.usedPromoCodes)
  const [copied, setCopied] = useState<string | null>(null)

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(code)
    } catch {
      setCopied(null)
    }
  }

  const reset = () => {
    const demoDays = new Map(DEMO_PROMO_CODES.map((item) => [item.code, item.days]))
    useSubscriptionStore.setState((state) => {
      // only what the demo gave: the demo switch, and the days the demo codes
      // added (a code from an ad keeps its days and stays used)
      const usedDemo = state.usedPromoCodes.filter((code) => demoDays.has(normalizePromo(code)))
      const kept = state.usedPromoCodes.filter((code) => !demoDays.has(normalizePromo(code)))
      if (state.source === 'demo') {
        return { usedPromoCodes: kept, plan: null, expiresAt: null, source: null }
      }
      if (usedDemo.length === 0) return {}
      // PRO from somewhere else (a purchase, an admin gift) keeps the codes used,
      // so freeing them can never stack days on top of it
      if (state.source !== 'promo' || !state.expiresAt) {
        return isProActive(state) ? {} : { usedPromoCodes: kept }
      }
      const days = usedDemo.reduce(
        (sum, code) => sum + (demoDays.get(normalizePromo(code)) ?? 0),
        0,
      )
      const until = Date.parse(state.expiresAt) - days * DAY
      return until > Date.now()
        ? { usedPromoCodes: kept, expiresAt: new Date(until).toISOString() }
        : { usedPromoCodes: kept, plan: null, expiresAt: null, source: null }
    })
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2" data-testid="demo-controls">
      <Panel title="Demo PRO (sinov)">
        <div className="flex items-center justify-between gap-4">
          <span id="demo-admin-pro" className="text-sm">
            <span className="block font-bold">PRO’ni sinov uchun yoqish</span>
            <span className="text-[var(--a-ink-soft)]">
              {real
                ? 'PRO promokod bilan yoqilgan – avval demoni tiklang.'
                : 'To‘lov yo‘q: faqat shu qurilmada PRO qismlari ochiladi.'}
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={demoOn}
            aria-labelledby="demo-admin-pro"
            disabled={real}
            data-testid="demo-pro-switch"
            onClick={() => subscription.setDemoPro(!demoOn)}
            className={clsx(
              'flex h-11 w-[4.5rem] shrink-0 items-center rounded-full p-1 transition-colors disabled:opacity-40',
              demoOn ? 'bg-[var(--a-accent)]' : 'bg-[var(--a-line)]',
            )}
          >
            <span
              aria-hidden="true"
              className={clsx(
                'size-9 rounded-full bg-white shadow transition-transform',
                demoOn && 'translate-x-7',
              )}
            />
          </button>
        </div>
        <button
          type="button"
          onClick={reset}
          data-testid="demo-reset"
          className="mt-4 min-h-11 self-start rounded-full border border-[var(--a-line)] px-4 text-sm font-bold"
        >
          Demoni tiklash (promokodlar va PRO)
        </button>
      </Panel>

      <Panel title="Demo promokodlar (10 ta)">
        <p className="text-sm text-[var(--a-ink-soft)]">
          Ota-ona bo‘limidagi «Promokod» qismida kiritiladi. Har biri shu qurilmada bir marta
          ishlaydi.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2" data-testid="demo-promo-list">
          {DEMO_PROMO_CODES.map((item) => {
            const isUsed = used.has(item.code)
            return (
              <li
                key={item.code}
                data-code={item.code}
                data-used={isUsed}
                className="flex items-center gap-2 rounded-lg bg-[var(--a-raise)] px-3 py-2"
              >
                <code className="kd-num flex-1 font-bold tracking-wide">{item.code}</code>
                <span className="text-xs text-[var(--a-ink-soft)]">{item.days} kun</span>
                <span
                  className={clsx(
                    'rounded-full px-2 py-0.5 text-xs font-bold',
                    isUsed
                      ? 'bg-[var(--a-line)] text-[var(--a-ink-soft)]'
                      : 'bg-[var(--a-accent-soft)] text-[var(--a-accent)]',
                  )}
                >
                  {isUsed ? 'ishlatilgan' : 'bo‘sh'}
                </span>
                <button
                  type="button"
                  onClick={() => void copy(item.code)}
                  aria-label={`${item.code} nusxalash`}
                  className="min-h-11 rounded-full px-2 text-xs font-bold text-[var(--a-accent)]"
                >
                  {copied === item.code ? 'Nusxalandi' : 'Nusxa'}
                </button>
              </li>
            )
          })}
        </ul>
      </Panel>
    </div>
  )
}

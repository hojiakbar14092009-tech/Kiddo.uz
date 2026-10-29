import { DEMO } from '@/config/demo'
import clsx from 'clsx'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { YEARLY_DISCOUNT, yearlyPrice } from '@/store/appSettingsStore'
import type { Payment } from '@/store/paymentStore'
import type { AdminChild, AdminData } from './adminData'
import { CODE_PATTERN, type AdminPromo } from './adminPromo'
import { dailyBars, formatSom, monthlyBars, revenueTotals } from './revenue'
import { RevenueChart } from './RevenueChart'
import { clampGift, MAX_PRO_GIFT_COINS } from './settingsLimits'

const MONTHS = [
  'yan',
  'fev',
  'mar',
  'apr',
  'may',
  'iyun',
  'iyul',
  'avg',
  'sen',
  'okt',
  'noy',
  'dek',
]
const MONTHS_LONG = [
  'Yanvar',
  'Fevral',
  'Mart',
  'Aprel',
  'May',
  'Iyun',
  'Iyul',
  'Avgust',
  'Sentyabr',
  'Oktyabr',
  'Noyabr',
  'Dekabr',
]
const PLAN_NAMES: Record<string, string> = { monthly: '1 oy', yearly: '1 yil', lifetime: 'Umrbod' }

function dayLabel(date: Date) {
  return `${date.getDate()}-${MONTHS[date.getMonth()]}`
}

function dateTime(iso: string) {
  const date = new Date(iso)
  return `${dayLabel(date)}, ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function ago(iso: string | null) {
  if (!iso) return '—'
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000)
  if (minutes < 1) return 'hozirgina'
  if (minutes < 60) return `${minutes} daqiqa oldin`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} soat oldin`
  return dateTime(iso)
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={clsx('kd-panel flex flex-col gap-4 p-5', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex gap-1 rounded-full bg-[var(--a-raise)] p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={clsx(
            'rounded-full px-3 py-1.5 text-sm font-bold transition-colors',
            value === option.value
              ? 'bg-[var(--a-accent)] text-[var(--a-accent-ink)]'
              : 'text-[var(--a-ink-soft)] hover:text-[var(--a-ink)]',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function ProBadge({ child }: { child: AdminChild }) {
  if (!child.pro) {
    return (
      <span className="rounded-full bg-[var(--a-raise)] px-2.5 py-1 text-xs font-bold text-[var(--a-ink-soft)]">
        Bepul
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--a-gold-soft)] px-2.5 py-1 text-xs font-bold text-[var(--a-gold)]">
      PRO
      {child.proUntil && (
        <span className="font-semibold opacity-80">{dayLabel(new Date(child.proUntil))} gacha</span>
      )}
    </span>
  )
}

/* ---------------------------------------------------------------- overview */

export function Overview({ data }: { data: AdminData }) {
  const [range, setRange] = useState<'days' | 'months'>('days')
  const totals = revenueTotals(data.payments)
  const bars = useMemo(
    () => (range === 'days' ? dailyBars(data.payments, 30) : monthlyBars(data.payments, 12)),
    [data.payments, range],
  )
  const online = data.children.filter((child) => child.online)
  const proCount = data.children.filter((child) => child.pro).length
  const total = data.children.length

  const kpis = [
    { label: 'Bugun', value: totals.today },
    { label: 'Shu hafta', value: totals.week },
    { label: 'Shu oy', value: totals.month },
    { label: 'Shu yil', value: totals.year },
  ]

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:col-span-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="kd-panel flex flex-col gap-1 p-4">
            <span className="text-sm text-[var(--a-ink-soft)]">{kpi.label}</span>
            <span className="kd-num text-xl font-bold whitespace-nowrap sm:text-3xl">
              {formatSom(kpi.value.amount)}
              <span className="ml-1 text-sm font-semibold text-[var(--a-ink-faint)]">so‘m</span>
            </span>
            <span className="text-xs text-[var(--a-ink-faint)]">
              {kpi.value.count} ta PRO to‘lovi
            </span>
          </div>
        ))}
      </div>

      <Panel
        title="Daromad"
        className="xl:col-span-2"
        action={
          <Segmented
            label="Davr"
            value={range}
            onChange={setRange}
            options={[
              { value: 'days', label: '30 kun' },
              { value: 'months', label: '12 oy' },
            ]}
          />
        }
      >
        <RevenueChart
          bars={bars}
          label={(bar) =>
            range === 'days'
              ? dayLabel(bar.start)
              : `${MONTHS_LONG[bar.start.getMonth()]} ${bar.start.getFullYear()}`
          }
          tick={(bar, index) =>
            range === 'days'
              ? index % 5 === 4 || index === bars.length - 1
                ? dayLabel(bar.start)
                : null
              : MONTHS[bar.start.getMonth()]!
          }
        />
        <p className="text-xs text-[var(--a-ink-faint)]">
          Oltin ustun – joriy {range === 'days' ? 'kun' : 'oy'}. Ustun ustiga olib boring – aniq
          summa chiqadi.
        </p>
      </Panel>

      <div className="flex flex-col gap-4">
        <Panel title={`Hozir o‘ynayapti: ${online.length}`}>
          {online.length === 0 ? (
            <p className="text-sm text-[var(--a-ink-soft)]">Hozir hech kim o‘ynamayapti.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {online.map((child) => (
                <li key={child.id} className="flex items-center gap-3">
                  <span className="kd-online" aria-hidden="true" />
                  <span className="flex-1 font-bold">{child.name}</span>
                  <span className="text-xs text-[var(--a-ink-faint)]">{child.screen ?? ''}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="PRO ulushi">
          <div className="flex items-baseline gap-2">
            <span className="kd-num text-3xl font-bold text-[var(--a-gold)]">{proCount}</span>
            <span className="text-[var(--a-ink-soft)]">/ {total} bola PRO’da</span>
          </div>
          <div
            className="h-2.5 overflow-hidden rounded-full bg-[var(--a-raise)]"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={proCount}
            aria-label="PRO ulushi"
          >
            <div
              className="h-full rounded-full bg-[var(--a-gold)] transition-[width] duration-700"
              style={{ width: `${total ? (proCount / total) * 100 : 0}%` }}
            />
          </div>
        </Panel>
      </div>

      <Panel title="So‘nggi to‘lovlar" className="xl:col-span-3">
        <PaymentList payments={data.payments.slice(0, 6)} highlight={data.livePayment?.id} />
      </Panel>
    </div>
  )
}

/* ---------------------------------------------------------------- children */

type ChildFilter = 'all' | 'pro' | 'free' | 'online'

export function ChildrenSection({ data }: { data: AdminData }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ChildFilter>('all')
  const [busy, setBusy] = useState<string | null>(null)
  const list = data.children
    .filter((child) =>
      filter === 'pro'
        ? child.pro
        : filter === 'free'
          ? !child.pro
          : filter === 'online'
            ? child.online
            : true,
    )
    .filter((child) =>
      `${child.name} ${child.family}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
    )
    .sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name))

  const run = async (child: AdminChild, work: () => Promise<void>) => {
    setBusy(child.id)
    try {
      await work()
    } finally {
      setBusy(null)
    }
  }

  return (
    <Panel
      title={`Bolalar: ${data.children.length}`}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="admin-search">
            Qidirish
          </label>
          <input
            id="admin-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ism yoki oila"
            className="h-10 w-48 rounded-full border border-[var(--a-line)] bg-[var(--a-raise)] px-4 text-sm outline-none focus:border-[var(--a-accent)]"
          />
          <Segmented
            label="Saralash"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'Hammasi' },
              { value: 'pro', label: 'PRO' },
              { value: 'free', label: 'Bepul' },
              { value: 'online', label: 'Onlayn' },
            ]}
          />
        </div>
      }
    >
      {list.length === 0 ? (
        <p className="py-8 text-center text-[var(--a-ink-soft)]">
          {data.children.length === 0
            ? 'Hali bola profillari yo‘q. Ota-onalar profil qo‘shganda shu yerda chiqadi.'
            : 'Bu saralashda bola topilmadi.'}
        </p>
      ) : (
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-[var(--a-ink-faint)]">
              <tr className="border-b border-[var(--a-line)]">
                <th scope="col" className="px-5 py-2 font-semibold">
                  Bola
                </th>
                <th scope="col" className="py-2 font-semibold">
                  Yosh
                </th>
                <th scope="col" className="py-2 font-semibold">
                  Oila
                </th>
                <th scope="col" className="py-2 font-semibold">
                  Obuna
                </th>
                <th scope="col" className="py-2 text-right font-semibold">
                  Coin
                </th>
                <th scope="col" className="py-2 pl-6 font-semibold">
                  Oxirgi faollik
                </th>
                <th scope="col" className="px-5 py-2 text-right font-semibold">
                  Amallar
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((child) => (
                <tr key={child.id} className="border-b border-[var(--a-line)] last:border-0">
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-2.5 font-bold">
                      {child.online ? (
                        <span className="kd-online" title="Onlayn" />
                      ) : (
                        <span className="inline-block size-[9px] rounded-full bg-[var(--a-ink-faint)] opacity-40" />
                      )}
                      {child.name}
                    </span>
                  </td>
                  <td className="kd-num py-3">{child.age ?? '—'}</td>
                  <td className="max-w-48 truncate py-3 text-[var(--a-ink-soft)]">
                    {child.family}
                  </td>
                  <td className="py-3">
                    <ProBadge child={child} />
                  </td>
                  <td className="kd-num py-3 text-right">{child.coins}</td>
                  <td className="py-3 pl-6 text-[var(--a-ink-soft)]">
                    {child.online ? (
                      <span className="font-bold text-[var(--a-online)]">o‘ynayapti</span>
                    ) : (
                      ago(child.lastSeen)
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1.5">
                      <ActionButton
                        disabled={busy === child.id}
                        onClick={() => run(child, () => data.actions.grantCoins(child, 50))}
                      >
                        +50 coin
                      </ActionButton>
                      <ActionButton
                        tone="gold"
                        disabled={busy === child.id}
                        onClick={() => run(child, () => data.actions.grantPro(child, 30))}
                      >
                        PRO +30 kun
                      </ActionButton>
                      {child.pro && (
                        <ActionButton
                          tone="danger"
                          disabled={busy === child.id}
                          onClick={() => {
                            if (window.confirm(`${child.name}: PRO bekor qilinsinmi?`)) {
                              void run(child, () => data.actions.revokePro(child))
                            }
                          }}
                        >
                          PRO’ni o‘chirish
                        </ActionButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}

function ActionButton({
  children,
  onClick,
  disabled,
  tone = 'plain',
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  tone?: 'plain' | 'gold' | 'danger'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-colors disabled:opacity-50',
        tone === 'gold' &&
          'bg-[var(--a-gold-soft)] text-[var(--a-gold)] hover:bg-[var(--a-gold)] hover:text-[#1d1300]',
        tone === 'danger' &&
          'bg-[var(--a-coral-soft)] text-[var(--a-coral)] hover:bg-[var(--a-coral)] hover:text-white',
        tone === 'plain' &&
          'bg-[var(--a-accent-soft)] text-[var(--a-accent)] hover:bg-[var(--a-accent)] hover:text-[var(--a-accent-ink)]',
      )}
    >
      {children}
    </button>
  )
}

/* ---------------------------------------------------------------- payments */

function PaymentList({ payments, highlight }: { payments: Payment[]; highlight?: string }) {
  if (payments.length === 0) {
    return (
      <p className="py-6 text-center text-[var(--a-ink-soft)]">
        Hali to‘lov yo‘q. Ota-ona PRO sotib olganda shu yerda darhol paydo bo‘ladi.
      </p>
    )
  }
  return (
    <ul className="flex flex-col">
      {payments.map((payment) => (
        <li
          key={payment.id}
          className={clsx(
            'grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-b border-[var(--a-line)] py-3 last:border-0 sm:flex sm:flex-wrap',
            payment.id === highlight && 'rounded-lg bg-[var(--a-gold-soft)] px-3',
          )}
        >
          <span className="order-3 text-sm text-[var(--a-ink-faint)] sm:order-none sm:w-28">
            {dateTime(payment.at)}
          </span>
          <span className="min-w-0 truncate font-bold sm:flex-1">{payment.family || 'Oila'}</span>
          <span className="kd-num text-right font-bold text-[var(--a-gold)] sm:order-last sm:w-32">
            +{formatSom(payment.amount)} so‘m
          </span>
          <span className="order-4 flex items-center justify-end gap-2 sm:order-none sm:justify-start">
            <span className="rounded-full bg-[var(--a-raise)] px-2.5 py-1 text-xs font-bold">
              {PLAN_NAMES[payment.plan] ?? payment.plan}
            </span>
            <span className="text-sm text-[var(--a-ink-soft)] capitalize sm:w-20">
              {payment.provider}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}

export function PaymentsSection({ data }: { data: AdminData }) {
  const total = data.payments.reduce((sum, payment) => sum + payment.amount, 0)
  const exportCsv = () => {
    const rows = [
      ['Sana', 'Oila', 'Tarif', 'To‘lov tizimi', 'Summa'],
      ...data.payments.map((payment) => [
        payment.at,
        payment.family,
        PLAN_NAMES[payment.plan] ?? payment.plan,
        payment.provider,
        String(payment.amount),
      ]),
    ]
    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(','))
      .join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }))
    link.download = `kiddo-tolovlar-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }
  return (
    <Panel
      title={`To‘lovlar: ${data.payments.length} ta, jami ${formatSom(total)} so‘m`}
      action={
        <button
          type="button"
          onClick={exportCsv}
          disabled={data.payments.length === 0}
          className="rounded-full bg-[var(--a-accent)] px-4 py-2 text-sm font-bold text-[var(--a-accent-ink)] disabled:opacity-40"
        >
          Excel (CSV) yuklab olish
        </button>
      }
    >
      <PaymentList payments={data.payments} highlight={data.livePayment?.id} />
    </Panel>
  )
}

/* ---------------------------------------------------------------- promo codes */

const inputClass =
  'h-10 rounded-lg border border-[var(--a-line)] bg-[var(--a-raise)] px-3 font-bold text-[var(--a-ink)] outline-none focus:border-[var(--a-accent)]'

export function PromoSection({ promo }: { promo: AdminPromo }) {
  const [code, setCode] = useState('')
  const [days, setDays] = useState(7)
  const [problem, setProblem] = useState<string | null>(null)

  const add = async (event: FormEvent) => {
    event.preventDefault()
    const key = code.trim().toUpperCase()
    if (!CODE_PATTERN.test(key)) {
      setProblem('Kod 3–20 ta lotin harf yoki raqamdan iborat bo‘lsin.')
      return
    }
    setProblem(null)
    await promo
      .addCode(key, Math.min(365, Math.max(1, days)))
      .catch((reason: Error) => setProblem(reason.message))
    setCode('')
  }

  return (
    <Panel title="Promokodlar">
      <p className="text-sm text-[var(--a-ink-soft)]">
        Ota-onalar promokodni faqat reklamani oxirigacha ko‘rgandan keyin oladi – har bir oila 1
        marta. Kodlar saytda ochiq turmaydi: ular faqat shu yerda ko‘rinadi.
      </p>
      <form onSubmit={(event) => void add(event)} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-[var(--a-ink-soft)]">
          Kod (lotin harf va raqam)
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            maxLength={20}
            className={clsx(inputClass, 'uppercase')}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[var(--a-ink-soft)]">
          Necha kun PRO
          <input
            type="number"
            min={1}
            max={365}
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className={clsx(inputClass, 'w-28')}
          />
        </label>
        <button
          type="submit"
          className="h-10 rounded-full bg-[var(--a-accent)] px-5 text-sm font-bold text-[var(--a-accent-ink)]"
        >
          Kod qo‘shish
        </button>
      </form>
      {(problem ?? promo.error) && (
        <p role="alert" className="text-sm font-bold text-[var(--a-coral)]">
          {problem ?? promo.error}
        </p>
      )}
      <ul className="flex flex-col">
        {promo.codes.map((item) => (
          <li
            key={item.code}
            className="flex flex-wrap items-center gap-4 border-b border-[var(--a-line)] py-3 last:border-0"
          >
            <span
              className={clsx(
                'kd-num flex-1 text-base font-bold tracking-wide',
                !item.active && 'text-[var(--a-ink-soft)] line-through',
              )}
            >
              {item.code}
            </span>
            <span className="text-[var(--a-ink-soft)]">{item.days} kun PRO</span>
            <span className="text-[var(--a-ink-soft)]">{item.claims} ta oila oldi</span>
            <ActionButton onClick={() => void promo.setCodeActive(item.code, !item.active)}>
              {item.active ? 'To‘xtatish' : 'Yoqish'}
            </ActionButton>
            <ActionButton tone="danger" onClick={() => void promo.removeCode(item.code)}>
              O‘chirish
            </ActionButton>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

/* ---------------------------------------------------------------------- ads */

export function AdsSection({ promo }: { promo: AdminPromo }) {
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<'file' | 'url'>('file')
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ id: string; src: string } | null>(null)

  const add = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return setProblem('Reklama nomini yozing.')
    if (kind === 'file' && !file) return setProblem('Video faylni tanlang.')
    if (kind === 'url' && !/^https:\/\//.test(url.trim()))
      return setProblem('https:// bilan boshlanadigan havola kiriting.')
    setProblem(null)
    setBusy(true)
    try {
      await promo.addAd(kind === 'file' ? { title, file: file! } : { title, url: url.trim() })
      setTitle('')
      setFile(null)
      setUrl('')
    } catch (reason) {
      setProblem(
        (reason as Error).message === 'video' || (reason as Error).message === 'duration'
          ? 'Videoni o‘qib bo‘lmadi. MP4 yoki WebM fayl tanlang.'
          : (reason as Error).message,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel title="Reklamalar">
      <p className="text-sm text-[var(--a-ink-soft)]">
        Ota-ona «Promokodni olish» tugmasini bossa, shu yerdagi faol reklamalardan biri
        ko‘rsatiladi. Reklama oxirigacha ko‘rilgandan keyin promokod beriladi. Reklama bo‘lmasa,
        ota-onaga «Hozircha reklama yo‘q» deb yoziladi.
      </p>
      <form onSubmit={(event) => void add(event)} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-[var(--a-ink-soft)]">
            Reklama nomi
            <input
              value={title}
              maxLength={80}
              onChange={(event) => setTitle(event.target.value)}
              className={clsx(inputClass, 'w-64')}
            />
          </label>
          <Segmented
            options={[
              { value: 'file', label: 'Video fayl' },
              { value: 'url', label: 'Havola' },
            ]}
            value={kind}
            onChange={setKind}
            label="Video qayerdan"
          />
        </div>
        {kind === 'file' ? (
          <label className="flex flex-col gap-1 text-sm text-[var(--a-ink-soft)]">
            Video (MP4/WebM, 10 daqiqagacha)
            <input
              type="file"
              accept="video/mp4,video/webm,video/*"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="text-sm text-[var(--a-ink)]"
            />
          </label>
        ) : (
          <label className="flex flex-col gap-1 text-sm text-[var(--a-ink-soft)]">
            Video havolasi (to‘g‘ridan-to‘g‘ri .mp4)
            <input
              value={url}
              inputMode="url"
              placeholder="https://…/reklama.mp4"
              onChange={(event) => setUrl(event.target.value)}
              className={clsx(inputClass, 'w-full max-w-xl font-normal')}
            />
          </label>
        )}
        <button
          type="submit"
          disabled={busy}
          className="h-10 self-start rounded-full bg-[var(--a-accent)] px-5 text-sm font-bold text-[var(--a-accent-ink)] disabled:opacity-50"
        >
          {busy ? 'Yuklanmoqda…' : 'Reklama qo‘shish'}
        </button>
      </form>
      {(problem ?? promo.error) && (
        <p role="alert" className="text-sm font-bold text-[var(--a-coral)]">
          {problem ?? promo.error}
        </p>
      )}
      {promo.ads.length === 0 ? (
        <p className="rounded-xl bg-[var(--a-raise)] px-4 py-3 text-sm text-[var(--a-ink-soft)]">
          Hozircha reklama yo‘q – ota-onalar promokod ola olmaydi.
        </p>
      ) : (
        <ul className="flex flex-col">
          {promo.ads.map((ad) => (
            <li
              key={ad.id}
              className="flex flex-col gap-3 border-b border-[var(--a-line)] py-3 last:border-0"
            >
              <div className="flex flex-wrap items-center gap-4">
                <span
                  className={clsx(
                    'flex-1 font-bold',
                    !ad.active && 'text-[var(--a-ink-soft)] line-through',
                  )}
                >
                  {ad.title}
                </span>
                <span className="kd-num text-[var(--a-ink-soft)]">{Math.round(ad.duration)} s</span>
                <span className="text-[var(--a-ink-soft)]">
                  {ad.views} ko‘rish, {ad.completions} oxirigacha
                </span>
                <ActionButton
                  onClick={() =>
                    preview?.id === ad.id
                      ? setPreview(null)
                      : void promo
                          .previewSrc(ad)
                          .then((src) => src && setPreview({ id: ad.id, src }))
                  }
                >
                  {preview?.id === ad.id ? 'Yopish' : 'Ko‘rish'}
                </ActionButton>
                <ActionButton onClick={() => void promo.setAdActive(ad, !ad.active)}>
                  {ad.active ? 'To‘xtatish' : 'Yoqish'}
                </ActionButton>
                <ActionButton tone="danger" onClick={() => void promo.removeAd(ad)}>
                  O‘chirish
                </ActionButton>
              </div>
              {preview?.id === ad.id && (
                <video
                  src={preview.src}
                  controls
                  className="max-h-72 w-full max-w-xl rounded-xl bg-black"
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

/* ---------------------------------------------------------------- settings */

export function SettingsSection({ data }: { data: AdminData }) {
  const [monthly, setMonthly] = useState(data.settings.prices.monthly)
  const [gift, setGift] = useState(data.settings.proGiftCoins)
  const [saved, setSaved] = useState(false)
  const yearly = yearlyPrice(Math.max(0, monthly))
  const full = Math.max(0, monthly) * 12

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    await data.actions.saveSettings({
      ...data.settings,
      prices: { monthly: Math.max(0, monthly), yearly },
      proGiftCoins: clampGift(gift),
    })
    setSaved(true)
  }

  const field = (
    label: string,
    value: number,
    set: (value: number) => void,
    suffix: string,
    step = 1,
    max?: number,
  ) => (
    <label className="flex flex-col gap-1 text-sm text-[var(--a-ink-soft)]">
      {label}
      <span className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={max}
          step={step}
          value={value}
          onChange={(event) => {
            set(Number(event.target.value))
            setSaved(false)
          }}
          className="kd-num h-11 w-44 rounded-lg border border-[var(--a-line)] bg-[var(--a-raise)] px-3 text-base font-bold text-[var(--a-ink)] outline-none focus:border-[var(--a-accent)]"
        />
        <span>{suffix}</span>
      </span>
    </label>
  )

  return (
    <Panel title="Sozlamalar">
      <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end gap-6">
          {field('PRO – 1 oy narxi', monthly, setMonthly, 'so‘m', 100)}
          <div className="flex flex-col gap-1 text-sm text-[var(--a-ink-soft)]">
            PRO – 1 yil narxi (avtomatik, −{Math.round(YEARLY_DISCOUNT * 100)}%)
            <output
              data-testid="yearly-price"
              className="kd-num flex h-11 items-center rounded-lg border border-dashed border-[var(--a-line)] px-3 text-base font-bold text-[var(--a-ink)]"
            >
              {formatSom(yearly)} so‘m
            </output>
            <span className="kd-num text-xs">
              12 × {formatSom(Math.max(0, monthly))} = {formatSom(full)} −{' '}
              {Math.round(YEARLY_DISCOUNT * 100)}% = {formatSom(yearly)}
            </span>
          </div>
          {field(
            'PRO sotib olinganda har bir bolaga',
            gift,
            setGift,
            `coin sovg‘a (ko‘pi bilan ${MAX_PRO_GIFT_COINS})`,
            1,
            MAX_PRO_GIFT_COINS,
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="h-11 rounded-full bg-[var(--a-accent)] px-6 text-sm font-bold text-[var(--a-accent-ink)]"
          >
            Saqlash
          </button>
          {saved && (
            <span role="status" className="text-sm font-bold text-[var(--a-online)]">
              {DEMO.publicProUIEnabled
                ? 'Saqlandi. Ota-onalar endi shu narxlarni ko‘radi va to‘laydi.'
                : 'Saqlandi. Demoda narxlar ota-onalarga ko‘rsatilmaydi – keyingi versiya uchun saqlab qo‘yildi.'}
            </span>
          )}
        </div>
      </form>
    </Panel>
  )
}

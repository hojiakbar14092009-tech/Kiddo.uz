import type { Payment } from '@/store/paymentStore'

export interface RevenueTotals {
  today: { amount: number; count: number }
  week: { amount: number; count: number }
  month: { amount: number; count: number }
  year: { amount: number; count: number }
}

export interface RevenueBar {
  /** Start of the period (local time). */
  start: Date
  amount: number
  count: number
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Monday 00:00 of the week `date` is in. */
function startOfWeek(date: Date): Date {
  const day = startOfDay(date)
  const offset = (day.getDay() + 6) % 7
  day.setDate(day.getDate() - offset)
  return day
}

function sumSince(payments: readonly Payment[], since: Date, until: Date) {
  let amount = 0
  let count = 0
  for (const payment of payments) {
    const at = new Date(payment.at)
    if (at >= since && at <= until) {
      amount += payment.amount
      count += 1
    }
  }
  return { amount, count }
}

/** Income today, this week (from Monday), this month and this year – counted automatically. */
export function revenueTotals(payments: readonly Payment[], now: Date = new Date()): RevenueTotals {
  return {
    today: sumSince(payments, startOfDay(now), now),
    week: sumSince(payments, startOfWeek(now), now),
    month: sumSince(payments, new Date(now.getFullYear(), now.getMonth(), 1), now),
    year: sumSince(payments, new Date(now.getFullYear(), 0, 1), now),
  }
}

/** One bar per day for the last `days` days, oldest first. */
export function dailyBars(
  payments: readonly Payment[],
  days: number,
  now: Date = new Date(),
): RevenueBar[] {
  const today = startOfDay(now)
  const bars: RevenueBar[] = Array.from({ length: days }, (_, index) => {
    const start = new Date(today)
    start.setDate(today.getDate() - (days - 1 - index))
    return { start, amount: 0, count: 0 }
  })
  const first = bars[0]!.start
  for (const payment of payments) {
    const at = startOfDay(new Date(payment.at))
    if (at < first || at > today) continue
    const index = Math.round((at.getTime() - first.getTime()) / 86_400_000)
    const bar = bars[index]
    if (bar) {
      bar.amount += payment.amount
      bar.count += 1
    }
  }
  return bars
}

/** One bar per month for the last `months` months, oldest first. */
export function monthlyBars(
  payments: readonly Payment[],
  months: number,
  now: Date = new Date(),
): RevenueBar[] {
  const bars: RevenueBar[] = Array.from({ length: months }, (_, index) => ({
    start: new Date(now.getFullYear(), now.getMonth() - (months - 1 - index), 1),
    amount: 0,
    count: 0,
  }))
  for (const payment of payments) {
    const at = new Date(payment.at)
    const bar = bars.find(
      (item) =>
        item.start.getFullYear() === at.getFullYear() && item.start.getMonth() === at.getMonth(),
    )
    if (bar) {
      bar.amount += payment.amount
      bar.count += 1
    }
  }
  return bars
}

/** “1 250 000” – so‘m grouped by thousands. */
export function formatSom(amount: number): string {
  return String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/** Short axis label: 950, 12k, 1,3 mln. */
export function shortSom(amount: number): string {
  if (amount >= 1_000_000)
    return `${(amount / 1_000_000).toFixed(1).replace('.', ',').replace(',0', '')} mln`
  if (amount >= 1000) return `${Math.round(amount / 1000)}k`
  return String(amount)
}

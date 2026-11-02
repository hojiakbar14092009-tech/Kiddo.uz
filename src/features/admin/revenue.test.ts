import { describe, expect, it } from 'vitest'
import type { Payment } from '@/store/paymentStore'
import { fetchAllRows, MAX_ROWS, revenueOfDay } from './adminData'
import { dailyBars, formatSom, monthlyBars, revenueTotals, shortSom } from './revenue'

const NOW = new Date(2026, 9, 18, 20, 0) // Sunday 18 October 2026

function pay(at: Date, amount: number): Payment {
  return {
    id: at.toISOString(),
    plan: 'monthly',
    provider: 'click',
    amount,
    family: 'Ali',
    at: at.toISOString(),
  }
}

const PAYMENTS = [
  pay(new Date(2026, 9, 18, 9), 29_000), // today
  pay(new Date(2026, 9, 13, 12), 199_000), // Tuesday this week
  pay(new Date(2026, 9, 2, 12), 29_000), // this month
  pay(new Date(2026, 1, 2, 12), 199_000), // this year
  pay(new Date(2025, 11, 30, 12), 29_000), // last year
]

describe('revenue', () => {
  it('adds up today, this week, month and year', () => {
    expect(revenueTotals(PAYMENTS, NOW)).toEqual({
      today: { amount: 29_000, count: 1 },
      week: { amount: 228_000, count: 2 },
      month: { amount: 257_000, count: 3 },
      year: { amount: 456_000, count: 4 },
    })
  })

  it('makes one bar per day and per month', () => {
    const days = dailyBars(PAYMENTS, 7, NOW)
    expect(days).toHaveLength(7)
    expect(days.at(-1)).toMatchObject({ amount: 29_000, count: 1 })
    expect(days[1]).toMatchObject({ amount: 199_000 })
    const months = monthlyBars(PAYMENTS, 12, NOW)
    expect(months.at(-1)?.amount).toBe(257_000)
    expect(months[0]?.start.getMonth()).toBe(10)
    expect(months[1]?.amount).toBe(29_000)
  })

  it('formats so‘m', () => {
    expect(formatSom(1_250_000)).toBe('1 250 000')
    expect(shortSom(1_300_000)).toBe('1,3 mln')
    expect(shortSom(2_000_000)).toBe('2 mln')
    expect(shortSom(29_000)).toBe('29k')
  })
})

describe('revenue from per-day totals (Phase 53)', () => {
  it('a day total counts its payments, not one', () => {
    const days = [
      revenueOfDay({ day: '2026-11-02', payments: 3, amount: 87_000 }),
      revenueOfDay({ day: '2026-10-15', payments: 2, amount: 58_000 }),
    ]
    const now = new Date('2026-11-02T18:00:00+05:00')
    const totals = revenueTotals(days, now)
    expect(totals.today).toEqual({ amount: 87_000, count: 3 })
    expect(totals.year).toEqual({ amount: 145_000, count: 5 })
    const bars = dailyBars(days, 30, now)
    expect(bars.at(-1)).toMatchObject({ amount: 87_000, count: 3 })
    expect(monthlyBars(days, 12, now).at(-2)).toMatchObject({ amount: 58_000, count: 2 })
  })
})

describe('reading every row (Phase 53)', () => {
  it('pages by key until the server has no more, whatever its page size', async () => {
    const table = Array.from({ length: 2345 }, (_, i) => ({ id: `k${String(i).padStart(5, '0')}` }))
    const asked: (string | null)[] = []
    // a server that answers at most 1000 rows, like Supabase
    const rows = await fetchAllRows(
      (after) => {
        asked.push(after)
        const rest = after === null ? table : table.filter((row) => row.id > after)
        return Promise.resolve({ data: rest.slice(0, 1000), error: null })
      },
      (row) => row.id,
    )
    expect(rows.map((row) => row.id)).toEqual(table.map((row) => row.id))
    expect(asked).toEqual([null, 'k00999', 'k01999', 'k02344'])
  })

  it('an error on any page fails the read (never a silent half)', async () => {
    await expect(
      fetchAllRows(
        (after) =>
          Promise.resolve(
            after === null
              ? { data: [{ id: 'a' }], error: null }
              : { data: null, error: { message: 'timeout' } },
          ),
        (row) => row.id,
      ),
    ).rejects.toThrow('timeout')
  })

  it('a table past the safety limit is an error, not part of it shown as all', async () => {
    let n = 0
    await expect(
      fetchAllRows(
        () =>
          Promise.resolve({
            data: Array.from({ length: 1000 }, () => ({ id: `r${n++}` })),
            error: null,
          }),
        (row) => row.id,
      ),
    ).rejects.toThrow(String(MAX_ROWS))
  })

  it("this morning's sales count as today before noon", () => {
    const morning = Date.parse('2026-11-02T08:00:00+05:00')
    const item = revenueOfDay({ day: '2026-11-02', payments: 2, amount: 58_000 }, morning)
    expect(revenueTotals([item], new Date(morning)).today).toEqual({ amount: 58_000, count: 2 })
    expect(revenueOfDay({ day: '2026-11-01', payments: 1, amount: 1 }, morning).at).toBe(
      '2026-11-01T12:00:00+05:00',
    )
  })
})

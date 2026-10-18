import { describe, expect, it } from 'vitest'
import type { Payment } from '@/store/paymentStore'
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

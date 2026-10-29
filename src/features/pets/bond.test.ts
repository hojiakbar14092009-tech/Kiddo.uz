import { describe, expect, it } from 'vitest'
import { addBondDay, bondLevel, daysToNextHeart, MAX_BOND } from './bond'

describe('pet friendship', () => {
  it('fills five hearts on days 1, 3, 7, 14 and 30', () => {
    expect([0, 1, 2, 3, 6, 7, 13, 14, 29, 30, 400].map(bondLevel)).toEqual([
      0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5,
    ])
    expect(MAX_BOND).toBe(5)
  })

  it('says how many days are left for the next heart', () => {
    expect(daysToNextHeart(0)).toBe(1)
    expect(daysToNextHeart(4)).toBe(3)
    expect(daysToNextHeart(30)).toBeNull()
  })

  it('counts a day once, and never a past day again', () => {
    const first = addBondDay(undefined, '2026-10-01')
    expect(first).toEqual({ days: 1, last: '2026-10-01' })
    expect(addBondDay(first, '2026-10-01')).toBe(first)
    expect(addBondDay(first, '2026-09-30')).toBe(first)
    expect(addBondDay(first, '2026-10-05')).toEqual({ days: 2, last: '2026-10-05' })
  })

  it('a date far ahead (a wrong clock, since fixed) does not freeze the friendship', () => {
    const ahead = { days: 2, last: '2027-01-01' }
    expect(addBondDay(ahead, '2026-10-05')).toEqual({ days: 3, last: '2026-10-05' })
    // one day ahead (a time-zone edge) still counts as already played
    const tomorrow = { days: 2, last: '2026-10-06' }
    expect(addBondDay(tomorrow, '2026-10-05')).toBe(tomorrow)
  })
})

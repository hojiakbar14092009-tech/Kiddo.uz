import { describe, expect, it } from 'vitest'
import {
  ageOn,
  birthDateForAge,
  daysUntil,
  isAllowedBirthDate,
  isGameOpen,
  levelForAge,
  unlocksAt,
} from './ageLevel'

describe('age levels', () => {
  it('counts full years, turning older on the birthday itself', () => {
    expect(ageOn('2021-10-18', '2026-10-17')).toBe(4)
    expect(ageOn('2021-10-18', '2026-10-18')).toBe(5)
    expect(ageOn('2020-02-29', '2026-02-28')).toBe(5)
  })

  it('keeps every child between level 4 and 6', () => {
    expect(levelForAge(3)).toBe(4)
    expect(levelForAge(5)).toBe(5)
    expect(levelForAge(9)).toBe(6)
  })

  it('accepts real birthdays from age 4, with no learning ceiling (up to 18)', () => {
    const today = '2026-10-18'
    expect(isAllowedBirthDate(birthDateForAge(4, today), today)).toBe(true)
    expect(isAllowedBirthDate(birthDateForAge(6, today), today)).toBe(true)
    expect(isAllowedBirthDate(birthDateForAge(3, today), today)).toBe(false)
    expect(isAllowedBirthDate(birthDateForAge(7, today), today)).toBe(true)
    expect(isAllowedBirthDate(birthDateForAge(16, today), today)).toBe(true)
    expect(isAllowedBirthDate(birthDateForAge(19, today), today)).toBe(false)
    expect(isAllowedBirthDate('2021-02-30', today)).toBe(false)
  })

  it('opens games by age', () => {
    expect(isGameOpen('find-picture', 4)).toBe(true)
    expect(isGameOpen('find-letter', 4)).toBe(false)
    expect(isGameOpen('trace', 5)).toBe(false)
    expect(isGameOpen('trace', 6)).toBe(true)
    expect(unlocksAt(5)).toEqual(['find-letter', 'numbers'])
    expect(unlocksAt(6)).toEqual(['trace', 'exam'])
  })

  it('counts the days to a birthday', () => {
    expect(daysUntil('2026-10-20', '2026-10-18')).toBe(2)
    expect(daysUntil('2026-10-01', '2026-10-18')).toBe(0)
  })
})

import { describe, expect, it } from 'vitest'
import { dayPart, homeLine } from './life'

/* Phase 26: KidoBot's home line follows the child's day, deterministically. */

const base = { hour: 10, name: 'Aziza', birthday: false, homework: 0, planDone: false }

describe('the robot’s line on Home', () => {
  it('knows the time of day', () => {
    expect([4, 5, 11, 12, 17, 18, 21, 22, 0].map(dayPart)).toEqual([
      'night',
      'morning',
      'morning',
      'day',
      'day',
      'evening',
      'evening',
      'night',
      'night',
    ])
    expect(homeLine(base)).toEqual({ key: 'morningNamed', params: { name: 'Aziza' } })
    expect(homeLine({ ...base, hour: 23 }).key).toBe('nightNamed')
    expect(homeLine({ ...base, name: null, hour: 14 })).toEqual({
      key: 'day',
      params: {},
    })
  })

  it('puts a birthday first, then homework, then a finished plan', () => {
    const all = { ...base, birthday: true, homework: 2, planDone: true }
    expect(homeLine(all).key).toBe('birthdayNamed')
    expect(homeLine({ ...all, birthday: false })).toMatchObject({
      key: 'homeworkNamed',
      params: { name: 'Aziza', count: 2 },
    })
    expect(homeLine({ ...all, birthday: false, homework: 0 }).key).toBe('planDone')
  })

  it('only says goodnight at night, even with homework waiting', () => {
    const all = { ...base, birthday: true, homework: 2, planDone: true }
    expect(homeLine({ ...all, hour: 23 })).toEqual({ key: 'nightNamed', params: { name: 'Aziza' } })
  })
})

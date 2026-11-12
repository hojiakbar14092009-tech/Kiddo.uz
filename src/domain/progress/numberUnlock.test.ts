import { describe, expect, it } from 'vitest'
import { nextStreak, openCount } from './numberUnlock'

const keys = Array.from({ length: 11 }, (_, n) => `trace:${n}`) // 0–10, as on /trace/numbers
const twice = (from: number, to: number) =>
  Object.fromEntries(keys.slice(from, to).map((key) => [key, 2]))

describe('numbers open five at a time', () => {
  it('starts with the first five', () => {
    expect(openCount(keys, {})).toBe(5)
  })

  it('opens the next five only when every one of the five was right twice in a row', () => {
    expect(openCount(keys, { ...twice(0, 4), 'trace:4': 1 })).toBe(5)
    expect(openCount(keys, twice(0, 5))).toBe(10)
    // the last group can be shorter (0–10 is eleven numbers)
    expect(openCount(keys, twice(0, 10))).toBe(11)
  })

  it('a later group never opens past a group that is not done', () => {
    expect(openCount(keys, twice(5, 10))).toBe(5)
  })

  it('a wrong answer starts the streak again', () => {
    expect(nextStreak(undefined, true)).toBe(1)
    expect(nextStreak(1, true)).toBe(2)
    expect(nextStreak(1, false)).toBe(0)
  })

  it('a number done twice in a row stays done: a later slip never closes open numbers', () => {
    expect(nextStreak(2, false)).toBe(2)
    const streaks = Object.fromEntries(keys.slice(0, 5).map((key) => [key, 2]))
    streaks['trace:3'] = nextStreak(streaks['trace:3'], false)
    expect(openCount(keys, streaks)).toBe(10)
  })

  it('a short list is all open', () => {
    expect(openCount(['a', 'b'], {})).toBe(2)
  })
})

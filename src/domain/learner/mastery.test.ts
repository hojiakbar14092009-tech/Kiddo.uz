import { describe, expect, it } from 'vitest'
import {
  applyRun,
  masteryOf,
  MAX_MASTERY,
  startMastery,
  stateMastery,
  type StrandState,
} from './profile'

/*
 * Phase 22: infinite age, open-ended mastery. Level 5 is no longer the end:
 * two strong runs in a row there add a mastery step, with no ceiling; two weak
 * runs take a step back before the level itself moves. Pure and deterministic.
 */

const strong = { independent: 6, total: 6 }
const weak = { independent: 1, total: 6 }

function play(
  state: StrandState | undefined,
  runs: readonly { independent: number; total: number }[],
  age: number | null,
) {
  return runs.reduce<StrandState | undefined>((s, run) => applyRun(s, run, age), state)
}

describe('mastery above level 5', () => {
  it('grows with no ceiling: twenty mastered pairs of runs, twenty steps', () => {
    let state = play(undefined, [strong, strong], 10)
    expect(state?.level).toBe(5)
    expect(stateMastery(state, 10)).toBe(1)
    state = play(
      state,
      Array.from({ length: 40 }, () => strong),
      10,
    )
    expect(stateMastery(state, 10)).toBe(21)
    expect(state?.level).toBe(5)
  })

  it('a weak pair takes a mastery step back before the level moves', () => {
    let state = play(undefined, [strong, strong, strong, strong], 10)
    expect(stateMastery(state, 10)).toBe(2)
    state = play(state, [weak, weak], 10)
    expect(state?.level).toBe(5)
    expect(stateMastery(state, 10)).toBe(1)
    state = play(state, [weak, weak, weak, weak], 10)
    expect(stateMastery(state, 10)).toBe(0)
    expect(state?.level).toBe(4)
  })

  it('below level 5 there is no mastery, and an old save without it reads as 0', () => {
    const young = play(undefined, [strong, strong], 5)
    expect(young?.level).toBe(3)
    expect(stateMastery(young, 5)).toBe(0)
    const old = { level: 5, streak: 0, runs: 4, independent: 20, total: 24 } as StrandState
    expect(stateMastery(old, 8)).toBe(0)
    expect(masteryOf({ number: old }, 'number', 8)).toBe(0)
    // a stored value is never trusted raw
    expect(stateMastery({ ...old, mastery: -3 }, 8)).toBe(0)
    expect(stateMastery({ ...old, mastery: Number.NaN }, 8)).toBe(0)
    // an absurd save is held to a sane bound
    expect(stateMastery({ ...old, mastery: 1e300 }, 8)).toBe(MAX_MASTERY)
  })

  it('the birth date is the only age source, and any age has a place to start', () => {
    expect(startMastery(null)).toBe(0)
    expect(startMastery(6)).toBe(0)
    expect(startMastery(12)).toBe(1)
    expect(startMastery(15)).toBe(2)
    expect(startMastery(30)).toBe(3)
    expect(startMastery(80)).toBe(3)
    // a fresh strand of an adult starts above level 5 until their answers decide
    expect(masteryOf(undefined, 'number', 30)).toBe(3)
    const after = play(undefined, [weak, weak], 30)
    expect(stateMastery(after, 30)).toBe(2)
  })
})

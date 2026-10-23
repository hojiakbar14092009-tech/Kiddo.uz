import { beforeEach, describe, expect, it } from 'vitest'
import { emitActivity, clearUniverseChild, useUniverseStore } from '@/domain/universe/store'
import {
  applyRun,
  levelOf,
  runQuality,
  setAgeResolver,
  startLevel,
  type StrandState,
} from './profile'
import { getChallengeLevel } from './hooks'

const strong = { independent: 5, total: 5 }
const weak = { independent: 1, total: 5 }
const ok = { independent: 3, total: 5 }

function runs(age: number | null, list: { independent: number; total: number }[]) {
  let state: StrandState | undefined
  for (const run of list) state = applyRun(state, run, age)
  return state!
}

describe('learner profile', () => {
  it('starts from age but never locks: 4 → 1, 5 → 2, 6 → 3, guest → 2', () => {
    expect([startLevel(4), startLevel(5), startLevel(6), startLevel(null), startLevel(8)]).toEqual([
      1, 2, 3, 2, 4,
    ])
    expect(levelOf(undefined, 'number', 4)).toBe(1)
  })

  it('rates runs by independent answers', () => {
    expect(runQuality(strong)).toBe('strong')
    expect(runQuality(weak)).toBe('weak')
    expect(runQuality(ok)).toBe('ok')
    expect(runQuality({ independent: 0, total: 0 })).toBe('ok')
  })

  it('a high-performing four-year-old climbs to level 5', () => {
    expect(runs(4, Array(8).fill(strong)).level).toBe(5)
  })

  it('a struggling six-year-old drops gently to level 1 and no lower', () => {
    const state = runs(6, Array(10).fill(weak))
    expect(state.level).toBe(1)
    expect(state.runs).toBe(10)
  })

  it('needs two runs in a row: mixed results keep the level', () => {
    expect(runs(5, [strong, weak, strong, weak, ok, strong]).level).toBe(2)
  })

  it('clamps bad input', () => {
    const state = applyRun(undefined, { independent: 99, total: 3 }, 5)
    expect(state.independent).toBe(3)
    expect(applyRun(undefined, { independent: -4, total: -1 }, 5).total).toBe(0)
  })
})

describe('learner profile through emitActivity', () => {
  beforeEach(() => {
    clearUniverseChild('kid')
    setAgeResolver((key) => (key === 'kid' ? 4 : null))
  })

  it('updates the strand once per run id and uses the child age to start', () => {
    const base = {
      childKey: 'kid',
      activity: 'math:x',
      strand: 'number' as const,
      correct: 5,
      total: 5,
      independent: 5,
      level: 1,
    }
    emitActivity({ ...base, id: 'r1' })
    emitActivity({ ...base, id: 'r1' })
    expect(useUniverseStore.getState().byChild.kid?.strands?.number?.runs).toBe(1)
    expect(getChallengeLevel('kid', 'number', 4)).toBe(1)
    emitActivity({ ...base, id: 'r2' })
    expect(getChallengeLevel('kid', 'number', 4)).toBe(2)
    expect(getChallengeLevel('kid', 'social', 4)).toBe(1)
  })

  it('ignores runs without a level or at another level (tracing, other tabs)', () => {
    const base = {
      childKey: 'kid',
      activity: 'trace:1',
      strand: 'number' as const,
      correct: 5,
      total: 5,
      independent: 5,
    }
    emitActivity({ ...base, id: 't1' })
    emitActivity({ ...base, id: 't2' })
    emitActivity({ ...base, id: 't3', level: 3 })
    emitActivity({ ...base, id: 't4', level: 3 })
    expect(useUniverseStore.getState().byChild.kid?.strands?.number).toBeUndefined()
    expect(getChallengeLevel('kid', 'number', 4)).toBe(1)
  })

  it('never trusts a stored level outside 1–5', () => {
    useUniverseStore.setState((s) => ({
      byChild: {
        ...s.byChild,
        kid: {
          ...s.byChild.kid!,
          strands: { number: { level: 9 as 5, streak: 0, runs: 4, independent: 0, total: 0 } },
        },
      },
    }))
    expect(getChallengeLevel('kid', 'number', 4)).toBe(5)
  })
})

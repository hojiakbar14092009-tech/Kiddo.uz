import { beforeEach, describe, expect, it } from 'vitest'
import { GUEST_KEY } from '@/domain/childKey'
import { useFamilyStore } from '@/store/familyStore'
import {
  appendMistake,
  appendRecentRun,
  emitActivity,
  MAX_MISTAKES,
  MAX_RECENT_RUNS,
  recentMistakes,
  universeChild,
  useUniverseStore,
  type MistakeRecord,
  type RecentRun,
} from '.'
import { emitUniverse } from './store'

const run = (id: string): RecentRun => ({
  id,
  activity: 'math-lab:count:L1',
  strand: 'number',
  at: '2026-10-20T10:00:00.000Z',
  stars: 2,
  independent: 4,
  total: 5,
})

const mistake = (skill: string, activityId?: string): MistakeRecord => ({
  skill,
  strand: 'number',
  at: '2026-10-20T10:00:00.000Z',
  ...(activityId ? { activityId } : {}),
})

describe('recent runs log (pure)', () => {
  it('adds newest first, once per id', () => {
    let list = appendRecentRun(undefined, run('a'))
    list = appendRecentRun(list, run('b'))
    list = appendRecentRun(list, run('a'))
    expect(list.map((item) => item.id)).toEqual(['b', 'a'])
  })

  it('keeps at most the cap', () => {
    let list: RecentRun[] = []
    for (let n = 0; n < MAX_RECENT_RUNS + 25; n += 1) list = appendRecentRun(list, run(`r${n}`))
    expect(list).toHaveLength(MAX_RECENT_RUNS)
    expect(list[0]?.id).toBe(`r${MAX_RECENT_RUNS + 24}`)
  })
})

describe('mistakes log (pure)', () => {
  it('keeps one record per run and skill, refuses an empty skill', () => {
    let list = appendMistake(undefined, mistake('sub:within10', 'run1'))
    list = appendMistake(list, mistake('sub:within10', 'run1'))
    list = appendMistake(list, mistake('add:within5', 'run1'))
    list = appendMistake(list, mistake('sub:within10', 'run2'))
    list = appendMistake(list, mistake(''))
    expect(list.map((item) => `${item.activityId}|${item.skill}`)).toEqual([
      'run2|sub:within10',
      'run1|add:within5',
      'run1|sub:within10',
    ])
  })

  it('is capped at 200, oldest out first', () => {
    let list: MistakeRecord[] = []
    for (let n = 0; n < 230; n += 1) list = appendMistake(list, mistake('count:to5', `run${n}`))
    expect(MAX_MISTAKES).toBe(200)
    expect(list).toHaveLength(200)
    expect(list[0]?.activityId).toBe('run229')
    expect(list.at(-1)?.activityId).toBe('run30')
  })
})

describe('universe store logs', () => {
  beforeEach(() => {
    useUniverseStore.setState({ byChild: {} })
    useFamilyStore.setState({ children: [], activeChildId: null })
  })

  it('emitActivity records the run once', () => {
    const event = {
      id: 'run-1',
      childKey: 'kid',
      activity: 'feelings:faces:1',
      strand: 'social' as const,
      correct: 4,
      total: 4,
      independent: 3,
      at: '2026-10-21T09:30:00.000Z',
    }
    emitActivity(event)
    emitActivity(event)
    const recent = universeChild('kid').recent ?? []
    expect(recent).toHaveLength(1)
    expect(recent[0]).toMatchObject({
      id: 'run-1',
      activity: 'feelings:faces:1',
      strand: 'social',
      at: '2026-10-21T09:30:00.000Z',
      independent: 3,
      total: 4,
      stars: 2,
    })
  })

  it('stores mistake.made events (as Math Lab emits them), capped', () => {
    emitUniverse({
      type: 'mistake.made',
      childKey: 'kid',
      skill: 'sub:within10',
      strand: 'number',
      activityId: 'lab-1',
    })
    // a malformed event is ignored
    emitUniverse({ type: 'mistake.made', childKey: 'kid', skill: 5, strand: 'number' })
    emitUniverse({ type: 'mistake.made', childKey: 'kid', skill: 'x', strand: 'nope' })
    expect(recentMistakes('kid').map((item) => item.skill)).toEqual(['sub:within10'])

    for (let n = 0; n < 250; n += 1) {
      emitUniverse({
        type: 'mistake.made',
        childKey: 'kid',
        skill: 'add:within5',
        strand: 'number',
        activityId: `lab-${n + 2}`,
      })
    }
    expect(recentMistakes('kid')).toHaveLength(MAX_MISTAKES)
  })

  it('removing a child clears its mistakes and runs', () => {
    const child = useFamilyStore
      .getState()
      .addChild({ name: 'Ali', birthDate: '2021-01-01', gender: 'boy' })
    emitUniverse({
      type: 'mistake.made',
      childKey: child.id,
      skill: 'count:to5',
      strand: 'number',
      activityId: 'lab-x',
    })
    emitActivity({
      id: 'r',
      childKey: child.id,
      activity: 'studio:creation',
      strand: 'art',
      correct: 1,
      total: 1,
      independent: 1,
    })
    expect(recentMistakes(child.id)).toHaveLength(1)
    expect(universeChild(child.id).recent).toHaveLength(1)
    useFamilyStore.getState().removeChild(child.id)
    expect(recentMistakes(child.id)).toHaveLength(0)
    expect(universeChild(child.id).recent ?? []).toHaveLength(0)
  })

  it('a repeated run (same id, as after a double tap) never doubles its mistakes', () => {
    const event = {
      id: 'lab-dup',
      childKey: 'kid',
      activity: 'math-lab:within10:L3',
      strand: 'number' as const,
      correct: 5,
      total: 5,
      independent: 3,
      level: 3,
    }
    for (let n = 0; n < 2; n += 1) {
      emitActivity(event)
      for (const skill of ['sub:within10', 'missing:add']) {
        emitUniverse({
          type: 'mistake.made',
          childKey: 'kid',
          skill,
          strand: 'number',
          activityId: event.id,
        })
      }
    }
    expect(universeChild('kid').recent).toHaveLength(1)
    expect(recentMistakes('kid').map((item) => item.skill)).toEqual(['missing:add', 'sub:within10'])
  })

  it('never saves a guest’s runs or mistakes', () => {
    emitActivity({
      id: 'guest-run',
      childKey: GUEST_KEY,
      activity: 'studio:creation',
      strand: 'art',
      correct: 1,
      total: 1,
      independent: 1,
    })
    emitUniverse({
      type: 'mistake.made',
      childKey: GUEST_KEY,
      skill: 'count:to5',
      strand: 'number',
      activityId: 'guest-run',
    })
    emitActivity({
      id: 'kid-run',
      childKey: 'kid',
      activity: 'studio:creation',
      strand: 'art',
      correct: 1,
      total: 1,
      independent: 1,
    })
    // in memory for this session…
    expect(universeChild(GUEST_KEY).recent).toHaveLength(1)
    expect(recentMistakes(GUEST_KEY)).toHaveLength(1)
    // …but the saved state holds only real children
    const saved = JSON.parse(localStorage.getItem('kiddo.universe') ?? '{}') as {
      state: { byChild: Record<string, unknown> }
    }
    expect(Object.keys(saved.state.byChild)).toEqual(['kid'])
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import type { Evidence } from '@/domain/learningMemory/memory'
import { clearLearningMemory, recordEvidence } from '@/domain/learningMemory/store'
import {
  appendMistake,
  compactMistakes,
  MAX_MISTAKES,
  memorySkillOf,
  normalizeMistakes,
  type MistakeRecord,
} from './history'
import { STRANDS } from './types'
import { clearUniverseChild, emitUniverse, migrateUniverse, recentMistakes } from './store'

/*
 * Phase 16: the mistake journal (device only, ≤ 200, never a guest's). When
 * full, the oldest entries of skills the child already got past go first;
 * open learning needs stay. Old or damaged saved journals are made safe.
 */

const T0 = Date.parse('2026-10-01T00:00:00.000Z')
const minute = (i: number) => new Date(T0 + i * 60_000).toISOString()

/** `count` entries, newest first; even indexes are skill `open:x`, odd `done:x`. */
function journal(count: number): MistakeRecord[] {
  return Array.from({ length: count }, (_, i) => ({
    skill: i % 2 === 0 ? 'open:x' : 'done:x',
    strand: 'number' as const,
    at: minute(count - i),
    activityId: `run-${count - i}`,
  }))
}
const isOpen = (record: MistakeRecord) => record.skill.startsWith('open')

describe('journal limit (pure, deterministic)', () => {
  it.each([0, 1, 199, 200])('%i entries stay as they are', (count) => {
    const list = journal(count)
    expect(compactMistakes(list, MAX_MISTAKES, isOpen)).toEqual(list)
  })

  it('201: exactly one goes, the oldest entry of a skill already got past', () => {
    const list = journal(201)
    const out = compactMistakes(list, MAX_MISTAKES, isOpen)
    expect(out).toHaveLength(200)
    const gone = list.filter((item) => !out.includes(item))
    expect(gone).toHaveLength(1)
    expect(gone[0]!.skill).toBe('done:x')
    // the oldest of them (the last odd index)
    expect(gone[0]).toBe(list[199])
    // every open need is still there
    expect(out.filter(isOpen)).toHaveLength(list.filter(isOpen).length)
  })

  it('500: all low-value entries go before any open need, then the oldest open ones', () => {
    const list = journal(500)
    const out = compactMistakes(list, MAX_MISTAKES, isOpen)
    expect(out).toHaveLength(200)
    expect(out.every(isOpen)).toBe(true)
    // the 200 newest open needs, still newest first
    expect(out).toEqual(list.filter(isOpen).slice(0, 200))
    expect(compactMistakes(list, MAX_MISTAKES, isOpen)).toEqual(out)
  })

  it('without the memory (no predicate) the oldest go first', () => {
    const out = compactMistakes(journal(201))
    expect(out).toEqual(journal(201).slice(0, 200))
  })

  it('append keeps the cap and the rule', () => {
    let list: MistakeRecord[] = []
    for (let i = 0; i < 260; i += 1) {
      list = appendMistake(
        list,
        {
          skill: i < 30 ? 'open:x' : 'done:x',
          strand: 'number',
          at: minute(i),
          activityId: `r${i}`,
        },
        MAX_MISTAKES,
        isOpen,
      )
    }
    expect(list).toHaveLength(200)
    // the 30 early open needs survived 230 later low-value entries
    expect(list.filter(isOpen)).toHaveLength(30)
  })
})

describe('journal integrity', () => {
  it('normalizes malformed, duplicate, unsorted and oversized saved journals', () => {
    const raw = [
      null,
      'text',
      { skill: 'add:within10', strand: 'number', at: 'not a date' },
      { skill: 'Bad Skill!', strand: 'number', at: minute(1) },
      { skill: 'add:within10', strand: 'unknown', at: minute(1) },
      { skill: 'add:within10', strand: 'number', at: minute(1), activityId: 'r1', extra: 'x' },
      { skill: 'add:within10', strand: 'number', at: minute(1), activityId: 'r1' },
      { skill: 'sub:within10', strand: 'number', at: minute(5) },
      ...journal(300),
    ]
    const out = normalizeMistakes(raw, STRANDS)
    expect(out).toHaveLength(200)
    expect(out.some((item) => 'extra' in item)).toBe(false)
    const sorted = [...out].sort((a, b) => b.at.localeCompare(a.at))
    expect(out).toEqual(sorted)
    expect(normalizeMistakes('broken', STRANDS)).toEqual([])
    expect(normalizeMistakes(undefined, STRANDS)).toEqual([])
  })

  it('migration v1 → v2 cleans every child’s journal and keeps the rest', () => {
    const state = migrateUniverse(
      {
        byChild: {
          a: { balances: { crystal: 3 }, mistakes: [...journal(250), { skill: 1 }] },
          b: { balances: { crystal: 1 } },
          broken: null,
        },
      },
      1,
    )
    expect(state.byChild.a!.mistakes).toHaveLength(200)
    expect(state.byChild.a!.balances).toEqual({ crystal: 3 })
    expect(state.byChild.b!.mistakes).toBeUndefined()
    expect(state.byChild.broken).toBeUndefined()
    expect(() => migrateUniverse('garbage', 0)).not.toThrow()
  })

  it('maps Math Lab entries to their learning-memory skill', () => {
    expect(memorySkillOf({ skill: 'add:within10', strand: 'number' })).toBe('math:add:within10')
    expect(memorySkillOf({ skill: 'faces', strand: 'social' })).toBeNull()
  })
})

describe('journal in the store: open needs come from the learning memory', () => {
  const CHILD = 'journal-child'
  beforeEach(() => {
    clearUniverseChild(CHILD)
    clearLearningMemory(CHILD)
  })

  it('a full journal drops entries of a mastered skill before an active misconception', () => {
    // the learning memory: add:within10 is a confirmed difficulty
    const evidence = (id: string, item: string, at: string): Evidence => ({
      id,
      skill: 'math:add:within10',
      item,
      at,
      firstTry: false,
      helpedBefore: false,
      errors: ['off-by-one'],
      maxHint: 1,
      review: false,
      level: 2,
    })
    expect(recordEvidence(CHILD, evidence('a|1', 'add:3+4', minute(0)))).toBe(true)
    expect(recordEvidence(CHILD, evidence('b|1', 'add:2+5', minute(1)))).toBe(true)

    emitUniverse({
      type: 'mistake.made',
      childKey: CHILD,
      skill: 'add:within10',
      strand: 'number',
      activityId: 'first',
      at: minute(2),
    })
    for (let i = 0; i < MAX_MISTAKES + 20; i += 1) {
      emitUniverse({
        type: 'mistake.made',
        childKey: CHILD,
        skill: 'count:to5',
        strand: 'number',
        activityId: `later-${i}`,
        at: minute(10 + i),
      })
    }
    const list = recentMistakes(CHILD)
    expect(list).toHaveLength(MAX_MISTAKES)
    // the oldest entry, an open need, is still there
    expect(list.at(-1)).toMatchObject({ skill: 'add:within10', activityId: 'first' })
  })
})

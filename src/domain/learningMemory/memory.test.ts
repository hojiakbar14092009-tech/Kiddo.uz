import { beforeEach, describe, expect, it } from 'vitest'
import { GUEST_KEY } from '@/domain/childKey'
import {
  applyEvidence,
  dueReviews,
  evidenceScore,
  forgetStale,
  gardenStage,
  hintTrend,
  memorySummary,
  preferredHint,
  relevantMisconceptions,
  skillStatus,
  type Evidence,
  type SkillMemory,
} from './memory'
import {
  clearLearningMemory,
  getChildMemory,
  getSkillMemory,
  LEARNING_MEMORY_STORAGE_KEY,
  recordEvidence,
  subscribeEvidence,
  useLearningMemoryStore,
} from './store'

const SKILL = 'math:add:within20'
const T0 = '2026-10-01T09:00:00.000Z'

function at(hours: number): string {
  return new Date(new Date(T0).getTime() + hours * 3_600_000).toISOString()
}

let n = 0
function ev(partial: Partial<Evidence>): Evidence {
  n += 1
  return {
    id: `r${n}|q`,
    skill: SKILL,
    item: `add:8+${n % 9}`,
    at: T0,
    firstTry: true,
    helpedBefore: false,
    errors: [],
    maxHint: 0,
    review: false,
    level: 4,
    ...partial,
  }
}

const wrong = (item: string, hours: number, code = 'off-by-one', extra: Partial<Evidence> = {}) =>
  ev({ item, at: at(hours), firstTry: false, errors: [code], maxHint: 1, ...extra })
const right = (item: string, hours: number, extra: Partial<Evidence> = {}) =>
  ev({ item, at: at(hours), ...extra })

function run(list: Evidence[], start?: SkillMemory): SkillMemory {
  let memory = start
  for (const e of list) memory = applyEvidence(memory, e)
  return memory!
}

describe('learning memory: evidence threshold', () => {
  it('A: one accidental mistake stays a temporary observation', () => {
    const memory = run([wrong('add:8+7', 0)])
    expect(skillStatus(memory)).toBe('observed')
    expect(memory.misconceptions['off-by-one']?.status).toBe('observed')
    expect(memory.nextReviewAt).toBeNull()
    expect(gardenStage(memory)).toBe('none')
  })

  it('the same item wrong twice is still only an observation (a possible misconception)', () => {
    const memory = run([wrong('add:8+7', 0), wrong('add:8+7', 1)])
    expect(memory.misconceptions['off-by-one']).toMatchObject({ count: 2, status: 'observed' })
  })

  it('the same mistake on two items in ONE session stays an observation (hurried taps)', () => {
    const memory = run([
      wrong('add:8+7', 0, 'off-by-one', { id: 'same|1' }),
      wrong('add:9+6', 0.1, 'off-by-one', { id: 'same|2' }),
    ])
    expect(memory.misconceptions['off-by-one']).toMatchObject({ status: 'observed', count: 2 })
    expect(memory.nextReviewAt).toBeNull()
  })

  it('rounds the mastery half up, as SQL round(x, 3) does', () => {
    const start = run([wrong('add:1+1', 0, 'other', { maxHint: 3 })])
    // 0.25 → 0.25 + 0.3 × (0.5 − 0.25) = 0.325 exactly
    expect(run([wrong('add:1+2', 1, 'other', { maxHint: 2 })], start).mastery).toBe(0.325)
    expect(Math.round(0.1605 * 1000 + 1e-7) / 1000).toBe(0.161)
  })

  it('an observation that never repeats is forgotten after two weeks', () => {
    const memory = run([wrong('add:8+7', 0)])
    expect(forgetStale(memory, at(15 * 24)).misconceptions).toEqual({})
    expect(forgetStale(memory, at(13 * 24)).misconceptions['off-by-one']).toBeDefined()
  })

  it('B: the same mistake on different items becomes a confirmed memory with a review tomorrow', () => {
    const memory = run([wrong('add:8+7', 0), wrong('add:9+6', 0.5)])
    expect(skillStatus(memory)).toBe('confirmed')
    expect(memory.misconceptions['off-by-one']).toMatchObject({
      status: 'confirmed',
      count: 2,
      items: ['add:8+7', 'add:9+6'],
    })
    expect(memory.nextReviewAt).toBe(at(24.5))
    expect(gardenStage(memory)).toBe('seed')
  })

  it('"other" errors and malformed codes are not misconceptions', () => {
    const memory = run([
      wrong('add:8+7', 0, 'other'),
      wrong('add:9+6', 1, 'other'),
      wrong('add:5+6', 2, 'Bad Code!'),
    ])
    expect(memory.misconceptions).toEqual({})
    expect(memory.successStreak).toBe(0)
  })
})

describe('learning memory: mastery and recovery', () => {
  it('C: later independent practice raises mastery and turns the memory to improving', () => {
    const confirmed = run([wrong('add:8+7', 0), wrong('add:9+6', 0.5)])
    const after = run([right('add:7+6', 1)], confirmed)
    expect(after.mastery).toBeGreaterThan(confirmed.mastery)
    expect(skillStatus(after)).toBe('improving')
    expect(gardenStage(after)).toBe('sprout')
  })

  it('D: repeated independent success with a spaced retention check resolves it', () => {
    let memory = run([wrong('add:8+7', 0), wrong('add:9+6', 0.5)])
    memory = run([right('add:7+6', 1), right('add:8+5', 2)], memory)
    expect(gardenStage(memory)).toBe('plant')
    // a streak of three without a review a day later is not enough yet
    memory = run([right('add:6+7', 3)], memory)
    expect(skillStatus(memory)).toBe('improving')
    // the review the next day (a related item, answered alone): retention passes
    memory = run([right('add:9+4', 26, { review: true })], memory)
    expect(skillStatus(memory)).toBe('resolved')
    expect(memory.misconceptions['off-by-one']?.resolvedAt).toBe(at(26))
    expect(memory.nextReviewAt).toBeNull()
    expect(gardenStage(memory)).toBe('bloom')
    // parity with record_learning_evidence (supabase/tests/rls_test.sql, same scenario)
    expect(memory.mastery).toBe(0.88)
    expect(memory.reviewCount).toBe(1)
  })

  it('help before answering is not independent: it neither builds nor breaks the streak', () => {
    let memory = run([wrong('add:8+7', 0), wrong('add:9+6', 0.5), right('add:7+6', 1)])
    memory = run([right('add:8+5', 2, { helpedBefore: true, maxHint: 2 })], memory)
    expect(memory.successStreak).toBe(1)
    expect(evidenceScore({ firstTry: true, helpedBefore: true, maxHint: 2 })).toBe(0.6)
  })

  it('a relapse while improving goes back to confirmed and the review restarts', () => {
    let memory = run([
      wrong('add:8+7', 0),
      wrong('add:9+6', 0.5),
      right('add:7+6', 30, { review: true }),
    ])
    expect(memory.reviewStep).toBe(1)
    memory = run([wrong('add:6+8', 31, 'off-by-one', { review: true })], memory)
    expect(skillStatus(memory)).toBe('confirmed')
    expect(memory.reviewStep).toBe(0)
    expect(memory.nextReviewAt).toBe(at(31 + 24))
  })

  it('a slip after resolving starts again as one observation, not a confirmed label', () => {
    let memory = run([
      wrong('add:8+7', 0),
      wrong('add:9+6', 0.5),
      right('add:7+6', 1),
      right('add:8+5', 2),
      right('add:9+4', 26, { review: true }),
    ])
    expect(skillStatus(memory)).toBe('resolved')
    memory = run([wrong('add:6+9', 40)], memory)
    expect(memory.misconceptions['off-by-one']).toMatchObject({ status: 'observed', count: 1 })
  })

  it('reviews follow the 1 / 3 / 7 / 14 day steps after each success', () => {
    let memory = run([wrong('add:8+7', 0), wrong('add:9+6', 0)])
    memory = run([right('add:9+4', 24, { review: true })], memory)
    expect(memory.nextReviewAt).toBe(at(24 + 3 * 24))
    expect(memory.reviewCount).toBe(1)
  })

  it('positive memory: a mastered skill, corrections and fewer hints', () => {
    let memory = run(Array.from({ length: 5 }, (_, i) => right(`add:1+${i}`, i)))
    expect(memory.masteredAt).toBe(at(4))
    expect(memory.mastery).toBe(1)
    memory = run([wrong('add:9+9', 5, 'off-by-one', { maxHint: 2 })], memory)
    expect(memory.correctedAfterHint).toBe(1)
    const hints = run(
      [3, 3, 2, 3, 2, 1, 0, 0, 1, 0].map((h, i) =>
        h === 0
          ? right(`add:2+${i}`, i)
          : wrong(`add:2+${i}`, i, 'other', { maxHint: h as 1 | 2 | 3 }),
      ),
    )
    expect(hintTrend(hints)).toBe('less')
    expect(preferredHint(run([wrong('a:1+1', 0, 'other', { maxHint: 2 })]))).toBeNull()
  })
})

describe('learning memory: selectors', () => {
  it('due reviews: only active skills whose time has come, confirmed first', () => {
    const confirmed = run([wrong('add:8+7', 0), wrong('add:9+6', 0)])
    const observed = run([wrong('add:8+7', 0, 'off-by-one', { skill: 'math:sub:within10' })])
    const skills = { [SKILL]: confirmed, 'math:sub:within10': observed }
    expect(dueReviews(skills, at(12))).toEqual([])
    expect(dueReviews(skills, at(25)).map((s) => s.skill)).toEqual([SKILL])
  })

  it('relevant misconceptions: never more than three, active first, resolved left out', () => {
    let memory = run([
      wrong('add:1+1', 0, 'a1'),
      wrong('add:1+2', 0, 'a2'),
      wrong('add:1+2', 0, 'a3'),
      wrong('add:1+3', 0, 'a4'),
      wrong('add:1+4', 0, 'a4'),
    ])
    memory = { ...memory }
    const list = relevantMisconceptions(memory, 10)
    expect(list).toHaveLength(3)
    expect(list[0]?.code).toBe('a4')
  })

  it('parent summary: practice needed and improved, without the child being labelled', () => {
    const confirmed = run([wrong('add:8+7', 0), wrong('add:9+6', 0)])
    const resolved = run(
      [
        wrong('sub:9-3', 0, 'off-by-one', { skill: 'math:sub:within10' }),
        wrong('sub:8-3', 0, 'off-by-one', { skill: 'math:sub:within10' }),
        right('sub:7-3', 1, { skill: 'math:sub:within10' }),
        right('sub:6-3', 2, { skill: 'math:sub:within10' }),
        right('sub:5-3', 30, { skill: 'math:sub:within10', review: true }),
      ].map((e) => ({ ...e, skill: 'math:sub:within10' })),
    )
    const summary = memorySummary({ [SKILL]: confirmed, 'math:sub:within10': resolved }, at(40))
    expect(summary.needsPractice).toEqual([{ skill: SKILL, status: 'confirmed' }])
    expect(summary.improved).toEqual([{ skill: 'math:sub:within10', why: 'resolved' }])
    expect(JSON.stringify(summary)).not.toMatch(/weak|lazy|slow|bad/)
  })
})

describe('learning memory store', () => {
  beforeEach(() => {
    clearLearningMemory('kid')
    clearLearningMemory(GUEST_KEY)
  })

  it('counts each evidence once and refuses free text or bad shapes', () => {
    const e = wrong('add:8+7', 0)
    expect(recordEvidence('kid', e)).toBe(true)
    expect(recordEvidence('kid', e)).toBe(false)
    expect(recordEvidence('kid', { ...e, id: 'x1', item: 'My name is Ali' })).toBe(false)
    expect(recordEvidence('kid', { ...e, id: 'x2', skill: 'phone:+998901234567' })).toBe(false)
    expect(recordEvidence('kid', { ...e, id: 'x3', maxHint: 7 as 4 })).toBe(false)
    expect(getSkillMemory('kid', SKILL)?.evidence).toBe(1)
  })

  it('E: memory survives a new session (it is saved) but a guest is never saved', () => {
    recordEvidence('kid', wrong('add:8+7', 0))
    recordEvidence('kid', wrong('add:9+6', 1))
    recordEvidence(GUEST_KEY, wrong('add:8+7', 0))
    const raw = window.localStorage.getItem(LEARNING_MEMORY_STORAGE_KEY) ?? '{}'
    const saved = JSON.parse(raw) as { state: { byChild: Record<string, unknown> } }
    expect(Object.keys(saved.state.byChild)).toEqual(['kid'])
    // a new session: memory starts empty and is read again from storage
    useLearningMemoryStore.setState({ byChild: {} })
    window.localStorage.setItem(LEARNING_MEMORY_STORAGE_KEY, raw)
    void useLearningMemoryStore.persist.rehydrate()
    expect(skillStatus(getSkillMemory('kid', SKILL)!)).toBe('confirmed')
  })

  it('tells listeners about new evidence of a real child only', () => {
    const seen: string[] = []
    const stop = subscribeEvidence((childKey, e) => seen.push(`${childKey}:${e.id}`))
    const e = wrong('add:8+7', 0)
    recordEvidence('kid', e)
    recordEvidence('kid', e)
    recordEvidence(GUEST_KEY, wrong('add:9+6', 0))
    stop()
    expect(seen).toEqual([`kid:${e.id}`])
  })

  it('forgets a removed child', () => {
    recordEvidence('kid', wrong('add:8+7', 0))
    clearLearningMemory('kid')
    expect(getChildMemory('kid').skills).toEqual({})
  })
})

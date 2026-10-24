import { describe, expect, it } from 'vitest'
import {
  applyEvidence,
  gardenStage,
  type Evidence,
  type SkillMemory,
} from '@/domain/learningMemory/memory'
import {
  gardenPlants,
  gardenSummary,
  nextStep,
  PLANT_FAMILIES,
  plantLook,
  practiceRoute,
  stageRank,
} from './garden'

const T0 = '2026-10-01T09:00:00.000Z'
const at = (hours: number) => new Date(new Date(T0).getTime() + hours * 3_600_000).toISOString()

let n = 0
function ev(skill: string, partial: Partial<Evidence>): Evidence {
  n += 1
  return {
    id: `r${n}|q`,
    skill,
    item: `add:8+${n % 9}`,
    at: T0,
    firstTry: true,
    helpedBefore: false,
    errors: [],
    maxHint: 0,
    review: false,
    level: 2,
    ...partial,
  }
}
const wrong = (skill: string, item: string, hours: number) =>
  ev(skill, { item, at: at(hours), firstTry: false, errors: ['off-by-one'], maxHint: 1 })
const right = (skill: string, item: string, hours: number, extra: Partial<Evidence> = {}) =>
  ev(skill, { item, at: at(hours), ...extra })

function grow(list: Evidence[], start?: SkillMemory): SkillMemory {
  let memory = start
  for (const e of list) memory = applyEvidence(memory, e)
  return memory!
}

const ADD = 'math:add:within10'
const seed = () => grow([wrong(ADD, 'add:3+4', 0), wrong(ADD, 'add:2+5', 1)])

describe('gardenStage: the stage comes from evidence only', () => {
  it('no meaningful mistake: no plant (a single slip is only observed)', () => {
    expect(gardenStage(grow([right(ADD, 'add:1+1', 0)]))).toBe('none')
    expect(gardenStage(grow([wrong(ADD, 'add:3+4', 0)]))).toBe('none')
  })

  it('a repeated meaningful mistake (two items, two sessions): a seed', () => {
    expect(gardenStage(seed())).toBe('seed')
  })

  it('practice started (even with help opened first): a sprout', () => {
    const helped = grow([right(ADD, 'add:4+4', 2, { helpedBefore: true })], seed())
    expect(gardenStage(helped)).toBe('sprout')
    // a new mistake after that is a seed again (honest, never wilting)
    expect(gardenStage(grow([wrong(ADD, 'add:5+4', 3)], helped))).toBe('seed')
  })

  it('a single lucky success never jumps to bloom', () => {
    const once = grow([right(ADD, 'add:6+1', 2)], seed())
    expect(gardenStage(once)).toBe('sprout')
  })

  it('improving performance: growing; stable independent success with a retention check: bloom', () => {
    let memory = grow([right(ADD, 'add:6+1', 2), right(ADD, 'add:6+2', 3)], seed())
    expect(gardenStage(memory)).toBe('plant')
    // three in a row but no look a day later yet: still growing
    memory = grow([right(ADD, 'add:6+3', 4)], memory)
    expect(gardenStage(memory)).toBe('plant')
    expect(nextStep(memory, 'plant', at(5))).toEqual({ kind: 'check-later' })
    memory = grow([right(ADD, 'add:5+3', 30, { review: true })], memory)
    expect(gardenStage(memory)).toBe('bloom')
  })

  it('success after the full explanation (hint 4) is not independent', () => {
    const fullHint = grow(
      [ev(ADD, { item: 'add:5+5', at: at(2), firstTry: false, errors: [], maxHint: 4 })],
      seed(),
    )
    expect(gardenStage(fullHint)).not.toBe('plant')
    expect(fullHint.successStreak).toBe(0)
  })

  it('a bloom stays a bloom after a one-off slip (observed only)', () => {
    let memory = grow([right(ADD, 'a', 2), right(ADD, 'b', 3), right(ADD, 'c', 4)], seed())
    memory = grow([right(ADD, 'add:9+0', 30, { review: true })], memory)
    expect(gardenStage(memory)).toBe('bloom')
    const slip = grow(
      [ev(ADD, { item: 'add:1+8', at: at(40), firstTry: false, errors: ['too-many'] })],
      memory,
    )
    expect(gardenStage(slip)).toBe('bloom')
  })
})

describe('garden model', () => {
  it('one skill is one plant, many wrong items aggregate into it', () => {
    const memory = grow([
      wrong(ADD, 'add:8+7', 0),
      wrong(ADD, 'add:9+6', 1),
      wrong(ADD, 'add:7+5', 2),
    ])
    const plants = gardenPlants({ [ADD]: memory })
    expect(plants).toHaveLength(1)
    expect(plants[0]).toMatchObject({ skillKey: ADD, stage: 'seed', next: { kind: 'practise' } })
  })

  it('plant identity is stable per skill and varied across skills', () => {
    expect(plantLook(ADD)).toEqual(plantLook(ADD))
    const skills = [
      'math:add:within5',
      'math:add:within10',
      'math:add:within20',
      'math:sub:within5',
      'math:sub:within10',
      'math:sub:within20',
      'math:missing:add',
      'math:missing:sub',
      'math:compare:numbers',
      'math:neighbor:between',
      'math:count:to5',
      'math:word:add',
    ]
    const families = new Set(skills.map((skill) => plantLook(skill).family))
    expect(families.size).toBeGreaterThanOrEqual(4)
    for (const skill of skills) expect(PLANT_FAMILIES).toContain(plantLook(skill).family)
  })

  it('plants keep their order (first practised first) and never swap places', () => {
    const later = grow([
      wrong('math:sub:within10', 'sub:9-3', 10),
      wrong('math:sub:within10', 'sub:8-3', 11),
    ])
    const plants = gardenPlants({ 'math:sub:within10': later, [ADD]: seed() })
    expect(plants.map((plant) => plant.skillKey)).toEqual([ADD, 'math:sub:within10'])
  })

  it('practice goes to the existing activity; a bloom needs none; unknown skills have none', () => {
    expect(practiceRoute(ADD)).toBe('/math-lab?practice=add%3Awithin10')
    expect(practiceRoute('feelings:faces')).toBeNull()
    expect(practiceRoute('math:<script>')).toBeNull()
    let memory = grow([right(ADD, 'a', 2), right(ADD, 'b', 3), right(ADD, 'c', 4)], seed())
    memory = grow([right(ADD, 'add:9+0', 30, { review: true })], memory)
    expect(gardenPlants({ [ADD]: memory })[0]).toMatchObject({ stage: 'bloom', practice: null })
  })

  it('next steps follow the real rules: in a row, and the look a day later before a bloom', () => {
    const sprout = grow([right(ADD, 'add:6+1', 2)], seed())
    expect(nextStep(sprout, 'sprout', at(2))).toEqual({ kind: 'grow', count: 1 })
    const growing = grow([right(ADD, 'add:6+2', 3)], sprout)
    // the same day: two more alone cannot bloom yet (retention needs ≥ 20 h)
    expect(nextStep(growing, 'plant', at(3))).toEqual({ kind: 'bloom-later', count: 1 })
    // a day later a practice from the garden is the review that can make it bloom
    expect(nextStep(growing, 'plant', at(30))).toEqual({ kind: 'bloom', count: 1 })
    // the promise holds: one more alone, as a review a day later, is a bloom
    expect(gardenStage(grow([right(ADD, 'add:4+4', 30, { review: true })], growing))).toBe('bloom')
    // and the same-day third success is not
    expect(gardenStage(grow([right(ADD, 'add:4+4', 4)], growing))).toBe('plant')
  })

  it('a slip with the same error after a bloom keeps the flower; it stays learned when the slip goes stale', () => {
    let memory = grow([right(ADD, 'a', 2), right(ADD, 'b', 3), right(ADD, 'c', 4)], seed())
    memory = grow([right(ADD, 'add:9+0', 30, { review: true })], memory)
    const slip = grow([wrong(ADD, 'add:1+8', 40)], memory)
    expect(gardenStage(slip)).toBe('bloom')
    // two weeks on, the old slip is forgotten and the skill is resolved again
    const afterStale = grow([right(ADD, 'add:2+2', 40 + 15 * 24)], slip)
    expect(afterStale.misconceptions['off-by-one']?.status).toBe('resolved')
    expect(gardenStage(afterStale)).toBe('bloom')
  })

  it('a difficulty that really comes back after a bloom is relearned from a sprout, never a bare seed', () => {
    let memory = grow([right(ADD, 'a', 2), right(ADD, 'b', 3), right(ADD, 'c', 4)], seed())
    memory = grow([right(ADD, 'add:9+0', 30, { review: true })], memory)
    memory = grow([wrong(ADD, 'add:1+8', 40), wrong(ADD, 'add:2+7', 41)], memory)
    expect(memory.misconceptions['off-by-one']?.status).toBe('confirmed')
    expect(gardenStage(memory)).toBe('sprout')
  })

  it('damaged saved memory is skipped, never thrown on', () => {
    const broken = {
      a: null,
      b: { skill: 'math:x:y' },
      c: { ...seed(), misconceptions: { 'off-by-one': null } },
      [ADD]: seed(),
    } as unknown as Record<string, SkillMemory>
    expect(() => gardenPlants(broken)).not.toThrow()
    expect(gardenPlants(broken).map((plant) => plant.skillKey)).toEqual([ADD])
  })

  it('summary and stage ranks', () => {
    expect(gardenSummary(gardenPlants({ [ADD]: seed() }))).toEqual({
      total: 1,
      growing: 1,
      bloom: 0,
      seed: 1,
    })
    expect(['none', 'seed', 'sprout', 'plant', 'bloom'].map((s) => stageRank(s as never))).toEqual([
      0, 1, 2, 3, 4,
    ])
  })
})

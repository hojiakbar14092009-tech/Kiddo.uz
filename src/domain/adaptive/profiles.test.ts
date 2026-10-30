import { describe, expect, it } from 'vitest'
import { applyRun, levelOf, masteryOf, type StrandState } from '@/domain/learner/profile'
import {
  nextItem,
  placedState,
  placementOf,
  type PlacementAnswer,
} from '@/domain/learner/placement'
import { applyEvidence, type Evidence, type SkillMemory } from '@/domain/learningMemory/memory'
import { MEMORY_PAIRS, OPTION_COUNT, levelForAge } from '@/features/age/ageLevel'
import { adaptivePlan } from './adaptive'
import { ageProfile, contentTier, offersPlacement } from './ageProfile'

/*
 * Phase 22, representative learners. Each profile checks how the separate
 * inputs combine: chronological age → age profile and look; mastery, recent
 * success and hint use → difficulty; the start → the age prior or a placement.
 * Pure: no store, no clock but a fixed one.
 */

const NOW = '2026-10-30T09:00:00.000Z'
const strong = { independent: 10, total: 10 }
const weak = { independent: 2, total: 10 }
const ok = { independent: 6, total: 10 }

function runs(
  age: number,
  results: readonly { independent: number; total: number }[],
  from?: StrandState,
) {
  let state = from
  for (const run of results) state = applyRun(state, run, age)
  return state!
}

let n = 0
function hinted(count: number): Record<string, SkillMemory> {
  const skills: Record<string, SkillMemory> = {}
  for (let i = 0; i < count; i += 1) {
    n += 1
    const e: Evidence = {
      id: `run-${n}|q${n}`,
      skill: 'math:add:within10',
      item: `add:${i}+2`,
      at: '2026-10-29T09:00:00.000Z',
      firstTry: false,
      helpedBefore: false,
      review: false,
      errors: [],
      maxHint: 2,
      level: 1,
    }
    skills[e.skill] = applyEvidence(skills[e.skill], e)
  }
  return skills
}

const plan = (age: number, strand?: StrandState, skills: Record<string, SkillMemory> = {}) =>
  adaptivePlan({ age, strand, skills, now: NOW })

const answers = (...rungs: [PlacementAnswer['rung'], boolean][]): PlacementAnswer[] =>
  rungs.map(([rung, independent]) => ({ rung, independent }))

describe('representative learners (Phase 22)', () => {
  it('age 4: toy look, full picture help, the fewest answers, short games, gentle start', () => {
    const profile = ageProfile(4)
    expect(profile).toMatchObject({
      id: '3-4',
      visual: 'toy',
      defaultScaffolding: 'full',
      narration: 'full',
      interactionDensity: 'sparse',
      placement: false,
    })
    expect(levelForAge(4)).toBe(4) // the toy look (data-age 4: bigger type and buttons)
    const start = plan(4)
    expect(start).toMatchObject({
      band: '3-4',
      level: 1,
      aids: 'full',
      vocabulary: 'simple',
      options: 3,
    })
    const tier = contentTier(start.level)
    expect(tier).toBe(4)
    expect(OPTION_COUNT[tier]['find-picture']).toBe(2)
    expect(MEMORY_PAIRS[tier]).toBe(3)
    expect(offersPlacement(4)).toBe(false)
  })

  it('a strong 6-year-old climbs past the usual start with no age ceiling; the look stays six', () => {
    expect(plan(6).level).toBe(3)
    const state = runs(6, [strong, strong, strong, strong, strong, strong])
    expect(state.level).toBe(5)
    expect(state.mastery).toBe(1)
    const now = plan(6, state)
    expect(now).toMatchObject({ band: '5-6', level: 5, numberMax: 20 })
    expect(now.reasons).toContain('strong-runs')
    // difficulty moved; the presentation still follows the real age
    expect(ageProfile(6).visual).toBe('garden')
    expect(levelForAge(6)).toBe(6)
  })

  it('age 8: the workbook look and a middle start; one weak run does not drop the level', () => {
    expect(ageProfile(8)).toMatchObject({ id: '7-9', visual: 'workbook', narration: 'prompted' })
    const start = plan(8)
    expect(start).toMatchObject({ level: 4, aids: 'partial', vocabulary: 'standard' })
    const afterOneWeak = runs(8, [ok, ok, weak])
    expect(afterOneWeak.level).toBe(4)
    const afterTwoWeak = runs(8, [weak], afterOneWeak)
    expect(afterTwoWeak.level).toBe(3)
  })

  it('age 11: a calm look, minimal help, no mastery assumed from age, placement offered', () => {
    expect(ageProfile(11)).toMatchObject({ id: '10-12', visual: 'calm', narration: 'on-demand' })
    const start = plan(11)
    expect(start).toMatchObject({ band: '10-12', aids: 'minimal', level: 5 })
    expect(masteryOf(undefined, 'number', 11)).toBe(0)
    expect(offersPlacement(11)).toBe(true)
  })

  it('a new 14-year-old: foundational work from a placement, in a grown-up look, help when hints are relied on', () => {
    expect(ageProfile(14)).toMatchObject({ id: '13-15', visual: 'grown', vocabulary: 'rich' })
    expect(offersPlacement(14)).toBe(true)
    // not sure at the first, easy item: the foundations, not the age prior
    const placed = placedState(placementOf(answers(['easy', false], ['easy', false])))
    expect(levelOf({ number: placed }, 'number', 14)).toBe(1)
    expect(contentTier(levelOf({ number: placed }, 'number', 14))).toBe(4)
    // the look is still the grown-up one (visual maturity is not difficulty)
    expect(ageProfile(14).visual).toBe('grown')
    // relying on hints brings the pictures back and starts hints with a picture
    const helped = plan(14, placed, hinted(6))
    expect(helped.reasons).toContain('hint-reliant')
    expect(helped.hints).toBe('picture-first')
    expect(helped.aids).not.toBe('minimal')
    // the placed start is the learner's own from the first run: one weak run keeps it
    const middle = placedState(
      placementOf(answers(['easy', true], ['medium', false], ['medium', false])),
    )
    expect(middle.level).toBe(3)
    expect(levelOf({ number: applyRun(middle, weak, 14) }, 'number', 14)).toBe(3)
  })

  it('an experienced 17-year-old: 16+ look, and mastery keeps growing with no ceiling', () => {
    expect(ageProfile(17)).toMatchObject({ id: '16+', visual: 'grown', maxAge: null })
    expect(ageProfile(70).id).toBe('16+')
    const experienced: StrandState = {
      level: 5,
      mastery: 6,
      streak: 0,
      runs: 40,
      independent: 380,
      total: 400,
    }
    const after = runs(17, [strong, strong, strong, strong], experienced)
    expect(after).toMatchObject({ level: 5, mastery: 8 })
    expect(plan(17, after)).toMatchObject({ band: '16+', level: 5, aids: 'minimal' })
  })
})

describe('placement is deterministic and never above what was shown', () => {
  it('asks a second item after a miss, at most six items in all', () => {
    expect(nextItem(answers(['easy', false]))).toEqual({ rung: 'easy', attempt: 1 })
    expect(nextItem(answers(['easy', false], ['easy', false]))).toBeNull()
    const longest = answers(
      ['easy', false],
      ['easy', true],
      ['medium', false],
      ['medium', true],
      ['hard', true],
      ['stretch', true],
    )
    expect(nextItem(longest)).toBeNull()
    expect(placementOf(longest).asked).toBe(6)
  })

  it('the same answers always give the same start', () => {
    const cases: [PlacementAnswer[], number, number][] = [
      [answers(['easy', false], ['easy', false]), 1, 0],
      [answers(['easy', true], ['medium', false], ['medium', false]), 3, 0],
      [answers(['easy', true], ['medium', true], ['hard', false], ['hard', false]), 4, 0],
      [
        answers(
          ['easy', true],
          ['medium', true],
          ['hard', true],
          ['stretch', false],
          ['stretch', false],
        ),
        5,
        0,
      ],
      [answers(['easy', true], ['medium', true], ['hard', true], ['stretch', true]), 5, 2],
      // one slip never decides: a miss then a right answer climbs on
      [
        answers(
          ['easy', false],
          ['easy', true],
          ['medium', true],
          ['hard', true],
          ['stretch', true],
        ),
        5,
        2,
      ],
      // two second chances in the whole probe: the third miss ends it at once
      [
        answers(
          ['easy', false],
          ['easy', true],
          ['medium', false],
          ['medium', true],
          ['hard', false],
        ),
        4,
        0,
      ],
    ]
    for (const [given, level, mastery] of cases) {
      for (let i = 0; i < 3; i += 1) {
        expect(placementOf(given)).toMatchObject({ level, mastery })
      }
    }
  })
})

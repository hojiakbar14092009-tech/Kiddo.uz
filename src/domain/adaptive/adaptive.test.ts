import { describe, expect, it } from 'vitest'
import type { StrandState } from '@/domain/learner/profile'
import { applyEvidence, type Evidence, type SkillMemory } from '@/domain/learningMemory/memory'
import { adaptivePlan, ageBand, hintShare, skillsOf, type AdaptiveInput } from './adaptive'

const NOW = '2026-10-24T12:00:00.000Z'

function strand(over: Partial<StrandState>): StrandState {
  return { level: 2, streak: 0, runs: 0, independent: 0, total: 0, ...over }
}

let n = 0
function evidence(over: Partial<Evidence>): Evidence {
  n += 1
  return {
    id: `run-${n}|q${n}`,
    skill: 'math:add:within10',
    item: `add:${n}+1`,
    at: '2026-10-20T09:00:00.000Z',
    firstTry: true,
    helpedBefore: false,
    review: false,
    errors: [],
    maxHint: 0,
    level: 2,
    ...over,
  }
}

function memoryFrom(list: Evidence[]): Record<string, SkillMemory> {
  const skills: Record<string, SkillMemory> = {}
  for (const e of list) skills[e.skill] = applyEvidence(skills[e.skill], e)
  return skills
}

function plan(over: Partial<AdaptiveInput>) {
  return adaptivePlan({ age: 5, strand: undefined, skills: {}, now: NOW, ...over })
}

describe('AdaptiveLearningService', () => {
  it('age bands are guidance with no ceiling', () => {
    expect([4, 6, 7, 9, 10, 12, 13, 15, 16, 40].map(ageBand)).toEqual([
      '4-6',
      '4-6',
      '7-9',
      '7-9',
      '10-12',
      '10-12',
      '13-15',
      '13-15',
      '16+',
      '16+',
    ])
    expect(ageBand(null)).toBe('4-6')
  })

  it('A: a new child starts from the age band, with its presentation', () => {
    const young = plan({ age: 4 })
    expect(young).toMatchObject({
      level: 1,
      aids: 'full',
      vocabulary: 'simple',
      options: 3,
      weight: 0,
    })
    expect(young.reasons).toEqual(['age-start'])
    const teen = plan({ age: 14 })
    expect(teen).toMatchObject({ band: '13-15', aids: 'minimal', vocabulary: 'rich', options: 4 })
  })

  it("B: the learner level (moved by the child's runs) beats the age start; strong work needs fewer pictures", () => {
    const strong = plan({
      age: 4,
      strand: strand({ level: 4, runs: 6, independent: 28, total: 30 }),
    })
    expect(strong.level).toBe(4)
    expect(strong.numberMax).toBe(20)
    expect(strong.aids).toBe('partial')
    expect(strong.reasons).toContain('strong-runs')
  })

  it('C: a struggling older child gets support, never a lock or a label', () => {
    const p = plan({ age: 11, strand: strand({ level: 2, runs: 4, independent: 6, total: 20 }) })
    expect(p.level).toBe(2)
    expect(p.aids).toBe('partial')
    // fewer cards, never two (a blind guess would count as knowing)
    expect(p.options).toBe(3)
    expect(p.vocabulary).toBe('standard')
    expect(p.reasons).toContain('needs-support')
    // the plan names reasons and skills only
    expect(JSON.stringify(p)).not.toMatch(/slow|weak|bad|lazy/i)
  })

  it('D: little evidence moves nothing (gradual thresholds)', () => {
    const few = plan({ age: 11, strand: strand({ level: 4, runs: 2, independent: 0, total: 4 }) })
    expect(few.weight).toBeCloseTo(0.2)
    expect(few.aids).toBe('minimal')
    expect(few.reasons).not.toContain('needs-support')
  })

  it('E: answers that needed hints count as hint reliance, not as mastery', () => {
    const hinted = memoryFrom(
      Array.from({ length: 6 }, (_, i) =>
        evidence({ firstTry: false, maxHint: 2, errors: [], item: `add:${i}+2` }),
      ),
    )
    expect(hintShare(Object.values(hinted))).toBe(1)
    const p = plan({ age: 8, skills: hinted })
    expect(p.hints).toBe('picture-first')
    expect(p.reasons).toContain('hint-reliant')
    expect(p.mastered).toEqual([])
  })

  it('F: a confirmed misconception becomes the focus and is reviewed when due', () => {
    const skills = memoryFrom([
      evidence({ firstTry: false, errors: ['off-by-one'], item: 'add:3+4', id: 'a|1' }),
      evidence({ firstTry: false, errors: ['off-by-one'], item: 'add:2+5', id: 'b|2' }),
    ])
    const p = plan({
      age: 12,
      skills,
      strand: strand({ level: 3, runs: 3, independent: 17, total: 18 }),
    })
    expect(p.focus).toEqual(['math:add:within10'])
    expect(p.reasons).toContain('confirmed-mistake')
    // even a strong older child gets pictures back for a real misconception
    expect(p.aids).toBe('partial')
    // its review is due a day later: retrieval practice
    expect(p.reviews).toEqual(['math:add:within10'])
  })

  it('help follows the latest runs, not the whole history', () => {
    const history = strand({ level: 4, runs: 40, independent: 190, total: 200 })
    const now = plan({
      age: 8,
      strand: history,
      recent: [
        { independent: 1, total: 6 },
        { independent: 2, total: 6 },
      ],
    })
    expect(now.reasons).toContain('needs-support')
    const better = plan({
      age: 8,
      strand: strand({ level: 2, runs: 40, independent: 60, total: 200 }),
      recent: [
        { independent: 6, total: 6 },
        { independent: 5, total: 6 },
      ],
    })
    expect(better.reasons).toContain('strong-runs')
    expect(better.reasons).not.toContain('needs-support')
  })

  it("a due review above today's level never starves an eligible one", () => {
    const due = (skill: string, level: number, item: string) =>
      memoryFrom([
        evidence({
          skill,
          level,
          firstTry: false,
          errors: ['off-by-one'],
          item: `${item}1`,
          id: `${skill}-a|1`,
          at: '2026-10-01T09:00:00.000Z',
        }),
        evidence({
          skill,
          level,
          firstTry: false,
          errors: ['off-by-one'],
          item: `${item}2`,
          id: `${skill}-b|2`,
          at: '2026-10-01T09:05:00.000Z',
        }),
      ])
    const skills = { ...due('math:sub:within20', 4, 's'), ...due('math:add:within10', 2, 'a') }
    // the level-4 skill ranks first, but today's level is 2
    const p = plan({
      age: 5,
      skills,
      strand: strand({ level: 2, runs: 3, independent: 10, total: 15 }),
    })
    expect(p.reviews).toEqual(['math:add:within10'])
  })

  it('a confirmed difficulty not due yet still gets one similar exercise', () => {
    const skills = memoryFrom([
      evidence({ firstTry: false, errors: ['off-by-one'], item: 'add:3+4', id: 'x|1', at: NOW }),
      evidence({ firstTry: false, errors: ['off-by-one'], item: 'add:2+5', id: 'y|2', at: NOW }),
    ])
    const p = plan({
      age: 6,
      skills,
      strand: strand({ level: 3, runs: 3, independent: 15, total: 18 }),
    })
    expect(p.focus).toEqual(['math:add:within10'])
    expect(p.reviews).toEqual(['math:add:within10'])
  })

  it('G: deterministic, namespace-scoped, and never pays anything', () => {
    const skills = memoryFrom([evidence({}), evidence({ skill: 'feelings:faces', item: 'f:1' })])
    const input = {
      age: 6,
      strand: strand({ runs: 3, independent: 9, total: 10 }),
      skills: skillsOf(skills, 'math'),
      now: NOW,
    }
    expect(adaptivePlan(input)).toEqual(adaptivePlan(input))
    expect(Object.keys(input.skills)).toEqual(['math:add:within10'])
    const keys = Object.keys(adaptivePlan(input))
    expect(keys.some((key) => /coin|crystal|star|reward/i.test(key))).toBe(false)
  })
})

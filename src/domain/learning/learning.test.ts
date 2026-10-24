import { beforeEach, describe, expect, it } from 'vitest'
import { GUEST_KEY } from '@/domain/childKey'
import {
  clearLearningMemory,
  getChildMemory,
  getSkillMemory,
  isValidEvidence,
  skillStatus,
} from '@/domain/learningMemory'
import { gardenStage } from '@/domain/learningMemory/memory'
import {
  clearUniverseChild,
  emitUniverse,
  recentMistakes,
  universeChild,
} from '@/domain/universe/store'
import { compactMistakes, MAX_MISTAKES, memorySkillOf } from '@/domain/universe/history'
import routesSource from '@/app/routes.tsx?raw'
import {
  errorCode,
  HINT,
  itemId,
  LEARNING_DOMAINS,
  practiceRoute,
  recordLearning,
  skillDef,
  SKILLS,
  toEvidence,
  type LearningOutcome,
} from '.'

const T0 = Date.parse('2026-10-10T09:00:00.000Z')
const at = (hours: number) => new Date(T0 + hours * 3_600_000).toISOString()

let n = 0
function outcome(over: Partial<LearningOutcome>): LearningOutcome {
  n += 1
  return {
    skill: 'language:letter-recognition',
    sessionId: `s${n}`,
    questionId: `${n}`,
    item: `letter-${n}`,
    firstTry: true,
    helpedBefore: false,
    errors: [],
    hint: HINT.none,
    at: at(0),
    ...over,
  }
}
const wrong = (over: Partial<LearningOutcome>) =>
  outcome({ firstTry: false, errors: ['wrong-letter'], ...over })

describe('skill registry', () => {
  it('keys are stable memory keys with a known domain, unique, never translated', () => {
    const keys = SKILLS.map((skill) => skill.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const skill of SKILLS) {
      expect(skill.key).toMatch(/^[a-z][a-z0-9-]{0,15}:[a-z0-9-]{1,24}(:[a-z0-9-]{1,24})?$/)
      expect(LEARNING_DOMAINS).toContain(skill.domain)
      expect(skill.key.startsWith(`${skill.domain}:`)).toBe(true)
    }
  })

  it('every skill is practised in an activity that exists (no orphaned plant)', () => {
    // every quoted route path in the router (including the lists mapped to routes)
    const paths = [...routesSource.matchAll(/'(\/[a-z][^'\s]*)'/g)].map((m) => m[1]!)
    const matches = (route: string) =>
      paths.some((path) => {
        const pattern = new RegExp(
          `^${path.replace(/\/\*$/, '(/.*)?').replace(/:[a-zA-Z]+/g, '[^/]+')}$`,
        )
        return pattern.test(route)
      })
    for (const skill of SKILLS) {
      const route = practiceRoute(skill.key)!
      expect(route, skill.key).toContain('from=garden')
      expect(matches(route.split('?')[0]!), route).toBe(true)
    }
    expect(practiceRoute('language:unknown')).toBeNull()
    // maths goes to Math Lab with the skill, other areas to their own activity
    expect(practiceRoute('math:add:within10')).toBe('/math-lab?practice=add%3Awithin10&from=garden')
    expect(practiceRoute('language:reading-words')).toBe('/learn/words?from=garden')
    expect(practiceRoute('science:dino-diet')).toBe('/worlds/dino/quiz?from=garden')
  })
})

describe('evidence contract', () => {
  it('normalizes an outcome into valid, private memory evidence', () => {
    const evidence = toEvidence(
      outcome({ questionId: 'Qo‘y — so‘z?', item: 'qo‘y', sessionId: 'a b/c' }),
    )!
    expect(isValidEvidence(evidence)).toBe(true)
    expect(evidence.item).toMatch(/^q:[0-9a-z]+$/)
    expect(JSON.stringify(evidence)).not.toMatch(/qo‘y|so‘z/)
    expect(itemId('cat')).toBe(itemId('cat'))
    expect(itemId('cat')).not.toBe(itemId('dog'))
  })

  it('an item already got wrong never counts as the due review', () => {
    const memory = {
      nextReviewAt: at(0),
      misconceptions: { 'wrong-letter': { items: [itemId('b')] } },
    } as never
    expect(toEvidence(outcome({ item: 'b', at: at(1) }), memory)!.review).toBe(false)
    expect(toEvidence(outcome({ item: 'k', at: at(1) }), memory)!.review).toBe(true)
  })

  it('refuses unregistered skills and keeps errors only for a wrong first answer', () => {
    expect(toEvidence(outcome({ skill: 'language:made-up' }))).toBeNull()
    expect(toEvidence(outcome({ errors: ['wrong-letter'] }))!.errors).toEqual([])
    expect(errorCode('chose-fox', ['wrong-initial'], 'wrong-choice')).toBe('wrong-choice')
    expect(errorCode('wrong-initial', ['wrong-initial'], 'wrong-choice')).toBe('wrong-initial')
    expect(errorCode('Bad!', ['Bad!'], 'wrong-choice')).toBe('wrong-choice')
  })
})

describe('recording (one learning memory for every domain)', () => {
  const CHILD = 'learner-a'
  beforeEach(() => {
    for (const key of [CHILD, 'learner-b', GUEST_KEY]) {
      clearLearningMemory(key)
      clearUniverseChild(key)
    }
  })

  it('a duplicate (re-render, double tap, retry) is counted once', () => {
    const once = wrong({ sessionId: 'dup', questionId: '1' })
    expect(recordLearning(CHILD, once)).toBe(true)
    expect(recordLearning(CHILD, once)).toBe(false)
    expect(getSkillMemory(CHILD, once.skill)?.evidence).toBe(1)
    expect(recentMistakes(CHILD)).toHaveLength(1)
  })

  it('mistakes in one session stay an observation; two sessions confirm (Phase 10 rules)', () => {
    recordLearning(CHILD, wrong({ sessionId: 'one', questionId: '1', item: 'b', at: at(0) }))
    recordLearning(CHILD, wrong({ sessionId: 'one', questionId: '2', item: 'd', at: at(0.1) }))
    const skill = 'language:letter-recognition'
    expect(skillStatus(getSkillMemory(CHILD, skill)!)).toBe('observed')
    expect(gardenStage(getSkillMemory(CHILD, skill)!)).toBe('none')
    recordLearning(CHILD, wrong({ sessionId: 'two', questionId: '1', item: 'p', at: at(30) }))
    expect(gardenStage(getSkillMemory(CHILD, skill)!)).toBe('seed')
  })

  it('success with a strong scaffold is not independent; an independent one grows the plant', () => {
    const skill = 'science:dino-diet'
    recordLearning(CHILD, wrong({ skill, sessionId: 'x', item: 'trex', errors: ['diet-mixup'] }))
    recordLearning(
      CHILD,
      wrong({ skill, sessionId: 'y', item: 'stego', errors: ['diet-mixup'], at: at(2) }),
    )
    recordLearning(
      CHILD,
      wrong({
        skill,
        sessionId: 'z',
        item: 'tri',
        errors: ['diet-mixup'],
        hint: HINT.scaffold,
        at: at(3),
      }),
    )
    expect(getSkillMemory(CHILD, skill)!.successStreak).toBe(0)
    recordLearning(CHILD, outcome({ skill, sessionId: 'w', item: 'ankylo', at: at(4) }))
    expect(skillStatus(getSkillMemory(CHILD, skill)!)).toBe('improving')
  })

  it('without its own review schedule, a question of a skill whose review is due counts as the review', () => {
    const skill = 'language:reading-words'
    recordLearning(CHILD, wrong({ skill, sessionId: 'a', item: 'w1', at: at(0) }))
    recordLearning(CHILD, wrong({ skill, sessionId: 'b', item: 'w2', at: at(1) }))
    const due = getSkillMemory(CHILD, skill)!.nextReviewAt!
    expect(Date.parse(due)).toBeGreaterThan(T0)
    // a day later: independent answers, the first one is the due review (retention)
    for (const [i, hours] of [26, 27, 28].entries()) {
      recordLearning(
        CHILD,
        outcome({ skill, sessionId: `c${i}`, item: `w${i + 3}`, at: at(hours) }),
      )
    }
    expect(gardenStage(getSkillMemory(CHILD, skill)!)).toBe('bloom')
    // the same three on the same day as the errors would not bloom
    clearLearningMemory(CHILD)
    recordLearning(CHILD, wrong({ skill, sessionId: 'a', item: 'w1', at: at(0) }))
    recordLearning(CHILD, wrong({ skill, sessionId: 'b', item: 'w2', at: at(1) }))
    for (const i of [0, 1, 2]) {
      recordLearning(
        CHILD,
        outcome({ skill, sessionId: `d${i}`, item: `w${i + 3}`, at: at(2 + i) }),
      )
    }
    expect(gardenStage(getSkillMemory(CHILD, skill)!)).toBe('plant')
  })

  it('profiles are isolated; a guest is never saved; nothing is paid', () => {
    recordLearning(CHILD, wrong({}))
    expect(Object.keys(getChildMemory('learner-b').skills)).toEqual([])
    recordLearning(GUEST_KEY, wrong({}))
    const saved = JSON.parse(localStorage.getItem('kiddo.learning-memory') ?? '{}') as {
      state?: { byChild?: Record<string, unknown> }
    }
    expect(saved.state?.byChild?.[GUEST_KEY]).toBeUndefined()
    expect(saved.state?.byChild?.[CHILD]).toBeDefined()
    expect(universeChild(CHILD).ledger.entries).toEqual([])
  })

  it('the journal stays one bounded log for every domain, keeping open needs of each', () => {
    // an early maths and an early science difficulty, both still open needs
    for (const [skill, item] of [
      ['math:add:within10', 'a'],
      ['science:dino-diet', 'b'],
    ] as const) {
      recordLearning(
        CHILD,
        wrong({ skill, sessionId: `early-${item}-1`, item: `${item}1`, at: at(0) }),
      )
      recordLearning(
        CHILD,
        wrong({ skill, sessionId: `early-${item}-2`, item: `${item}2`, at: at(1) }),
      )
    }
    // then a flood of entries whose skills are no open need (one-off slips of other runs)
    for (let i = 0; i < MAX_MISTAKES + 50; i += 1) {
      emitUniverse({
        type: 'mistake.made',
        childKey: CHILD,
        skill: 'count:to5',
        strand: 'number',
        activityId: `flood-${i}`,
        at: at(2 + i),
      })
    }
    const journal = recentMistakes(CHILD)
    expect(journal).toHaveLength(MAX_MISTAKES)
    const skills = new Set(journal.map((record) => memorySkillOf(record)))
    expect(skills.has('math:add:within10')).toBe(true)
    expect(skills.has('science:dino-diet')).toBe(true)
    expect(skillDef('language:story-questions')?.strand).toBe('reading')
    // pure check with all four domains: deterministic
    expect(compactMistakes(journal, 100)).toEqual(compactMistakes(journal, 100))
  })
})

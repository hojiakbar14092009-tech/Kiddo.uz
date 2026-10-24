import { describe, expect, it } from 'vitest'
import { isRegisteredSkill, toEvidence } from '@/domain/learning'
import { isValidEvidence } from '@/domain/learningMemory'
import { learnOutcome, learnSkillKey } from './learnEvidence'
import type { AnswerRecord } from './session'

const record = (over: Partial<AnswerRecord>): AnswerRecord => ({
  questionId: 'q1',
  skill: 'initial:a',
  first: 'x',
  firstCorrect: true,
  helped: false,
  final: 'x',
  finalCorrect: true,
  errorType: null,
  ...over,
})

describe('learning sections → one evidence contract', () => {
  it('folds section skills into registered skills (one plant per skill, not per word)', () => {
    expect(learnSkillKey('words', 'initial:a')).toBe('language:first-sound')
    expect(learnSkillKey('words', 'initial:sh')).toBe('language:first-sound')
    expect(learnSkillKey('words', 'read:sentence')).toBe('language:reading-sentences')
    expect(learnSkillKey('space', 'identify:mars')).toBe('science:planet-names')
    expect(learnSkillKey('space', 'order:inner')).toBe('science:planet-order')
    expect(learnSkillKey('space', 'kind:star')).toBe('science:sky-objects')
    expect(learnSkillKey('tales', 'where')).toBe('language:story-questions')
    expect(learnSkillKey('math', 'add:sum5')).toBe('math:add:within5')
    for (const key of [
      learnSkillKey('words', 'build:cvc'),
      learnSkillKey('math', 'add:over10'),
      learnSkillKey('space', 'feature:saturn'),
    ]) {
      expect(isRegisteredSkill(key!)).toBe(true)
    }
  })

  it('gives no evidence where the section cannot show a difficulty', () => {
    expect(
      learnOutcome('garden', 's', record({ skill: 'find' }), '2026-10-10T09:00:00Z'),
    ).toBeNull()
    expect(
      learnOutcome('help', 's', record({ skill: 'fix:spelling' }), '2026-10-10T09:00:00Z'),
    ).toBeNull()
  })

  it('normalizes errors and help', () => {
    const at = '2026-10-10T09:00:00.000Z'
    const tale = learnOutcome(
      'tales',
      's1',
      record({ skill: 'who', firstCorrect: false, errorType: 'chose-fox' }),
      at,
    )!
    expect(tale.errors).toEqual(['wrong-choice'])
    const sum = learnOutcome(
      'math',
      's1',
      record({ skill: 'add:sum10', firstCorrect: false, errorType: 'subtracted' }),
      at,
    )!
    expect(sum.errors).toEqual(['wrong-operation'])
    const helped = learnOutcome('words', 's1', record({ helped: true }), at)!
    expect(helped).toMatchObject({ helpedBefore: true, hint: 2 })
    expect(isValidEvidence(toEvidence(helped)!)).toBe(true)
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyEvidence, type Evidence } from '@/domain/learningMemory'
import { LEVEL_PLAN, makeQuestion, type LabQuestion } from '@/features/mathLab/generators'
import { isSymbolic, tutorItem } from '@/features/mathLab/tutor'
import { useParentStore } from '@/store/parentStore'
import { parseTutorRequest } from '../../../supabase/functions/_shared/ai/request'
import { aiWorthAsking, bandForLevel, hintForMisses, nextHint } from './ladder'
import { buildTutorRequest, memorySlice } from './context'
import { readReply } from './aiClient'
import type { TutorRequest } from './types'

function seeded(seed: number) {
  let x = seed
  return () => {
    x = (x * 16807) % 2147483647
    return (x - 1) / 2147483646
  }
}

const memoryOf = (list: Partial<Evidence>[]) => {
  let m
  let i = 0
  for (const partial of list) {
    i += 1
    m = applyEvidence(m, {
      id: `e${i}`,
      skill: 'math:add:within20',
      item: `add:8+${i}`,
      at: new Date(Date.UTC(2026, 9, 1, i)).toISOString(),
      firstTry: false,
      helpedBefore: false,
      errors: ['off-by-one'],
      maxHint: 2,
      review: false,
      ...partial,
    })
  }
  return m
}

describe('hint ladder', () => {
  it('climbs one step per mistake, never past the full explanation', () => {
    expect([0, 1, 2, 3, 4, 9].map(hintForMisses)).toEqual([0, 1, 2, 3, 4, 4])
    expect([0, 1, 3, 4].map((h) => nextHint(h as 0 | 1 | 3 | 4))).toEqual([1, 2, 4, 4])
  })

  it('picks the explanation depth from the challenge level, not the age', () => {
    expect([1, 2, 3, 4, 5].map((l) => bandForLevel(l as 1))).toEqual([
      'early',
      'early',
      'intermediate',
      'intermediate',
      'advanced',
    ])
  })

  it('never asks an AI for a first tiny clue or for a picture task', () => {
    expect(aiWorthAsking(1, true)).toBe(false)
    expect(aiWorthAsking(2, true)).toBe(true)
    expect(aiWorthAsking(4, false)).toBe(false)
  })
})

describe('tutor context builder', () => {
  it('every Math Lab question becomes a request the server accepts (numbers and codes only)', () => {
    const rng = seeded(7)
    let symbolic = 0
    for (const level of [1, 2, 3, 4, 5] as const) {
      for (let round = 0; round < 12; round += 1) {
        for (let index = 0; index < LEVEL_PLAN[level].length; index += 1) {
          const q: LabQuestion = makeQuestion(level, index, rng)
          if (!isSymbolic(q)) continue
          symbolic += 1
          const wrong = q.options.find((o) => o.id !== q.answer)?.id
          const request = buildTutorRequest({
            childId: 'kid-1',
            language: 'uz',
            level,
            persona: 'kidobot',
            intent: 'hint',
            hintLevel: 2,
            item: tutorItem(q, wrong, wrong ? q.errors[wrong] : undefined),
            memory: memoryOf([{}, { item: 'add:9+6' }]),
          })
          expect(parseTutorRequest(request), q.id).toEqual(request)
        }
      }
    }
    expect(symbolic).toBeGreaterThan(100)
  })

  it('sends at most three relevant misconceptions of this skill and nothing about the child', () => {
    const memory = memoryOf([
      { errors: ['a1'] },
      { errors: ['a2'], item: 'add:1+1' },
      { errors: ['a3'], item: 'add:1+2' },
      { errors: ['a4'], item: 'add:1+3' },
      { errors: ['a4'], item: 'add:1+4' },
    ])
    const slice = memorySlice(memory)!
    expect(slice.misconceptions.length).toBeLessThanOrEqual(3)
    expect(slice.misconceptions[0]).toEqual({ code: 'a4', count: 2, status: 'confirmed' })
    expect(JSON.stringify(slice)).not.toMatch(/add:|kid|name|age/)
    expect(memorySlice(undefined)).toBeUndefined()
  })
})

describe('AI client', () => {
  const request: TutorRequest = {
    v: 1,
    childId: 'kid-1',
    language: 'uz',
    band: 'early',
    persona: 'kidobot',
    intent: 'hint',
    hintLevel: 2,
    item: { skill: 'add:within10', task: 'add', expression: '6 + 3 = ?', answer: '9' },
  }

  beforeEach(() => {
    useParentStore.setState({ session: null })
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('re-checks a reply: shape, length and no answer before the last step', () => {
    const ok = { reply: { message: 'Qani, 6 dan boshlab sanaymiz.', emotion: 'calm' } }
    expect(readReply(ok, request)).toEqual({
      message: 'Qani, 6 dan boshlab sanaymiz.',
      emotion: 'calm',
      hintLevel: 2,
      recommendedAction: 'retry',
    })
    expect(readReply({ reply: { message: 'Javob 9.' } }, request)).toBeNull()
    expect(
      readReply({ reply: { message: 'Javob 9.' } }, { ...request, hintLevel: 4 }),
    ).not.toBeNull()
    expect(readReply({ reply: { message: 'x'.repeat(300) } }, request)).toBeNull()
    expect(readReply({ nope: 1 }, request)).toBeNull()
  })

  it('this build has no Kiddo server: the AI is never called and nothing is faked', async () => {
    const { aiAvailability, askTutorAI } = await import('./aiClient')
    const call = vi.fn()
    expect(aiAvailability('kid-1')).toBe('no-server')
    expect(await askTutorAI(request, { call })).toBeNull()
    expect(call).not.toHaveBeenCalled()
  })
})

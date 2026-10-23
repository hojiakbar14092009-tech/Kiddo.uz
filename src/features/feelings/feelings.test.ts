import { describe, expect, it } from 'vitest'
import { LANGUAGES } from '@/content/languages'
import type { ChallengeLevel } from '@/domain/learner'
import { seededRandom } from '@/lib/random'
import {
  areClose,
  BASIC_FEELINGS,
  FEELING_TEXT,
  FEELINGS,
  SCENES,
  SITUATIONS,
  SUBTLE_FEELINGS,
  type Text,
} from './content'
import { CHOICE_ART } from './choiceArt'
import { FACE_ART } from './faceArt'
import {
  BREATHS,
  buildQuestions,
  contentTier,
  feelingsActivity,
  isFeelingsKind,
  levelPlan,
  nextPosition,
  runResult,
  SCORED_KINDS,
  type BreathPosition,
} from './session'

const LEVELS: ChallengeLevel[] = [1, 2, 3, 4, 5]
const PICTURES = Object.keys(import.meta.glob('/public/3d/*.webp'))

function expectText(text: Text, where: string) {
  for (const language of LANGUAGES) {
    expect(text[language]?.trim(), `${where} (${language})`).toBeTruthy()
  }
  // Uzbek Latin only: no Cyrillic letters, and o‘ / g‘ with the proper sign
  expect(text.uz, where).not.toMatch(/[Ѐ-ӿ]/)
  expect(text.uz, where).not.toMatch(/[oOgG]['`ʻ’]/)
  expect(text.ru, where).toMatch(/[Ѐ-ӿ]/)
}

describe('feelings content', () => {
  it('has every text of every feeling in all three languages, and a face for each', () => {
    for (const feeling of FEELINGS) {
      const text = FEELING_TEXT[feeling]
      for (const field of ['label', 'find', 'looks', 'clue'] as const) {
        expectText(text[field], `${feeling}.${field}`)
      }
      expect(FACE_ART[feeling], feeling).toBeDefined()
    }
  })

  it('draws faces that differ beyond colour', () => {
    const fills = FEELINGS.map((feeling) => FACE_ART[feeling].fill)
    expect(new Set(fills).size).toBe(FEELINGS.length)
    const labels = FEELINGS.map((feeling) => FEELING_TEXT[feeling].label.en)
    expect(new Set(labels).size).toBe(FEELINGS.length)
  })

  it('has at least two stories for every feeling, all with texts and pictures', () => {
    for (const feeling of FEELINGS) {
      expect(
        SCENES.filter((scene) => scene.feeling === feeling).length,
        feeling,
      ).toBeGreaterThanOrEqual(2)
    }
    expect(new Set(SCENES.map((scene) => scene.id)).size).toBe(SCENES.length)
    for (const scene of SCENES) {
      expectText(scene.text, `${scene.id}.text`)
      expectText(scene.why, `${scene.id}.why`)
      for (const language of LANGUAGES) expect(scene.name[language]).toBeTruthy()
      expect(PICTURES).toContain(`/public/3d/${scene.picture}.webp`)
    }
  })

  it('gives every situation exactly one best answer, one kind idea and one to talk about', () => {
    expect(new Set(SITUATIONS.map((item) => item.id)).size).toBe(SITUATIONS.length)
    for (const situation of SITUATIONS) {
      expectText(situation.text, situation.id)
      expect(PICTURES).toContain(`/public/3d/${situation.picture}.webp`)
      const kinds = situation.choices.map((choice) => choice.kind).sort()
      expect(kinds, situation.id).toEqual(['best', 'good', 'other'])
      expect(new Set(situation.choices.map((choice) => choice.id)).size).toBe(3)
      for (const choice of situation.choices) {
        expectText(choice.text, `${situation.id}.${choice.id}.text`)
        expectText(choice.explain, `${situation.id}.${choice.id}.explain`)
        // a child who cannot read yet chooses by the picture
        expect(CHOICE_ART[choice.id], `${situation.id}.${choice.id} picture`).toBeDefined()
      }
    }
  })

  it('never calls a choice wrong or bad', () => {
    const texts = SITUATIONS.flatMap((situation) =>
      situation.choices.flatMap((choice) => [choice.explain.en, choice.text.en]),
    )
    for (const text of texts) expect(text).not.toMatch(/\b(wrong|bad|naughty)\b/i)
  })
})

describe('feelings levels', () => {
  it('starts with four basic feelings and two answers, adds more with the level', () => {
    expect(levelPlan(1)).toMatchObject({
      feelings: BASIC_FEELINGS,
      faceChoices: 3,
      feelingChoices: 2,
      kindnessChoices: 2,
      why: false,
      goodIsSuccess: false,
      neutralFaces: false,
    })
    expect(levelPlan(2)).toEqual({ ...levelPlan(1), level: 2 })
    expect(levelPlan(3)).toMatchObject({
      feelingChoices: 3,
      kindnessChoices: 3,
      why: false,
      goodIsSuccess: true,
      neutralFaces: true,
    })
    expect(levelPlan(3).feelings).toHaveLength(6)
    expect(levelPlan(4)).toMatchObject({ feelingChoices: 3, kindnessChoices: 3, why: true })
    expect(levelPlan(4).feelings).toHaveLength(10)
    expect(levelPlan(5).preferSubtle).toBe(true)
  })

  it('builds questions with exactly one best answer at every level', () => {
    for (const level of LEVELS) {
      const plan = levelPlan(level)
      for (const kind of SCORED_KINDS) {
        for (let seed = 1; seed <= 40; seed += 1) {
          const questions = buildQuestions(kind, level, seededRandom(seed))
          expect(questions, `${kind} L${level}`).toHaveLength(
            kind === 'faces' ? plan.faceQuestions : plan.questions,
          )
          // no story, face or situation twice in one run
          const targets = questions.map((q) => q.id.split('-').slice(2).join('-'))
          expect(new Set(targets).size).toBe(questions.length)
          for (const question of questions) {
            expect(question.options.filter((option) => option.best)).toHaveLength(1)
            expect(new Set(question.options.map((option) => option.id)).size).toBe(
              question.options.length,
            )
            const count =
              kind === 'kindness'
                ? plan.kindnessChoices
                : kind === 'faces'
                  ? plan.faceChoices
                  : plan.feelingChoices
            expect(question.options).toHaveLength(count)
            if (kind === 'kindness') {
              for (const option of question.options) {
                expect(option.explain).toBeDefined()
                expect(CHOICE_ART[option.picture!]).toBeDefined()
              }
              // from L3 a kind idea is accepted too; only the "other" one is not
              const accepted = question.options.filter((option) => option.accepted)
              expect(accepted).toHaveLength(plan.goodIsSuccess ? 2 : 1)
            } else {
              for (const option of question.options) expect(option.accepted).toBe(option.best)
              for (const option of question.options) expect(plan.feelings).toContain(option.feeling)
              expect(Boolean(question.why)).toBe(plan.why)
            }
            if (kind === 'scenes') {
              const answer = question.options.find((option) => option.best)!.feeling!
              for (const option of question.options) {
                if (!option.best) expect(areClose(answer, option.feeling!)).toBe(false)
              }
            }
          }
        }
      }
    }
  })

  it('asks mostly about the subtler feelings at level 5', () => {
    const subtle = SUBTLE_FEELINGS as readonly string[]
    for (let seed = 1; seed <= 20; seed += 1) {
      const asked = buildQuestions('faces', 5, seededRandom(seed)).map(
        (question) => question.options.find((option) => option.best)!.feeling!,
      )
      expect(asked.filter((feeling) => subtle.includes(feeling)).length).toBeGreaterThanOrEqual(3)
    }
  })

  it('makes three stars hard to get by tapping at random at levels 1–2', () => {
    for (const kind of SCORED_KINDS) {
      const plan = levelPlan(1)
      const questions = buildQuestions(kind, 1, seededRandom(7))
      // chance that every first tap is accepted (three stars need ≥ 90 %)
      const luck = questions.reduce(
        (chance, q) => chance * (q.options.filter((o) => o.accepted).length / q.options.length),
        1,
      )
      expect(luck, kind).toBeLessThanOrEqual(1 / 32)
      expect(questions.length, kind).toBeLessThanOrEqual(5)
      expect(plan.questions).toBe(5)
    }
  })

  it('reports a run: every question answered, first tries independent', () => {
    expect(runResult([true, false, true, true])).toEqual({ correct: 4, total: 4, independent: 3 })
  })

  it('names an activity by its content, so levels playing the same game share one record', () => {
    expect(feelingsActivity('faces', 1)).toBe('feelings:faces:basic')
    expect(feelingsActivity('faces', 2)).toBe('feelings:faces:basic')
    expect(feelingsActivity('faces', 3)).toBe('feelings:faces:mid')
    expect(feelingsActivity('scenes', 4)).toBe('feelings:scenes:full')
    expect(feelingsActivity('scenes', 5)).toBe('feelings:scenes:full')
    expect(feelingsActivity('kindness', 2)).toBe('feelings:kindness:basic')
    expect(feelingsActivity('kindness', 3)).toBe('feelings:kindness:full')
    // the same tier means the same plan for that kind of game
    for (const kind of SCORED_KINDS) {
      for (const a of LEVELS) {
        for (const b of LEVELS) {
          if (contentTier(kind, a) !== contentTier(kind, b)) continue
          const pa = levelPlan(a)
          const pb = levelPlan(b)
          if (kind === 'kindness') {
            expect([pa.kindnessChoices, pa.goodIsSuccess, pa.questions]).toEqual([
              pb.kindnessChoices,
              pb.goodIsSuccess,
              pb.questions,
            ])
          } else {
            expect(pa.feelings).toEqual(pb.feelings)
            expect(pa.why).toBe(pb.why)
          }
        }
      }
    }
  })

  it('knows its routes', () => {
    expect(isFeelingsKind('faces')).toBe(true)
    expect(isFeelingsKind('calm')).toBe(true)
    expect(isFeelingsKind('nope')).toBe(false)
    expect(isFeelingsKind(undefined)).toBe(false)
  })

  it('breathes in and out four times', () => {
    let position: BreathPosition | null = { breath: 0, half: 'in' }
    let halves = 0
    while (position) {
      halves += 1
      position = nextPosition(position)
    }
    expect(halves).toBe(BREATHS * 2)
  })
})

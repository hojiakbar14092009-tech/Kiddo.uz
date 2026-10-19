import { describe, expect, it } from 'vitest'
import { LANGUAGES } from '@/content/languages'
import type { LearnChild } from '@/features/learn/learnStore'
import { seeded } from '@/features/learn/random'
import { orderOf } from '@/features/learn/review'
import { KIND, LESSONS, PLANETS, TEXT, isPlanet, lessonsFor, type AgeLevel } from './content'
import {
  OPTION_COUNT,
  buildQuestion,
  knownObjects,
  lessonQuestions,
  orderSequence,
  testCount,
  testPool,
  testQuestions,
  type SpaceQuestion,
} from './questions'
import { SPOKEN } from './spoken'

const EMPTY: LearnChild = {
  skills: {},
  attempts: [],
  sessions: [],
  rewarded: [],
  stages: {},
  lastOrder: {},
}

const LEVELS: AgeLevel[] = [4, 5, 6]
const allStages = (level: AgeLevel) => lessonsFor(level).map((lesson) => lesson.stage)

function checkQuestion(question: SpaceQuestion, level: AgeLevel) {
  expect(question.options).toHaveLength(OPTION_COUNT[level])
  expect(new Set(question.options).size).toBe(question.options.length)
  expect(question.options.filter((id) => id === question.correct)).toHaveLength(1)
}

describe('Koinot facts', () => {
  it('the Sun is a star, never a planet; the Moon is a satellite', () => {
    expect(KIND.sun).toBe('star')
    expect(KIND.moon).toBe('moon')
    expect(PLANETS).toEqual([
      'mercury',
      'venus',
      'earth',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
    ])
    expect(TEXT.uz.objects.sun.facts[0]).toContain('yulduz')
    expect(TEXT.ru.objects.sun.facts[0]).toContain('звезда')
    expect(TEXT.en.objects.sun.facts[0]).toContain('star')
    expect(TEXT.uz.objects.moon.facts[0]).toContain('tabiiy yo‘ldoshi')
    expect(TEXT.en.objects.earth.facts[0]).toContain('planet we live on')
    expect(TEXT.uz.ui.exhibitNote).toBe('O‘lcham va masofalar shartli')
  })
})

describe('Koinot questions', () => {
  it('uses 2, 3 and 4 answer cards and 3, 4 and 5 test questions for ages 4, 5 and 6', () => {
    expect(OPTION_COUNT).toEqual({ 4: 2, 5: 3, 6: 4 })
    expect(LEVELS.map((level) => testCount(level, allStages(level)))).toEqual([3, 4, 5])
  })

  it('always has one right answer, different options, and the right one moves around', () => {
    for (const level of LEVELS) {
      for (const language of LANGUAGES) {
        const places = new Set<number>()
        for (let seed = 1; seed < 60; seed += 1) {
          const questions = testQuestions(
            level,
            language,
            allStages(level),
            EMPTY,
            undefined,
            seeded(seed),
          )
          expect(questions).toHaveLength(testCount(level, allStages(level)))
          expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length)
          for (const question of questions) {
            checkQuestion(question, level)
            places.add(question.options.indexOf(question.correct))
          }
        }
        expect(places.size).toBe(OPTION_COUNT[level])
      }
    }
  })

  it('every lesson builds valid practice questions', () => {
    for (const lesson of LESSONS) {
      for (let seed = 1; seed < 30; seed += 1) {
        const questions = lessonQuestions(lesson, 'uz', seeded(seed))
        expect(questions.length).toBeGreaterThan(0)
        for (const question of questions) {
          checkQuestion(question, lesson.level)
          // practice asks only about this lesson
          expect(lesson.teaches).toContain(question.correct)
        }
      }
    }
  })

  it('age 4 practice has «Yerni top» and «Quyosh qani?»', () => {
    const lesson = lessonsFor(4)[0]!
    const prompts = lessonQuestions(lesson, 'uz', seeded(2)).map((q) => q.prompt)
    expect(prompts).toContain('Yerni top!')
    expect(prompts).toContain('Quyosh qani?')
  })

  it('a test asks only about taught things', () => {
    for (const level of LEVELS) {
      const lessons = lessonsFor(level)
      for (const lesson of lessons) {
        const taught = new Set(lesson.teaches)
        for (let seed = 1; seed < 25; seed += 1) {
          const questions = testQuestions(
            level,
            'ru',
            [lesson.stage],
            EMPTY,
            undefined,
            seeded(seed),
          )
          expect(questions.length).toBeGreaterThan(0)
          for (const question of questions) {
            expect(taught.has(question.correct)).toBe(true)
            checkQuestion(question, level)
          }
        }
      }
      // nothing taught → nothing to test
      expect(testPool(level, [])).toHaveLength(0)
      // stages of another age do not count
      const other = LEVELS.find((l) => l !== level)!
      expect(testPool(level, allStages(other))).toHaveLength(0)
    }
  })

  it('"after Mars" is asked only when both halves are taught', () => {
    const ids = (stages: string[]) =>
      testPool(6, stages).map((seed) => `${seed.type}:${seed.target}`)
    expect(ids(['6-1'])).not.toContain('after:jupiter')
    expect(ids(['6-1', '6-2'])).toContain('after:jupiter')
  })

  it('never calls the Sun a planet', () => {
    const planetWords: Record<string, RegExp> = {
      uz: /sayyora/i,
      ru: /планет/i,
      en: /planet/i,
    }
    for (const language of LANGUAGES) {
      const pack = TEXT[language]
      expect(pack.objects.sun.name).not.toMatch(planetWords[language]!)
      expect(pack.kind[KIND.sun]).not.toMatch(planetWords[language]!)
      for (const level of LEVELS) {
        for (let seed = 1; seed < 40; seed += 1) {
          for (const question of testQuestions(
            level,
            language,
            allStages(level),
            EMPTY,
            undefined,
            seeded(seed),
          )) {
            if (
              question.correct === 'sun' ||
              question.correct === 'moon' ||
              question.correct === 'stars'
            ) {
              // "which planet…?" never has a non-planet as its answer
              expect(question.prompt).not.toMatch(
                language === 'uz'
                  ? /qaysi sayyora/i
                  : language === 'ru'
                    ? /какая планета/i
                    : /which planet/i,
              )
            }
            if (/qaysi sayyora|какая планета|which planet/i.test(question.prompt)) {
              expect(isPlanet(question.correct)).toBe(true)
            }
          }
        }
      }
    }
  })

  it('"which one is a star" has only one star among the options', () => {
    for (let seed = 1; seed < 30; seed += 1) {
      const q = buildQuestion(
        { type: 'kind', target: 'sun' },
        6,
        'en',
        knownObjects(6, allStages(6)),
        seeded(seed),
      )
      expect(q.options.filter((id) => KIND[id] === 'star')).toEqual(['sun'])
    }
  })

  it('does not repeat the last question order', () => {
    const stages = allStages(4)
    const first = testQuestions(4, 'uz', stages, EMPTY, undefined, seeded(7))
    const last = orderOf(first, (q) => q.id)
    for (let seed = 8; seed < 20; seed += 1) {
      const next = testQuestions(4, 'uz', stages, EMPTY, last, seeded(seed))
      expect(orderOf(next, (q) => q.id)).not.toBe(last)
    }
  })

  it('order lessons list planets from the Sun outwards', () => {
    expect(orderSequence(lessonsFor(6)[0]!)).toEqual(['mercury', 'venus', 'earth', 'mars'])
    expect(orderSequence(lessonsFor(6)[1]!)).toEqual(['jupiter', 'saturn', 'uranus', 'neptune'])
  })
})

describe('Koinot voice lines', () => {
  it('lists every sentence the section can say, with no placeholders', () => {
    for (const language of LANGUAGES) {
      const spoken = new Set(SPOKEN[language])
      expect(spoken.size).toBeGreaterThan(40)
      for (const line of spoken) expect(line).not.toMatch(/\{\{|\}\}/)
      for (const level of LEVELS) {
        for (let seed = 1; seed < 20; seed += 1) {
          const questions = [
            ...testQuestions(level, language, allStages(level), EMPTY, undefined, seeded(seed)),
            ...lessonsFor(level).flatMap((lesson) =>
              lessonQuestions(lesson, language, seeded(seed)),
            ),
          ]
          for (const question of questions) {
            expect(spoken.has(question.prompt)).toBe(true)
            expect(spoken.has(question.help)).toBe(true)
          }
        }
      }
      const pack = TEXT[language]
      for (const id of Object.keys(pack.objects) as (keyof typeof pack.objects)[]) {
        for (const fact of pack.objects[id].facts) expect(spoken.has(fact)).toBe(true)
      }
      for (const line of [
        ...pack.say.correct,
        pack.say.wrong,
        pack.say.hello,
        pack.say.lessonDone,
      ]) {
        expect(spoken.has(line)).toBe(true)
      }
    }
  })

  it('writes each language on its own', () => {
    expect(TEXT.uz.objects.earth.find).toBe('Yerni top!')
    expect(TEXT.ru.objects.earth.find).toBe('Найди Землю!')
    expect(TEXT.en.objects.earth.find).toBe('Find the Earth!')
  })
})

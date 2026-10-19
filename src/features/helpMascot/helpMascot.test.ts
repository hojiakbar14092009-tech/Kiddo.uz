import { describe, expect, it } from 'vitest'
import { getAlphabet } from '@/content/alphabet'
import { LANGUAGES } from '@/content/languages'
import { getLearnChild } from '@/features/learn/learnStore'
import { pick, seeded, type Rng } from '@/features/learn/random'
import { orderOf } from '@/features/learn/review'
import type { LearnMode } from '@/features/learn/session'
import { COUNTERS, MATERIAL } from './content'
import { COPY } from './copy'
import { explain } from './explain'
import { advance, startFlow, type FlowState } from './flow'
import {
  claimOf,
  correction,
  generateSession,
  misspellings,
  spotQuestion,
  type FixQuestion,
  type HelpQuestion,
  type Level,
  type SpotQuestion,
} from './generate'
import { SPOKEN } from './spoken'

const ASSETS = new Set(
  Object.keys(import.meta.glob('/public/3d/*.webp', { query: '?url' })).map((path) =>
    path.replace('/public/3d/', '').replace('.webp', ''),
  ),
)

const learn = getLearnChild('nobody')
const levels: Level[] = [4, 5, 6]
const session = (
  language: (typeof LANGUAGES)[number],
  level: Level,
  mode: LearnMode,
  seed: number,
) => generateSession({ language, level, mode, learn, rng: seeded(seed) })

describe('help the mascot: content', () => {
  it('sees the 3D pictures folder', () => expect(ASSETS.size).toBeGreaterThan(100))

  for (const language of LANGUAGES) {
    const letters = getAlphabet(language).letters.map((letter) => letter.upper)

    it(`${language}: every picture exists`, () => {
      for (const item of MATERIAL[language].find)
        expect(ASSETS.has(item.picture), item.id).toBe(true)
      for (const word of MATERIAL[language].words)
        expect(ASSETS.has(word.picture), word.id).toBe(true)
      for (const counter of COUNTERS) expect(ASSETS.has(counter), counter).toBe(true)
    })

    it(`${language}: words use the alphabet's letters, with a picture each`, () => {
      for (const word of MATERIAL[language].words) {
        for (const letter of word.letters)
          expect(letters, `${word.id}: ${letter}`).toContain(letter)
      }
    })

    it(`${language}: the request names the thing`, () => {
      for (const item of MATERIAL[language].find) {
        expect(item.ask).toMatch(/!$/)
        // the request uses the word (in Uzbek and Russian with its ending)
        expect(item.ask.toLocaleLowerCase(language)).toContain(
          item.name.toLocaleLowerCase(language).slice(0, 2),
        )
      }
    })

    it(`${language}: spoken lines are concrete and unique`, () => {
      for (const line of SPOKEN[language]) expect(line).not.toMatch(/\{\{|undefined|NaN/)
      expect(new Set(SPOKEN[language]).size).toBe(SPOKEN[language].length)
    })
  }

  it('uz words use the alphabet’s letters (Oʻ with U+02BB, Sh as one letter)', () => {
    const uz = MATERIAL.uz.words
    expect(uz.find((w) => w.id === 'mushuk')!.letters).toEqual(['M', 'U', 'Sh', 'U', 'K'])
    expect(uz.find((w) => w.id === 'choy')!.letters[0]).toBe('Ch')
    for (const word of MATERIAL.uz.words) expect(word.letters.join('')).not.toMatch(/[‘’'`]/)
    // the mascot's sentences use the app's ‘, as its Uzbek texts do
    for (const item of MATERIAL.uz.find) expect(item.ask).not.toMatch(/\u02BB/)
    expect(MATERIAL.uz.find.find((i) => i.id === 'duck')!.name).toBe('o\u2018rdak')
  })
})

describe('help the mascot: questions', () => {
  it('has 3, 4 and 5 test questions for ages 4, 5 and 6, all different', () => {
    for (const language of LANGUAGES) {
      for (const level of levels) {
        const qs = session(language, level, 'test', level)
        expect(qs).toHaveLength(level - 1)
        expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length)
      }
    }
  })

  it('age 4: two pictures, exactly one asked for', () => {
    for (const language of LANGUAGES) {
      for (let seed = 1; seed < 40; seed += 1) {
        for (const q of session(language, 4, 'learn', seed)) {
          if (q.kind !== 'find') throw new Error('age 4 has only find questions')
          expect(q.options).toHaveLength(2)
          expect(new Set(q.options.map((o) => o.picture)).size).toBe(2)
          expect(q.options.filter((o) => o.id === q.item.id)).toHaveLength(1)
        }
      }
    }
  })

  it('ages 5 and 6: the mascot is really wrong, and there is exactly one right option', () => {
    for (const language of LANGUAGES) {
      for (const level of [5, 6] as const) {
        for (let seed = 1; seed < 60; seed += 1) {
          for (const q of session(language, level, 'learn', seed)) {
            if (q.kind === 'find') throw new Error('no find questions after age 4')
            const { wrong, right } = correction(q)
            expect(wrong).not.toBe(right)
            expect(q.options).toHaveLength(3)
            expect(new Set(q.options).size).toBe(3)
            expect(q.options.filter((o) => o === right)).toHaveLength(1)
            expect(q.options).not.toContain(wrong)
            if (q.kind === 'spot') {
              expect(q.lines).toHaveLength(3)
              const wrongLines = q.lines.filter((l) => l.claim.shown !== l.claim.right)
              expect(wrongLines.map((l) => l.id)).toEqual([q.wrongLine])
            }
            const claim = claimOf(q)
            if (claim.type === 'sum') {
              expect(Number(claim.right)).toBe(
                claim.op === '+' ? claim.a + claim.b : claim.a - claim.b,
              )
              expect(Number(claim.right)).toBeLessThanOrEqual(level === 5 ? 5 : 10)
              expect(Number(claim.shown)).toBeGreaterThanOrEqual(0)
            }
            if (claim.type === 'initial') expect(claim.right).toBe(claim.word.letters[0])
            expect(SPOKEN[language]).toContain(explain(claim, language))
          }
        }
      }
    }
  })

  it('misspellings are never the word itself', () => {
    for (const language of LANGUAGES) {
      for (const word of MATERIAL[language].words) {
        const wrong = misspellings(word)
        expect(wrong.length).toBeGreaterThanOrEqual(3)
        expect(wrong).not.toContain(word.letters.join(''))
      }
    }
  })

  it('age 5 mixes letters, words and sums; age 6 uses sums and first letters', () => {
    const five = session('uz', 5, 'test', 3).map((q) => q.skill)
    expect(new Set(five)).toEqual(new Set(['fix:sum', 'fix:initial', 'fix:spelling']))
    const six = session('ru', 6, 'test', 3).map((q) => q.skill)
    expect(new Set(six)).toEqual(new Set(['spot:plus', 'spot:minus', 'spot:initial']))
  })

  it('never repeats the order of the last session', () => {
    const first = session('en', 6, 'test', 4)
    const last = orderOf(first, (q) => q.id)
    const again = generateSession({
      language: 'en',
      level: 6,
      mode: 'test',
      learn,
      lastOrder: last,
      rng: seeded(4),
    })
    expect(orderOf(again, (q) => q.id)).not.toBe(last)
  })
})

/** Plays a question with random taps (a tried card can't be tapped again) until it ends; returns the end state and the recorded answers. */
function play(q: FixQuestion | SpotQuestion, mode: LearnMode, rng: Rng) {
  let state: FlowState = startFlow(q)
  const records: boolean[] = []
  for (let taps = 0; taps < 20 && state.stage !== 'done'; taps += 1) {
    const event =
      state.stage === 'spot' && q.kind === 'spot'
        ? {
            type: 'line' as const,
            id: pick(
              q.lines.filter((l) => !state.checkedLines.includes(l.id)),
              rng,
            ).id,
          }
        : {
            type: 'option' as const,
            value: pick(
              q.options.filter((o) => !state.triedOptions.includes(o)),
              rng,
            ),
          }
    const step = advance(q, mode, state, event)
    if (step.record) records.push(step.record.correct)
    state = step.state
  }
  return { state, records }
}

describe('help the mascot: the mistake always ends corrected', () => {
  it('in learning and in a check, whatever the child taps', () => {
    for (const language of LANGUAGES) {
      for (const level of [5, 6] as const) {
        for (const mode of ['learn', 'test'] as const) {
          for (let seed = 1; seed < 40; seed += 1) {
            for (const q of session(language, level, mode, seed) as Exclude<
              HelpQuestion,
              { kind: 'find' }
            >[]) {
              const { state, records } = play(q, mode, seeded(seed * 7))
              expect(state.stage).toBe('done')
              expect(state.outcome).not.toBeNull()
              if (mode === 'learn') expect(state.outcome).toBe('fixed')
              // the screen shows the mascot's answer crossed out and the right one
              const { wrong, right } = correction(q)
              expect(right).toBe(claimOf(q).right)
              expect(wrong).toBe(claimOf(q).shown)
              // a check keeps only one answer per step
              if (mode === 'test') expect(records.length).toBeLessThanOrEqual(2)
            }
          }
        }
      }
    }
  })

  it('first right only when the wrong line and the right answer are both found first', () => {
    const q = spotQuestion('uz', 'plus', seeded(5))
    const right = claimOf(q).right
    const otherLine = q.lines.find((l) => l.id !== q.wrongLine)!.id
    let state = startFlow(q)
    const missed = advance(q, 'learn', state, { type: 'line', id: otherLine })
    expect(missed.record).toMatchObject({ correct: false, errorType: 'missed-mistake' })
    state = advance(q, 'learn', missed.state, { type: 'line', id: q.wrongLine }).state
    expect(state.stage).toBe('fix')
    const fixed = advance(q, 'learn', state, { type: 'option', value: right })
    expect(fixed.record?.correct).toBe(true)
    expect(fixed.state.outcome).toBe('fixed')
  })

  it('a check reveals the right answer after a wrong one', () => {
    const q = spotQuestion('en', 'initial', seeded(8))
    const wrongOption = q.options.find((o) => o !== claimOf(q).right)!
    let state = advance(q, 'test', startFlow(q), { type: 'line', id: q.wrongLine }).state
    const step = advance(q, 'test', state, { type: 'option', value: wrongOption })
    state = step.state
    expect(step.record).toMatchObject({ correct: false, errorType: 'wrong-initial' })
    expect(state).toMatchObject({ stage: 'done', outcome: 'revealed' })
    expect(COPY.en.initialIs('Cat', 'C')).toContain('C')
  })
})

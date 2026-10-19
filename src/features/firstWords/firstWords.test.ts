import { describe, expect, it } from 'vitest'
import { getAlphabet } from '@/content/alphabet'
import { LANGUAGES, type Language } from '@/content/languages'
import { getLearnChild } from '@/features/learn/learnStore'
import { seeded } from '@/features/learn/random'
import { orderOf } from '@/features/learn/review'
import { MATERIAL, wordDisplay, wordText, type Word } from './content'
import { COPY } from './copy'
import {
  buildQuestion,
  choiceIds,
  correctChoice,
  generateSession,
  missingQuestion,
  type Level,
} from './generate'
import { SPOKEN } from './spoken'

// the 3D pictures that really exist in public/3d (file names only, nothing is loaded)
const ASSETS = new Set(
  Object.keys(import.meta.glob('/public/3d/*.webp', { query: '?url' })).map((path) =>
    path.replace('/public/3d/', '').replace('.webp', ''),
  ),
)
const asset = (name: string) => ASSETS.has(name)

const allWords = (language: Language): Word[] => {
  const m = MATERIAL[language]
  return [...m.initial, ...m.build, ...m.read]
}

const learn = getLearnChild('nobody')

describe('first words: content', () => {
  it('sees the 3D pictures folder', () => expect(ASSETS.size).toBeGreaterThan(100))

  for (const language of LANGUAGES) {
    const letters = getAlphabet(language).letters.map((letter) => letter.upper)

    it(`${language}: every word and sentence has a 3D picture`, () => {
      for (const word of allWords(language)) expect(asset(word.picture), word.id).toBe(true)
      for (const s of MATERIAL[language].sentences) expect(asset(s.picture), s.id).toBe(true)
    })

    it(`${language}: words are spelled with the letters of the alphabet`, () => {
      for (const word of allWords(language)) {
        for (const letter of word.letters)
          expect(letters, `${word.id}: ${letter}`).toContain(letter)
      }
    })

    it(`${language}: the first letter of a word is the letter it starts with`, () => {
      for (const word of allWords(language)) {
        const written = wordText(word).toLocaleLowerCase(language)
        expect(written.startsWith(word.letters[0]!.toLocaleLowerCase(language)), word.id).toBe(true)
      }
    })

    it(`${language}: has enough material for every age`, () => {
      const m = MATERIAL[language]
      expect(new Set(m.initial.map((w) => w.letters[0])).size).toBeGreaterThanOrEqual(8)
      expect(m.build.length).toBeGreaterThanOrEqual(8)
      expect(m.read.length).toBeGreaterThanOrEqual(8)
      expect(m.sentences.length).toBeGreaterThanOrEqual(6)
      // pictures of the reading words are all different, so a picture means one word
      expect(new Set(m.read.map((w) => w.picture)).size).toBe(m.read.length)
      expect(new Set(m.sentences.map((s) => s.picture)).size).toBe(m.sentences.length)
    })

    it(`${language}: every sentence names its focus word`, () => {
      for (const s of MATERIAL[language].sentences) expect(s.text).toContain(s.focus)
    })
  }

  it('uz uses the alphabet’s own digraph letters (Sh, Ch, Ng, Oʻ with U+02BB)', () => {
    const words = allWords('uz')
    const spelled = (id: string) => words.find((w) => w.id === id)!.letters
    expect(spelled('mushuk')).toEqual(['M', 'U', 'Sh', 'U', 'K'])
    expect(spelled('choy')).toEqual(['Ch', 'O', 'Y'])
    expect(spelled('bodring')).toContain('Ng')
    expect(spelled('oʻrdak')[0]).toBe('Oʻ')
    for (const word of words) {
      // never the look-alike apostrophes, and never Sh/Ch/Ng as two letters
      expect(wordText(word)).not.toMatch(/[‘’'`]/)
      // Sh, Ch and Ng are one letter each, never S+H, C+H or N+G
      for (let i = 1; i < word.letters.length; i += 1) {
        const pair = `${word.letters[i - 1]}${word.letters[i]}`
        expect(['SH', 'CH', 'NG'], word.id).not.toContain(pair)
      }
    }
    // the words to read use the alphabet's ʻ; the instructions use the app's ‘ (as its uz texts do)
    for (const lines of Object.values(COPY.uz)) {
      if (typeof lines === 'string') expect(lines).not.toMatch(/\u02BB/)
    }
  })

  it('English reading words are decodable, not translations', () => {
    const cvc = MATERIAL.en.build.filter((w) => w.letters.length === 3)
    expect(cvc.length).toBe(MATERIAL.en.build.length)
    for (const s of MATERIAL.en.sentences) expect(s.text).toMatch(/^[A-Z][a-z ]+\.$/)
  })

  it('spoken lines are concrete sentences, unique per language', () => {
    for (const language of LANGUAGES) {
      for (const line of SPOKEN[language]) expect(line).not.toMatch(/\{\{|undefined/)
      expect(new Set(SPOKEN[language]).size).toBe(SPOKEN[language].length)
      for (const word of MATERIAL[language].read) {
        expect(SPOKEN[language]).toContain(COPY[language].wordIs(wordDisplay(word, language)))
      }
    }
  })
})

describe('first words: questions', () => {
  const levels: Level[] = [4, 5, 6]

  it('has 3, 4 and 5 test questions for ages 4, 5 and 6', () => {
    for (const language of LANGUAGES) {
      for (const level of levels) {
        const { questions } = generateSession({
          language,
          level,
          mode: 'test',
          learn,
          rng: seeded(level),
        })
        expect(questions).toHaveLength(level - 1)
        expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length)
      }
    }
  })

  it('every choice question has exactly one right answer among unique options', () => {
    for (const language of LANGUAGES) {
      for (const level of [4, 6] as const) {
        for (let seed = 1; seed < 60; seed += 1) {
          const { questions } = generateSession({
            language,
            level,
            mode: 'learn',
            learn,
            rng: seeded(seed),
          })
          for (const q of questions) {
            if (q.kind === 'build') continue
            const ids = choiceIds(q)
            expect(new Set(ids).size, q.id).toBe(ids.length)
            expect(ids.filter((id) => id === correctChoice(q))).toHaveLength(1)
            expect(ids).toHaveLength(level === 4 ? 2 : 3)
          }
        }
      }
    }
  })

  it('age 4: two options, a different first letter on the wrong one', () => {
    for (const language of LANGUAGES) {
      for (let seed = 1; seed < 40; seed += 1) {
        const { questions } = generateSession({
          language,
          level: 4,
          mode: 'test',
          learn,
          rng: seeded(seed),
        })
        expect(new Set(questions.map((q) => q.skill)).size).toBe(questions.length)
        for (const q of questions) {
          if (q.kind === 'pick-picture') {
            const wrong = q.options.find((w) => w.id !== q.target.id)!
            expect(wrong.letters[0]!.charAt(0)).not.toBe(q.letter.charAt(0))
          }
          if (q.kind === 'pick-letter') expect(q.options).toContain(q.target.letters[0])
          expect(q.skill).toMatch(/^initial:/)
        }
      }
    }
  })

  it('age 5: tiles hold the word’s letters plus one other, never in order; learning has an example', () => {
    for (const language of LANGUAGES) {
      for (const word of MATERIAL[language].build) {
        const q = buildQuestion(language, word, seeded(word.id.length))
        const tiles = q.tiles.map((t) => t.letter)
        expect(tiles).toHaveLength(word.letters.length + 1)
        for (const letter of word.letters) expect(tiles).toContain(letter)
        expect(q.tiles.map((t) => t.id).join()).not.toBe(
          [...word.letters.map((_, i) => `${i}`), 'extra'].join(),
        )
        expect(q.skill).toMatch(/^build:[cv]+$/)
      }
      const s = generateSession({ language, level: 5, mode: 'learn', learn, rng: seeded(2) })
      expect(s.example).not.toBeNull()
      expect(s.questions.map((q) => q.kind === 'build' && q.word.id)).not.toContain(s.example!.id)
    }
  })

  it('age 6: reads words and sentences and finds missing letters', () => {
    for (const language of LANGUAGES) {
      const { questions } = generateSession({
        language,
        level: 6,
        mode: 'test',
        learn,
        rng: seeded(9),
      })
      const kinds = new Set(questions.map((q) => q.kind))
      expect(kinds).toEqual(new Set(['read-word', 'read-sentence', 'missing']))
      for (const word of MATERIAL[language].read) {
        for (let index = 0; index < word.letters.length; index += 1) {
          const q = missingQuestion(language, word, seeded(index + 1), index)
          expect(q.options).toContain(word.letters[index])
          expect(new Set(q.options).size).toBe(3)
          expect(q.skill).toMatch(/^missing:/)
        }
      }
    }
  })

  it('never repeats the order of the last session', () => {
    const first = generateSession({ language: 'uz', level: 6, mode: 'test', learn, rng: seeded(4) })
    const last = orderOf(first.questions, (q) => q.id)
    const again = generateSession({
      language: 'uz',
      level: 6,
      mode: 'test',
      learn,
      lastOrder: last,
      rng: seeded(4),
    })
    expect(orderOf(again.questions, (q) => q.id)).not.toBe(last)
  })
})

import { describe, expect, it } from 'vitest'
import { LANGUAGES } from '@/content/languages'
import { getLearnChild } from '@/features/learn/learnStore'
import { seeded } from '@/features/learn/random'
import { checkQuestions, sceneSpeech, TALE_TEXT, TALES, talesFor } from './content'
import { checkLength, mixedOrder, pickChecks } from './logic'
import { SPOKEN } from './spoken'

// the 3D pictures that really exist in public/3d (file names only, nothing is loaded)
const ASSETS = new Set(
  Object.keys(import.meta.glob('/public/3d/*.webp', { query: '?url' })).map((path) =>
    path.replace('/public/3d/', '').replace('.webp', ''),
  ),
)

const languages = LANGUAGES

describe('tales content', () => {
  it('has nine tales, three for each age', () => {
    expect(TALES).toHaveLength(9)
    expect(new Set(TALES.map((tale) => tale.id)).size).toBe(9)
    for (const age of [4, 5, 6] as const) {
      expect(TALES.filter((tale) => tale.age === age)).toHaveLength(3)
    }
  })

  it('is written in uz, ru and en with the same scenes, tasks and questions', () => {
    expect([...languages].sort()).toEqual(['en', 'ru', 'uz'])
    for (const language of languages) {
      for (const tale of TALES) {
        const text = TALE_TEXT[language][tale.id]
        expect(text, `${language} ${tale.id}`).toBeDefined()
        expect(text!.title.trim()).not.toBe('')
        expect(text!.scenes).toHaveLength(tale.scenes.length)
        tale.scenes.forEach((scene, index) => {
          const words = text!.scenes[index]!
          expect(words.lines.length).toBeGreaterThan(0)
          words.lines.forEach((line) => expect(line.trim()).not.toBe(''))
          expect(Boolean(words.task), `${language} ${tale.id} scene ${index}`).toBe(
            Boolean(scene.task),
          )
          if (scene.task) {
            expect(words.task!.options).toHaveLength(scene.task.options.length)
            expect(new Set(words.task!.options).size).toBe(scene.task.options.length)
            expect(new Set(scene.task.options).size).toBe(scene.task.options.length)
          }
        })
        expect(text!.checks).toHaveLength(tale.checks.length)
      }
    }
  })

  it('differs between languages (each is written, not copied)', () => {
    for (const tale of TALES) {
      const [uz, ru, en] = (['uz', 'ru', 'en'] as const).map(
        (l) => TALE_TEXT[l][tale.id]!.scenes[0]!.lines[0],
      )
      expect(new Set([uz, ru, en]).size).toBe(3)
    }
  })

  it('uses only pictures that exist in public/3d', () => {
    expect(ASSETS.size).toBeGreaterThan(100)
    const assets = new Set<string>()
    for (const tale of TALES) {
      assets.add(tale.cover)
      for (const scene of tale.scenes) {
        scene.actors.forEach((actor) => assets.add(actor.asset))
        scene.task?.options.forEach((asset) => assets.add(asset))
      }
      tale.checks.forEach((check) => check.options.forEach((asset) => assets.add(asset)))
    }
    for (const asset of assets) {
      expect(ASSETS.has(asset), asset).toBe(true)
    }
  })

  it('gives every question exactly one right answer and different options', () => {
    for (const language of languages) {
      for (const tale of TALES) {
        for (const question of checkQuestions(tale, language)) {
          expect(question.prompt.trim()).not.toBe('')
          expect(question.options.filter((o) => o.correct)).toHaveLength(1)
          expect(new Set(question.options.map((o) => o.asset)).size).toBe(question.options.length)
          expect(new Set(question.options.map((o) => o.label)).size).toBe(question.options.length)
        }
      }
    }
  })

  it('asks 3, 4 or 5 questions for ages 4, 5 and 6, with something left over for variety', () => {
    const learn = getLearnChild('nobody')
    for (const tale of TALES) {
      const expected = { 4: 3, 5: 4, 6: 5 }[tale.age]
      expect(checkLength(tale)).toBe(expected)
      expect(tale.checks.length).toBeGreaterThan(expected)
      for (const language of languages) {
        const picked = pickChecks(tale, language, learn, seeded(tale.age))
        expect(picked).toHaveLength(expected)
        expect(new Set(picked.map((q) => q.id)).size).toBe(expected)
        picked.forEach((q) => expect(q.options.filter((o) => o.correct)).toHaveLength(1))
      }
    }
  })

  it('never shows an ordering task already in order', () => {
    for (let seed = 1; seed < 50; seed += 1) {
      expect(mixedOrder(['a', 'b', 'c'], seeded(seed))).not.toEqual(['a', 'b', 'c'])
    }
  })

  it('shows a child the tales of their age and younger ones', () => {
    expect(talesFor(4).open.every((tale) => tale.age === 4)).toBe(true)
    expect(talesFor(4).later).toHaveLength(6)
    expect(talesFor(5).open.map((tale) => tale.age)).toEqual([5, 5, 5, 4, 4, 4])
    expect(talesFor(6).open).toHaveLength(9)
  })

  it('lists every sentence that can be read aloud', () => {
    for (const language of languages) {
      const spoken = new Set(SPOKEN[language])
      for (const tale of TALES) {
        const text = TALE_TEXT[language][tale.id]!
        text.scenes.forEach((scene) =>
          sceneSpeech(scene).forEach((line) => expect(spoken.has(line), line).toBe(true)),
        )
        text.checks.forEach((check) => expect(spoken.has(check.prompt)).toBe(true))
      }
    }
  })
})

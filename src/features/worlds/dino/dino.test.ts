import { describe, expect, it } from 'vitest'
import i18n from '@/i18n'
import type { ChallengeLevel } from '@/domain/learner'
import { DINO_IDS, DINO_MODELS, DINOS, dinoStill, FREE_DINOS } from './content'
import { brushAt, brushNextRow, clearedShare, DIG_LEVELS, newSand, planDig, UNCOVERED } from './dig'
import { LONGER_MIN_GAP, planQuiz, QUIZ_LEVELS } from './quiz'
import { promptOf } from './quizText'
import { dinoActivity, dinoActivityName } from './result'
import { DINO_TEXT } from './text'

const LEVELS: ChallengeLevel[] = [1, 2, 3, 4, 5]

/** A repeatable random source (small LCG). */
function seeded(seed: number) {
  let state = seed
  return () => {
    state = (state * 9301 + 49297) % 233280
    return state / 233280
  }
}

type Tree = { [key: string]: string | string[] | Tree }
function shape(tree: Tree): unknown {
  return Object.fromEntries(
    Object.entries(tree).map(([key, value]) => [
      key,
      typeof value === 'string' ? 'text' : Array.isArray(value) ? value.length : shape(value),
    ]),
  )
}

describe('dinosaur content', () => {
  it('has six animals; two free, four PRO', () => {
    expect(DINO_IDS).toHaveLength(6)
    expect(FREE_DINOS).toEqual(['trex', 'triceratops'])
  })

  it('says that Pteranodon flew and was not a dinosaur; Brachiosaurus is the longest', () => {
    expect(DINOS.pteranodon).toMatchObject({ dinosaur: false, flies: true, diet: 'fish' })
    for (const id of DINO_IDS.filter((id) => id !== 'pteranodon')) {
      expect(DINOS[id]).toMatchObject({ dinosaur: true, flies: false })
    }
    const longest = [...DINO_IDS].sort((a, b) => DINOS[b].lengthM - DINOS[a].lengthM)[0]
    expect(longest).toBe('brachiosaurus')
    expect(DINO_IDS.filter((id) => DINOS[id].diet === 'meat')).toEqual(['trex'])
    for (const language of ['uz', 'ru', 'en'] as const) {
      expect(DINO_TEXT[language].dinos.pteranodon.facts[0]).toMatch(
        language === 'uz' ? /dinozavr emas/ : language === 'ru' ? /не динозавр/ : /not a dinosaur/,
      )
    }
  })

  it('every language has the same texts: 3–4 facts and a label and fact per hotspot', () => {
    const uz = shape(DINO_TEXT.uz as unknown as Tree)
    expect(shape(DINO_TEXT.ru as unknown as Tree)).toEqual(uz)
    expect(shape(DINO_TEXT.en as unknown as Tree)).toEqual(uz)
    for (const language of ['uz', 'ru', 'en'] as const) {
      for (const id of DINO_IDS) {
        const text = DINO_TEXT[language].dinos[id]
        expect(text.facts.length).toBeGreaterThanOrEqual(3)
        expect(text.facts.length).toBeLessThanOrEqual(4)
        expect(DINOS[id].hotspots.length).toBeGreaterThanOrEqual(2)
        expect(DINOS[id].hotspots.length).toBeLessThanOrEqual(3)
        const spots = text.spots as Record<string, { label: string; fact: string } | undefined>
        for (const spot of DINOS[id].hotspots) {
          expect(spots[spot.id]?.label, `${language} ${id} ${spot.id}`).toBeTruthy()
          expect(spots[spot.id]?.fact, `${language} ${id} ${spot.id}`).toBeTruthy()
        }
        expect(Object.keys(spots).sort()).toEqual(DINOS[id].hotspots.map((s) => s.id).sort())
      }
    }
  })

  it('Uzbek texts are Latin with the right apostrophes', () => {
    const all = JSON.stringify(DINO_TEXT.uz)
    expect(all).not.toMatch(/[А-Яа-яЁё]/)
    // o‘ and g‘ use the turned comma (U+2018), never a plain quote or a backtick
    expect(all).not.toMatch(/[og]['`’]/)
  })

  it('the Explorer models read their hotspot labels through i18next in every language', () => {
    for (const id of DINO_IDS) {
      const model = DINO_MODELS[id]
      expect(model.still).toBe(dinoStill(id))
      for (const spot of model.hotspots ?? []) {
        for (const language of ['uz', 'ru', 'en'] as const) {
          const label = i18n.getFixedT(language)(spot.labelKey as never) as string
          const spots = DINO_TEXT[language].dinos[id].spots as Record<string, { label: string }>
          expect(label).toBe(spots[spot.id]?.label)
        }
      }
    }
  })

  it('has a small still picture for every animal', () => {
    const files = import.meta.glob('/public/3d/worlds/dino-*.webp', {
      query: '?url',
      eager: true,
    })
    for (const id of DINO_IDS) expect(Object.keys(files)).toContain(`/public${dinoStill(id)}`)
  })
})

describe('dino quiz', () => {
  it.each(LEVELS)('level %i: questions have the planned size and one right answer', (level) => {
    const plan = QUIZ_LEVELS[level]
    for (let seed = 1; seed <= 60; seed += 1) {
      const questions = planQuiz(level, seeded(seed))
      expect(questions).toHaveLength(plan.kinds.length)
      expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length)
      for (const q of questions) {
        expect(q.options).toContain(q.answer)
        expect(new Set(q.options).size).toBe(q.options.length)
        expect(q.options.length).toBeGreaterThanOrEqual(2)
        expect(q.options.length).toBeLessThanOrEqual(
          plan.kinds.includes('eat') ? Math.max(plan.options, 3) : plan.options,
        )
        expect(promptOf(DINO_TEXT.uz, q)).not.toMatch(/\{\{/)
        const dinos = q.options.filter((o) => o in DINOS) as (keyof typeof DINOS)[]
        switch (q.kind) {
          case 'eat':
            expect(q.subject && DINOS[q.subject].diet).toBe(q.answer)
            expect(q.options.includes('fish')).toBe(plan.fish)
            break
          case 'whoMeat':
            expect(dinos.filter((id) => DINOS[id].diet === 'meat')).toEqual([q.answer])
            break
          case 'whoPlant':
            expect(dinos.filter((id) => DINOS[id].diet === 'plant')).toEqual([q.answer])
            break
          case 'biggest':
            expect(q.answer).toBe('brachiosaurus')
            expect(dinos).not.toContain('pteranodon')
            break
          case 'flew':
          case 'notDino':
            expect(q.answer).toBe('pteranodon')
            break
          case 'feature':
            expect(dinos.filter((id) => DINOS[id].feature === q.feature)).toEqual([q.answer])
            expect(plan.features).toContain(q.feature)
            break
          case 'longer': {
            expect(q.options).toHaveLength(2)
            const other = dinos.find((id) => id !== q.answer)!
            expect(DINOS[q.answer as 'trex'].lengthM - DINOS[other].lengthM).toBeGreaterThanOrEqual(
              LONGER_MIN_GAP,
            )
            break
          }
        }
      }
    }
  })

  it('gets harder with the level: more questions and more pictures', () => {
    expect(planQuiz(1, seeded(3))).toHaveLength(4)
    expect(planQuiz(5, seeded(3))).toHaveLength(6)
    expect(QUIZ_LEVELS[1].options).toBe(2)
    expect(QUIZ_LEVELS[4].options).toBe(4)
    // level 1 never asks about features, lengths or "not a dinosaur"
    for (let seed = 1; seed < 30; seed += 1) {
      const kinds = planQuiz(1, seeded(seed)).map((q) => q.kind)
      expect(kinds.some((k) => ['feature', 'longer', 'notDino'].includes(k))).toBe(false)
    }
  })
})

describe('fossil dig', () => {
  it.each(LEVELS)('level %i plans distinct bones with the right number of pictures', (level) => {
    const { bones, choices } = DIG_LEVELS[level]
    for (let seed = 1; seed < 30; seed += 1) {
      const plan = planDig(level, seeded(seed))
      expect(plan).toHaveLength(bones)
      expect(new Set(plan.map((bone) => bone.dino)).size).toBe(bones)
      for (const bone of plan) {
        expect(bone.options).toHaveLength(choices)
        expect(bone.options).toContain(bone.dino)
        expect(new Set(bone.options).size).toBe(choices)
      }
    }
  })

  it('a brush clears the cells around the touch; the keyboard clears row by row', () => {
    const grid = 6
    let sand = newSand(grid)
    expect(clearedShare(sand)).toBe(0)
    sand = brushAt(sand, grid, 0.5, 0.5, 1.3)
    // the corner cell and its neighbours (the diagonal is 1.41 away: not reached)
    expect(sand.filter(Boolean)).toHaveLength(3)
    sand = brushAt(sand, grid, 0.5, 0.5, 1.3)
    expect(sand.filter(Boolean)).toHaveLength(3)
    let rows = newSand(grid)
    let presses = 0
    while (clearedShare(rows) < UNCOVERED) {
      rows = brushNextRow(rows, grid)
      presses += 1
    }
    expect(presses).toBe(5)
    expect(
      brushNextRow(
        rows.map(() => true),
        grid,
      ).every(Boolean),
    ).toBe(true)
  })
})

describe('universe event', () => {
  it('is a science run with the level it was played at', () => {
    expect(dinoActivityName('quiz', 3)).toBe('dino:quiz:L3')
    expect(dinoActivity('run-1', 'kid', 'dig', 2, { total: 3, firstTry: 2 })).toEqual({
      id: 'run-1',
      childKey: 'kid',
      activity: 'dino:dig:L2',
      strand: 'science',
      correct: 2,
      total: 3,
      independent: 2,
      level: 2,
    })
  })
})

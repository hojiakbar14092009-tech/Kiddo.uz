import { beforeEach, describe, expect, it } from 'vitest'
import type { StrandState } from '@/domain/learner/profile'
import { en } from '@/i18n/locales/en'
import { ru } from '@/i18n/locales/ru'
import { uz } from '@/i18n/locales/uz'
import { STICKER_DRAWINGS } from '@/features/collection/stickerDrawings'
import { useFamilyStore } from '@/store/familyStore'
import { useProgressStore } from '@/store/progressStore'
import { ACHIEVEMENTS, EMPTY_STATS, metricValue, pathValue, tierRank } from './achievements'
import {
  atCurrentLevel,
  EMPTY_UNIVERSE_CHILD,
  emitActivity,
  placeStrand,
  useUniverseStore,
} from './store'
import { stickersForTier, stickerUnlocked, UNIVERSE_STICKERS } from './stickers'
import { TIERS, type ActivityCompleted, type Strand } from './types'

/*
 * Phase 30: Star Paths medals read how far learning reached (the LearnerProfile),
 * Universe stickers unlock with medal tiers. Both are idempotent and per child,
 * and none can be farmed with easy content or a placement alone.
 */

const child = (id: string) => ({
  id,
  name: id.toUpperCase(),
  birthDate: '2016-01-01',
  celebratedLevel: 6 as const,
  gender: 'girl' as const,
  mascot: 'girl' as const,
  dailyLimitMinutes: 60,
  createdAt: '2026-01-01T00:00:00.000Z',
})

beforeEach(() => {
  useUniverseStore.setState({ byChild: {} })
  useProgressStore.setState({ byChild: {} })
  useFamilyStore.setState({ children: [child('a'), child('b')], activeChildId: 'a' })
})

const state = (level: number, mastery = 0, climbed?: number): StrandState =>
  ({ level, mastery, streak: 0, runs: 5, independent: 40, total: 50, climbed }) as StrandState

function seed(childKey: string, strands: Partial<Record<Strand, StrandState>>) {
  useUniverseStore.setState((s) => ({
    byChild: { ...s.byChild, [childKey]: { ...EMPTY_UNIVERSE_CHILD, strands } },
  }))
}

let n = 0
/** A finished tale: a run that counts but does not touch any strand level. */
function tale(childKey: string, id = `tale-${++n}`): ActivityCompleted {
  return {
    id,
    childKey,
    activity: `tale:${id}`,
    strand: 'reading',
    correct: 1,
    total: 1,
    independent: 1,
  }
}

/** A Math Lab run at the strand's current level, `right` of 10 answered alone. */
function mathRun(childKey: string, right: number): ActivityCompleted {
  n += 1
  const e: ActivityCompleted = {
    id: `lab-${n}`,
    childKey,
    activity: 'math-lab',
    strand: 'number',
    correct: right,
    total: 10,
    independent: right,
  }
  return atCurrentLevel(e, 'assessment')
}

const medals = (childKey: string) =>
  useUniverseStore.getState().byChild[childKey]?.achievements ?? {}
const numberState = (childKey: string) =>
  useUniverseStore.getState().byChild[childKey]?.strands?.number

describe('Star Paths metrics', () => {
  it('a path is how high the learner climbed, safe against corrupt saves', () => {
    expect(pathValue(undefined)).toBe(0)
    expect(pathValue(state(5, 4))).toBe(0) // a level alone (age prior, placement) is not a climb
    expect(pathValue(state(4, 0, 4))).toBe(4)
    expect(pathValue(state(2, 0, 7))).toBe(7) // kept after a drop
    expect(pathValue({ ...state(5), climbed: Number.NaN })).toBe(0)
    expect(pathValue({ ...state(5), climbed: -4 })).toBe(0)
    expect(pathValue({ ...state(5), climbed: 1e15 })).toBe(5 + 10_000)
  })

  it('"many paths" counts strands climbed to a spark (level 4)', () => {
    const source = {
      stats: EMPTY_STATS,
      strands: {
        number: state(4, 0, 4),
        letters: state(3, 0, 3),
        language: state(5, 1, 6),
        science: state(5, 0, 2),
        social: state(5, 3),
      },
    }
    expect(metricValue(source, 'paths')).toBe(2)
    expect(metricValue(source, 'path:language')).toBe(6)
  })

  it('the new collection has creative tier names, never "Tier 1/2/3"', () => {
    for (const locale of [uz, ru, en]) {
      const names = Object.values(locale.collection.starTiers)
      expect(new Set(names).size).toBe(3)
      for (const name of names) expect(name).not.toMatch(/tier|daraja|уровень|\d/i)
    }
  })
})

describe('Star Paths medals in the store', () => {
  it("climbing to level 4 by the learner's own runs pays the spark once, coins once", () => {
    seed('a', { number: state(3) })
    emitActivity(mathRun('a', 9))
    const award = emitActivity(mathRun('a', 9))
    expect(numberState('a')).toMatchObject({ level: 4, climbed: 4 })
    expect(award.achievements).toContain('number-path|bronze')
    expect(medals('a')['number-path']).toBe('bronze')
    // counted again (same id) or another run: no second spark
    const again = emitActivity({ ...mathRun('a', 5), id: `lab-${n - 1}` })
    expect(again.achievements).toEqual([])
    expect(emitActivity(tale('a')).achievements).not.toContain('number-path|bronze')
  })

  it('the age prior pays nothing: a 10-year-old starting at level 5 with weak or middling runs', () => {
    for (const right of [3, 6, 3, 6]) emitActivity(mathRun('a', right))
    expect(numberState('a')?.runs).toBe(4)
    expect(medals('a')['number-path']).toBeUndefined()
    expect(medals('a')['many-paths']).toBeUndefined()
  })

  it('a 10-year-old who masters level 5 earns the steps on the way at once', () => {
    emitActivity(mathRun('a', 10))
    const award = emitActivity(mathRun('a', 10))
    expect(numberState('a')).toMatchObject({ level: 5, climbed: 6 })
    expect(award.achievements).toEqual(
      expect.arrayContaining(['number-path|bronze', 'number-path|silver']),
    )
    expect(medals('a')['number-path']).toBe('silver')
  })

  it('a placement plus middling runs pays nothing; only a climb above it does', () => {
    placeStrand('a', 'number', { level: 5, mastery: 2, asked: 4, independent: 4 })
    emitActivity(mathRun('a', 6))
    emitActivity(mathRun('a', 6))
    expect(medals('a')['number-path']).toBeUndefined()
    emitActivity(mathRun('a', 10))
    emitActivity(mathRun('a', 10))
    expect(numberState('a')).toMatchObject({ mastery: 3, climbed: 8 })
    expect(medals('a')['number-path']).toBe('gold')
  })

  it('easy practice cannot reach a Star Path (it never passes level 3)', () => {
    seed('a', { number: state(2) })
    for (let i = 0; i < 12; i += 1) {
      const e: ActivityCompleted = {
        id: `easy-${i}`,
        childKey: 'a',
        activity: 'math:6',
        strand: 'number',
        correct: 10,
        total: 10,
        independent: 10,
      }
      emitActivity(atCurrentLevel(e, 'practice'))
    }
    expect(numberState('a')).toMatchObject({ level: 3, climbed: 3 })
    expect(medals('a')['number-path']).toBeUndefined()
  })

  it('a strand that drops later keeps its climb and its medal', () => {
    seed('a', { number: state(5, 0, 5) })
    emitActivity(tale('a'))
    expect(medals('a')['number-path']).toBe('silver')
    for (let i = 0; i < 4; i += 1) emitActivity(mathRun('a', 2))
    expect(numberState('a')).toMatchObject({ level: 3, climbed: 5 })
    expect(medals('a')['number-path']).toBe('silver')
  })

  it('dropping on purpose and climbing back to the start pays nothing', () => {
    // a 10-year-old starts at level 5 (age prior)
    emitActivity(mathRun('a', 2))
    emitActivity(mathRun('a', 2))
    expect(numberState('a')?.level).toBe(4)
    emitActivity(mathRun('a', 10))
    emitActivity(mathRun('a', 10))
    expect(numberState('a')).toMatchObject({ level: 5, peak: 5 })
    expect(numberState('a')?.climbed).toBeUndefined()
    expect(medals('a')['number-path']).toBeUndefined()
  })

  it('medals stay per child', () => {
    seed('a', { number: state(5, 2, 7), language: state(4, 0, 4), science: state(4, 0, 4) })
    emitActivity(tale('a'))
    expect(medals('a')).toMatchObject({ 'number-path': 'gold', 'many-paths': 'bronze' })
    emitActivity(tale('b'))
    expect(medals('b')['number-path']).toBeUndefined()
    expect(medals('b')['many-paths']).toBeUndefined()
  })
})

describe('Universe stickers', () => {
  it('each belongs to an existing medal tier and has a drawing and a name in uz/ru/en', () => {
    const ids = new Set<string>()
    for (const sticker of UNIVERSE_STICKERS) {
      expect(ids.has(sticker.id)).toBe(false)
      ids.add(sticker.id)
      expect(ACHIEVEMENTS.some((medal) => medal.id === sticker.achievement)).toBe(true)
      expect(STICKER_DRAWINGS[sticker.id]).toBeTruthy()
      for (const locale of [uz, ru, en]) {
        const stickers = locale.universe.stickers as Record<string, { title: string }>
        expect(stickers[sticker.id]?.title).toBeTruthy()
      }
    }
    // not a generic star / heart / trophy set
    expect([...ids].some((id) => /^(star|heart|trophy)$/.test(id))).toBe(false)
  })

  it('unlock when the medal reaches the tier (or a higher one), and never before', () => {
    const map = UNIVERSE_STICKERS.find((s) => s.id === 'discovery-map')!
    expect(stickerUnlocked(map, {})).toBe(false)
    expect(stickerUnlocked(map, { 'first-steps': 'bronze' })).toBe(false)
    expect(stickerUnlocked(map, { 'first-steps': 'silver' })).toBe(true)
    expect(stickerUnlocked(map, { 'first-steps': 'gold' })).toBe(true)
    expect(stickersForTier('first-steps', 'silver').map((s) => s.id)).toEqual(['discovery-map'])
    expect(stickersForTier('first-steps', 'gold')).toEqual([])
    for (const sticker of UNIVERSE_STICKERS) expect(tierRank(sticker.tier)).toBeGreaterThan(0)
    expect(TIERS).toContain(map.tier)
  })
})

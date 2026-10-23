import { beforeEach, describe, expect, it } from 'vitest'
import { LANGUAGES } from '@/content/languages'
import { WORLDS, adventureState, BUILDINGS } from '@/domain/universe'
import type { ChallengeLevel } from '@/domain/learner'
import { useFamilyStore } from '@/store/familyStore'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { seededRandom } from '@/lib/random'
import { en } from '@/i18n/locales/en'
import { ru } from '@/i18n/locales/ru'
import { uz } from '@/i18n/locales/uz'
import { canOpen, FREE_EXPLORE, FREE_GAMES, isPremium } from './access'
import {
  CITIES,
  CITY_IDS,
  EXPLORE,
  EXPLORE_IDS,
  FOOD_IDS,
  FOODS,
  isFood,
  isLandmark,
  LANDMARK_IDS,
  MOTIF_IDS,
  MOTIF_NAMES,
  OTHERS,
  TABLE_TEXT,
  type Text,
} from './content'
import { UZ_MODELS } from './explorerModels'
import {
  askText,
  borderLength,
  buildMapRounds,
  buildPatternRounds,
  buildTableRounds,
  GAME_KINDS,
  mapPlan,
  patternChoices,
  patternTier,
  runResult,
  uzbekistanActivity,
} from './generators'
import { cityPoint, MAP_HEIGHT, MAP_WIDTH } from './geo'

const LEVELS: ChallengeLevel[] = [1, 2, 3, 4, 5]

function checkText(text: Text, where: string) {
  for (const language of LANGUAGES) {
    expect(text[language].trim(), `${where} ${language}`).not.toBe('')
  }
  // Uzbek Latin only: no Cyrillic, and o‘ / g‘ with the proper sign
  expect(text.uz, where).not.toMatch(/[А-Яа-яЁёЎўҚқҒғҲҳ]/)
  expect(text.uz, where).not.toMatch(/[oOgG]['`ʻ’]/)
  // Russian is written in Cyrillic, English has no Cyrillic
  expect(text.ru, where).toMatch(/[А-Яа-яЁё]/)
  expect(text.en, where).not.toMatch(/[А-Яа-яЁё]/)
}

describe('content', () => {
  it('every explore card has a name, a tag and exactly three facts in three languages', () => {
    expect(EXPLORE_IDS).toHaveLength(8)
    for (const id of EXPLORE_IDS) {
      const item = EXPLORE[id]
      expect(item.id).toBe(id)
      checkText(item.name, `${id} name`)
      checkText(item.tag, `${id} tag`)
      expect(item.facts).toHaveLength(3)
      item.facts.forEach((fact, index) => checkText(fact, `${id} fact ${index}`))
    }
  })

  it('every landmark has 2–3 hotspots with labels in every language, and a still', () => {
    for (const id of LANDMARK_IDS) {
      const item = EXPLORE[id]
      expect(item.hotspots.length).toBeGreaterThanOrEqual(2)
      expect(item.hotspots.length).toBeLessThanOrEqual(3)
      for (const spot of item.hotspots) {
        checkText(spot.text, `${id}.${spot.id}`)
        for (const locale of [uz, ru, en]) {
          const labels = locale.uzbekistan.hotspots[id] as Record<string, string>
          expect(labels[spot.id], `${id}.${spot.id}`).toBeTruthy()
        }
        expect(spot.position.every((n) => Math.abs(n) < 3)).toBe(true)
      }
      const model = UZ_MODELS[id]
      expect(model.still).toBe(`/3d/worlds/uz-${id}.webp`)
      expect(model.hotspots?.map((h) => h.labelKey)).toEqual(
        item.hotspots.map((h) => `uzbekistan.hotspots.${id}.${h.id}`),
      )
    }
    for (const id of EXPLORE_IDS.filter((x) => !isLandmark(x))) {
      expect(EXPLORE[id].picture).toBeTruthy()
    }
  })

  it('cities, foods, things and motifs are named in three languages', () => {
    for (const id of CITY_IDS) {
      const city = CITIES[id]
      for (const key of ['name', 'find', 'where', 'clue'] as const)
        checkText(city[key], `${id}.${key}`)
      // a clue never says the city's name
      for (const language of LANGUAGES) {
        expect(city.clue[language]).not.toContain(city.name[language])
      }
    }
    for (const id of FOOD_IDS) {
      checkText(FOODS[id].label, id)
      checkText(FOODS[id].inList, id)
    }
    for (const thing of Object.values(OTHERS)) {
      checkText(thing.label, thing.id)
      checkText(thing.why, thing.id)
    }
    for (const id of MOTIF_IDS) checkText(MOTIF_NAMES[id], id)
    for (const [key, text] of Object.entries(TABLE_TEXT)) checkText(text, key)
  })

  it('cities sit roughly where they are and keep 48 px apart on a 288 px wide map', () => {
    const minUnits = 48 / (288 / MAP_WIDTH)
    for (const id of CITY_IDS) {
      const city = CITIES[id]
      // nudged by less than a degree and a half
      expect(Math.hypot(city.mapLon - city.lon, city.mapLat - city.lat), id).toBeLessThan(1.5)
      const { x, y } = cityPoint(id)
      expect(x).toBeGreaterThan(0)
      expect(x).toBeLessThan(MAP_WIDTH)
      expect(y).toBeGreaterThan(0)
      expect(y).toBeLessThan(MAP_HEIGHT)
      for (const other of CITY_IDS) {
        if (other === id) continue
        const b = cityPoint(other)
        expect(Math.hypot(x - b.x, y - b.y), `${id}–${other}`).toBeGreaterThanOrEqual(minUnits)
      }
    }
    // west to east: Nukus and Khiva, Bukhara, Samarkand, Tashkent, Fergana
    const x = (id: (typeof CITY_IDS)[number]) => cityPoint(id).x
    expect(x('xiva')).toBeLessThan(x('buxoro'))
    expect(x('buxoro')).toBeLessThan(x('samarqand'))
    expect(x('samarqand')).toBeLessThan(x('toshkent'))
    expect(x('toshkent')).toBeLessThan(x('fargona'))
  })

  it('UI strings exist in every language', () => {
    for (const locale of [uz, ru, en]) {
      for (const kind of GAME_KINDS) expect(locale.uzbekistan.games[kind].title).toBeTruthy()
      expect(locale.universe.buildings['uzbekistan-gate']).toBeTruthy()
    }
  })
})

describe('generators', () => {
  it('activity ids name the kind and the tier', () => {
    expect(uzbekistanActivity('map', 1)).toBe('uzbekistan:map:basic')
    expect(uzbekistanActivity('map', 2)).toBe('uzbekistan:map:basic')
    expect(uzbekistanActivity('map', 3)).toBe('uzbekistan:map:mid')
    expect(uzbekistanActivity('map', 4)).toBe('uzbekistan:map:clue')
    expect(uzbekistanActivity('map', 5)).toBe('uzbekistan:map:expert')
    expect(uzbekistanActivity('table', 3)).toBe('uzbekistan:table:named')
    expect(uzbekistanActivity('table', 5)).toBe('uzbekistan:table:category')
    expect(uzbekistanActivity('patterns', 4)).toBe('uzbekistan:patterns:full')
  })

  it('map rounds follow the level', () => {
    for (const level of LEVELS) {
      const plan = mapPlan(level)
      for (let seed = 1; seed < 20; seed += 1) {
        const rounds = buildMapRounds(level, seededRandom(seed))
        expect(rounds).toHaveLength(plan.rounds)
        expect(new Set(rounds.map((r) => r.answer)).size).toBe(plan.rounds)
        for (const round of rounds) {
          expect(round.cities).toHaveLength(plan.citiesShown)
          expect(round.cities).toContain(round.answer)
          expect(round.labels).toBe(level < 5)
        }
      }
    }
    expect(mapPlan(1).prompt).toBe('find')
    expect(mapPlan(3).prompt).toBe('where')
    expect(mapPlan(4).prompt).toBe('clue')
  })

  it('table rounds: only targets complete a round; L1–2 asks for food, L3 names foods, L4–5 groups', () => {
    for (const level of LEVELS) {
      for (let seed = 1; seed < 20; seed += 1) {
        const rounds = buildTableRounds(level, seededRandom(seed))
        expect(rounds).toHaveLength(3)
        for (const round of rounds) {
          expect(round.targets.every((id) => round.items.includes(id))).toBe(true)
          expect(new Set(round.items).size).toBe(round.items.length)
          expect(round.items.some((id) => !round.targets.includes(id))).toBe(true)
          if (level <= 2) {
            expect(round.ask.kind).toBe('allFood')
            expect(round.targets.every(isFood)).toBe(true)
            expect(round.items.filter((id) => !isFood(id))).toHaveLength(2)
          } else if (level === 3) {
            expect(round.ask.kind).toBe('named')
          }
          if (round.ask.kind === 'group') {
            const group = round.ask.group
            expect(round.targets.every((id) => isFood(id) && FOODS[id].group === group)).toBe(true)
            // every food of the group is on the tray
            expect(round.targets).toHaveLength(
              FOOD_IDS.filter((f) => FOODS[f].group === group).length,
            )
          }
        }
        if (level >= 4)
          expect(rounds.map((r) => r.ask.kind).sort()).toEqual(['group', 'group', 'named'])
      }
    }
  })

  it('table prompts name the asked foods with the right grammar', () => {
    const round = {
      id: 't',
      ask: { kind: 'named', foods: ['non', 'choy', 'anor'] },
      items: [],
      targets: [],
    } as const
    expect(askText(round, 'uz')).toBe('Dasturxonga non, choy va anor qo‘y!')
    expect(askText(round, 'ru')).toBe('Положи на дастархан лепёшку, чай и гранат!')
    expect(askText(round, 'en')).toBe('Put the bread, the tea and a pomegranate on the dasturxon!')
  })

  it('pattern rounds continue a real repeating unit, harder with the level', () => {
    for (const level of LEVELS) {
      const tier = patternTier(level)
      for (let seed = 1; seed < 30; seed += 1) {
        for (const round of buildPatternRounds(level, seededRandom(seed))) {
          expect(round.cells).toHaveLength(borderLength(round.unit))
          expect(round.choices).toHaveLength(patternChoices(tier))
          expect(new Set(round.choices).size).toBe(round.choices.length)
          expect(round.choices).toContain(round.answer)
          const gap = round.cells.indexOf(null)
          expect(round.cells.filter((c) => c === null)).toHaveLength(1)
          if (tier !== 'expert') expect(gap).toBe(round.cells.length - 1)
          else expect(gap).toBeGreaterThanOrEqual(round.unit.length)
          // the answer is the motif of the same letter one unit earlier or later
          const twin = gap >= round.unit.length ? gap - round.unit.length : gap + round.unit.length
          expect(round.cells[twin]).toBe(round.answer)
          if (level <= 2) expect(['AB', 'AAB']).toContain(round.unit)
          if (level >= 4) expect(round.unit.length).toBeGreaterThanOrEqual(3)
        }
      }
    }
  })

  it('a run reports every round solved and counts first tries as independent', () => {
    expect(runResult([true, false, true])).toEqual({ correct: 3, total: 3, independent: 2 })
  })
})

describe('free and PRO', () => {
  beforeEach(() => {
    useSubscriptionStore.getState().cancel()
    useFamilyStore.setState({ children: [], activeChildId: null })
  })

  it('the map, the dasturxon and two landmarks are free; the rest needs PRO', () => {
    expect(FREE_GAMES).toEqual(['map', 'table'])
    expect(FREE_EXPLORE.filter((id) => isLandmark(id))).toHaveLength(2)
    expect(isPremium({ type: 'game', id: 'patterns' })).toBe(true)
    expect(isPremium({ type: 'explore', id: 'ark' })).toBe(true)
    expect(isPremium({ type: 'explore', id: 'registan' })).toBe(false)
  })

  it('premium items open only with an active plan for a child profile', () => {
    expect(canOpen({ type: 'game', id: 'map' })).toBe(true)
    expect(canOpen({ type: 'game', id: 'patterns' })).toBe(false)
    const child = useFamilyStore
      .getState()
      .addChild({ name: 'Ali', birthDate: '2020-01-01', gender: 'boy' })
    useFamilyStore.getState().setActiveChild(child.id)
    expect(canOpen({ type: 'explore', id: 'doppi' })).toBe(false)
    useSubscriptionStore.getState().activatePlan('monthly', 'payment')
    expect(canOpen({ type: 'explore', id: 'doppi' })).toBe(true)
    expect(canOpen({ type: 'game', id: 'patterns' })).toBe(true)
  })
})

describe('universe wiring', () => {
  it('the world is open on the map with its games, each showing its own best', () => {
    const world = WORLDS.find((w) => w.id === 'uzbekistan')!
    expect(world.comingSoon).toBeFalsy()
    const map = adventureState(60, { 'uzbekistan:map:basic': 2, 'uzbekistan:patterns:mid': 3 })
    const uzb = map.find((w) => w.id === 'uzbekistan')!
    expect(uzb.activities.map((a) => [a.route, a.bestStars, a.open])).toEqual([
      ['/worlds/uzbekistan', 3, true],
      ['/worlds/uzbekistan/map', 2, true],
      ['/worlds/uzbekistan/table', 0, true],
      ['/worlds/uzbekistan/patterns', 3, true],
    ])
    expect(BUILDINGS.find((b) => b.id === 'uzbekistan-gate')?.route).toBe('/worlds/uzbekistan')
  })
})

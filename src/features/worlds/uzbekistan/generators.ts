import type { Language } from '@/content/languages'
import type { ChallengeLevel } from '@/domain/learner/profile'
import type { Strand } from '@/domain/universe/types'
import { shuffle, type RandomSource } from '@/lib/random'
import {
  CITY_IDS,
  FOOD_IDS,
  FOODS,
  joinList,
  MOTIF_IDS,
  OTHER_IDS,
  TABLE_TEXT,
  type CityId,
  type FoodGroup,
  type FoodId,
  type MotifId,
  type OtherId,
  type TableItemId,
} from './content'

/*
 * Pure logic of the three scored games of "My Uzbekistan": what a challenge
 * level means for each, the rounds of one run and the activity id.
 *
 * Map (strand 'language'):
 *   L1–2 basic  – three cities on the map, "Find Samarkand!" with a picture.
 *   L3   mid    – all six cities, "Where is the Registan?" (a landmark, not a name).
 *   L4   clue   – all six, a clue sentence (no name) and a picture.
 *   L5   expert – the same clues, and the map shows dots without names
 *                (the name appears once a dot is tapped).
 * Dasturxon (strand 'language'):
 *   L1–2 basic    – put the food on the table, not the toys (3 foods, 2 things).
 *   L3   named    – "Put non, tea and a pomegranate": only the foods named.
 *   L4–5 category – "all the fruit", "what is baked in the tandir".
 * Patterns (strand 'logic'): continue a suzani / atlas border.
 *   L1–2 basic  – AB / AAB, three choices.
 *   L3   mid    – ABC, AAB, ABB, three choices.
 *   L4   full   – ABCD, AABB, ABBC, AABC, four choices.
 *   L5   expert – the same units, the gap may be in the middle of the border.
 * Age never locks anything; the level only chooses the content.
 */

export const GAME_KINDS = ['map', 'table', 'patterns'] as const
export type GameKind = (typeof GAME_KINDS)[number]

export function isGameKind(value: string | undefined): value is GameKind {
  return (GAME_KINDS as readonly string[]).includes(value ?? '')
}

export const GAME_STRAND: Readonly<Record<GameKind, Strand>> = {
  map: 'language',
  table: 'language',
  patterns: 'logic',
}

export type MapTier = 'basic' | 'mid' | 'clue' | 'expert'
export type TableTier = 'basic' | 'named' | 'category'
export type PatternTier = 'basic' | 'mid' | 'full' | 'expert'

export function mapTier(level: ChallengeLevel): MapTier {
  if (level <= 2) return 'basic'
  if (level === 3) return 'mid'
  return level === 4 ? 'clue' : 'expert'
}

export function tableTier(level: ChallengeLevel): TableTier {
  if (level <= 2) return 'basic'
  return level === 3 ? 'named' : 'category'
}

export function patternTier(level: ChallengeLevel): PatternTier {
  if (level <= 2) return 'basic'
  if (level === 3) return 'mid'
  return level === 4 ? 'full' : 'expert'
}

export function gameTier(kind: GameKind, level: ChallengeLevel): string {
  if (kind === 'map') return mapTier(level)
  if (kind === 'table') return tableTier(level)
  return patternTier(level)
}

/** The activity id: `uzbekistan:<kind>:<tier>`, e.g. `uzbekistan:map:basic`. */
export function uzbekistanActivity(kind: GameKind, level: ChallengeLevel): string {
  return `uzbekistan:${kind}:${gameTier(kind, level)}`
}

/**
 * What a finished run reports: every round ends solved (`correct` = total);
 * `independent` counts the rounds solved without a wrong try.
 */
export function runResult(firstTries: readonly boolean[]) {
  const total = firstTries.length
  return { correct: total, total, independent: firstTries.filter(Boolean).length }
}

// ---------------------------------------------------------------------- map

export type MapPrompt = 'find' | 'where' | 'clue'

export interface MapRound {
  id: string
  answer: CityId
  /** The cities drawn on the map this round (always includes the answer). */
  cities: readonly CityId[]
  prompt: MapPrompt
  /** Names next to the dots (off at L5 until a dot is tapped). */
  labels: boolean
}

export interface MapPlan {
  tier: MapTier
  rounds: number
  citiesShown: number
  prompt: MapPrompt
  labels: boolean
}

export function mapPlan(level: ChallengeLevel): MapPlan {
  const tier = mapTier(level)
  if (tier === 'basic') return { tier, rounds: 4, citiesShown: 3, prompt: 'find', labels: true }
  if (tier === 'mid') return { tier, rounds: 5, citiesShown: 6, prompt: 'where', labels: true }
  if (tier === 'clue') return { tier, rounds: 6, citiesShown: 6, prompt: 'clue', labels: true }
  return { tier, rounds: 6, citiesShown: 6, prompt: 'clue', labels: false }
}

export function buildMapRounds(level: ChallengeLevel, random: RandomSource = Math.random) {
  const plan = mapPlan(level)
  const answers = shuffle(CITY_IDS, random).slice(0, plan.rounds)
  return answers.map((answer, index): MapRound => {
    const others = shuffle(
      CITY_IDS.filter((city) => city !== answer),
      random,
    ).slice(0, plan.citiesShown - 1)
    // drawn in a fixed order, so the answer's place does not give it away
    const shown = new Set<CityId>([answer, ...others])
    return {
      id: `map-${index}-${answer}`,
      answer,
      cities: CITY_IDS.filter((city) => shown.has(city)),
      prompt: plan.prompt,
      labels: plan.labels,
    }
  })
}

// ---------------------------------------------------------------- dasturxon

export type TableAsk =
  | { kind: 'allFood' }
  | { kind: 'named'; foods: readonly FoodId[] }
  | { kind: 'group'; group: Extract<FoodGroup, 'fruit' | 'tandir'> }

export interface TableRound {
  id: string
  ask: TableAsk
  /** Everything on the tray, in the order shown. */
  items: readonly TableItemId[]
  /** What belongs on the table this round. */
  targets: readonly TableItemId[]
}

export const TABLE_ROUNDS = 3

const foodsOf = (group: FoodGroup) => FOOD_IDS.filter((food) => FOODS[food].group === group)

export function buildTableRounds(
  level: ChallengeLevel,
  random: RandomSource = Math.random,
): TableRound[] {
  const tier = tableTier(level)
  const rounds: TableRound[] = []
  const pickOthers = (count: number): OtherId[] => shuffle(OTHER_IDS, random).slice(0, count)

  if (tier === 'basic') {
    // every round shows other foods, so the child sees most of the table
    const foods = shuffle(FOOD_IDS, random)
    for (let index = 0; index < TABLE_ROUNDS; index += 1) {
      const targets = [0, 1, 2].map((offset) => foods[(index * 3 + offset) % foods.length]!)
      rounds.push({
        id: `table-${index}`,
        ask: { kind: 'allFood' },
        targets,
        items: shuffle([...targets, ...pickOthers(2)], random),
      })
    }
    return rounds
  }

  if (tier === 'named') {
    for (let index = 0; index < TABLE_ROUNDS; index += 1) {
      const foods = shuffle(FOOD_IDS, random)
      const targets = foods.slice(0, 3)
      const extra = foods.slice(3, 5)
      rounds.push({
        id: `table-${index}`,
        ask: { kind: 'named', foods: targets },
        targets,
        items: shuffle([...targets, ...extra, ...pickOthers(1)], random),
      })
    }
    return rounds
  }

  const asks: TableAsk[] = shuffle<TableAsk>(
    [
      { kind: 'group', group: 'fruit' },
      { kind: 'group', group: 'tandir' },
    ],
    random,
  )
  // the third round names four foods: a longer sentence to listen to
  asks.push({ kind: 'named', foods: shuffle(FOOD_IDS, random).slice(0, 4) })
  asks.forEach((ask, index) => {
    const targets: FoodId[] =
      ask.kind === 'group' ? foodsOf(ask.group) : ask.kind === 'named' ? [...ask.foods] : []
    const rest = shuffle(
      FOOD_IDS.filter((food) => !targets.includes(food)),
      random,
    ).slice(0, 2)
    rounds.push({
      id: `table-${index}`,
      ask,
      targets,
      items: shuffle([...targets, ...rest, ...pickOthers(1)], random),
    })
  })
  return rounds
}

/** The sentence of a table round, e.g. "Put non, tea and a pomegranate on the dasturxon!". */
export function askText(round: TableRound, language: Language): string {
  const { ask } = round
  if (ask.kind === 'allFood') return TABLE_TEXT.allFood[language]
  if (ask.kind === 'group') return TABLE_TEXT[ask.group][language]
  const list = joinList(
    ask.foods.map((food) => FOODS[food].inList[language]),
    language,
  )
  return TABLE_TEXT.named[language].replace('{{list}}', list)
}

// ----------------------------------------------------------------- patterns

export interface PatternRound {
  id: string
  /** The border, with `null` at the gap. */
  cells: readonly (MotifId | null)[]
  answer: MotifId
  choices: readonly MotifId[]
  /** The repeating unit, e.g. 'AAB' (for tests and the parent's eyes). */
  unit: string
}

export const PATTERN_ROUNDS = 5

const UNITS: Readonly<Record<PatternTier, readonly string[]>> = {
  basic: ['AB', 'AB', 'AAB'],
  mid: ['ABC', 'AAB', 'ABB'],
  full: ['ABCD', 'AABB', 'ABBC', 'AABC'],
  expert: ['ABCD', 'AABB', 'ABBC', 'AABC', 'ABC'],
}

export function patternChoices(tier: PatternTier): 3 | 4 {
  return tier === 'basic' || tier === 'mid' ? 3 : 4
}

/** Cells of a border: two whole units and the next cell, at least five. */
export function borderLength(unit: string): number {
  return Math.max(5, unit.length * 2 + 1)
}

export function buildPatternRounds(
  level: ChallengeLevel,
  random: RandomSource = Math.random,
): PatternRound[] {
  const tier = patternTier(level)
  const units = UNITS[tier]
  const rounds: PatternRound[] = []
  for (let index = 0; index < PATTERN_ROUNDS; index += 1) {
    const unit = units[Math.floor(random() * units.length)]!
    const letters = [...new Set(unit.split(''))]
    const motifs = shuffle(MOTIF_IDS, random)
    const motifOf = (letter: string) => motifs[letters.indexOf(letter)]!
    const length = borderLength(unit)
    const full = Array.from({ length }, (_, i) => motifOf(unit[i % unit.length]!))
    // the gap: the last cell, or (L5) any cell after the first whole unit
    const gap =
      tier === 'expert' && random() < 0.6
        ? unit.length + Math.floor(random() * (length - unit.length))
        : length - 1
    const answer = full[gap]!
    const used = letters.map(motifOf).filter((motif) => motif !== answer)
    const unused = motifs.filter((motif) => motif !== answer && !used.includes(motif))
    const wrong = [...shuffle(used, random), ...unused].slice(0, patternChoices(tier) - 1)
    rounds.push({
      id: `pattern-${index}`,
      cells: full.map((motif, i) => (i === gap ? null : motif)),
      answer,
      choices: shuffle([answer, ...wrong], random),
      unit,
    })
  }
  return rounds
}

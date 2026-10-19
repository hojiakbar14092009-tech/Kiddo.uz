import type { Language } from '@/content/languages'
import { stageKey, type LearnChild } from '@/features/learn/learnStore'
import { sample, shuffle, type Rng } from '@/features/learn/random'
import { mixWithReview, notSameOrder } from '@/features/learn/review'
import { testLength } from '@/features/learn/session'
import { GARDEN_ITEMS, type Category, type GardenTask } from './content'

/** A child's level: 4, 5 or 6 (a guest plays as 6). */
export type AgeLevel = 4 | 5 | 6

/** How many things are in the garden: fewer for the youngest. */
export const OBJECTS_BY_LEVEL: Record<AgeLevel, number> = { 4: 4, 5: 6, 6: 8 }

/** Things that could be argued about in a group ("is a strawberry a fruit?") never stand next to one. */
const AMBIGUOUS = new Set(['strawberry', 'mushroom'])

const things = GARDEN_ITEMS.filter((item) => !item.animal)
const animals = GARDEN_ITEMS.filter((item) => item.animal)
const CATEGORIES: Category[] = ['flower', 'fruit', 'vegetable']

/** Every task a child of this age can get. */
export function taskPool(level: AgeLevel): GardenTask[] {
  const find = (asset: string): GardenTask => ({
    id: `find:${asset}`,
    kind: 'find',
    skill: 'find',
    target: asset,
    count: 1,
  })
  const where = (asset: string): GardenTask => ({
    id: `where:${asset}`,
    kind: 'where',
    skill: 'where',
    target: asset,
    count: 1,
  })
  const count = (asset: string, n: number): GardenTask => ({
    id: `count${n}:${asset}`,
    kind: 'count',
    skill: `count-${n}`,
    target: asset,
    count: n,
  })
  const category = (cat: Category): GardenTask => ({
    id: `category3:${cat}`,
    kind: 'category',
    skill: `category-${cat}`,
    target: GARDEN_ITEMS.find((item) => item.category === cat)!.asset,
    category: cat,
    count: 3,
  })

  const base = [
    ...things.map((item) => find(item.asset)),
    ...animals.map((item) => where(item.asset)),
  ]
  if (level === 4) return base
  if (level === 5) return [...base, ...things.map((item) => count(item.asset, 2))]
  return [
    ...things.map((item) => find(item.asset)),
    ...things.map((item) => count(item.asset, 2)),
    ...things.map((item) => count(item.asset, 3)),
    ...CATEGORIES.map(category),
  ]
}

export interface GardenObject {
  /** Unique on the board (the same picture can be there twice). */
  key: string
  asset: string
  /** One of the things the task asks for. */
  target: boolean
}

function inCategory(asset: string, category: Category | undefined): boolean {
  return GARDEN_ITEMS.find((item) => item.asset === asset)?.category === category
}

/** Lays out the garden for a task: the right things plus different others, all visible. */
export function buildBoard(
  task: GardenTask,
  level: AgeLevel,
  rng: Rng = Math.random,
): GardenObject[] {
  const total = Math.max(OBJECTS_BY_LEVEL[level], task.count + 2)
  let targets: string[]
  if (task.kind === 'category') {
    const members = GARDEN_ITEMS.filter((item) => item.category === task.category).map(
      (i) => i.asset,
    )
    targets = sample(members, task.count, rng)
  } else {
    targets = Array.from({ length: task.count }, () => task.target)
  }
  const others = GARDEN_ITEMS.map((item) => item.asset).filter((asset) =>
    task.kind === 'category'
      ? !inCategory(asset, task.category) && !AMBIGUOUS.has(asset)
      : asset !== task.target,
  )
  const distractors = sample(others, total - targets.length, rng)
  return shuffle(
    [
      ...targets.map((asset, i) => ({ key: `${asset}#t${i}`, asset, target: true })),
      ...distractors.map((asset, i) => ({ key: `${asset}#d${i}`, asset, target: false })),
    ],
    rng,
  )
}

export interface BoardState {
  /** Keys of the right things already tapped (each counts once). */
  found: readonly string[]
  mistakes: number
}

export type TapResult = 'found' | 'already' | 'wrong' | 'done' | 'over'

export const START: BoardState = { found: [], mistakes: 0 }

/**
 * A tap on the board. A right thing is marked and counted once (tapping it
 * again changes nothing); a different thing is a mistake.
 */
export function tap(
  board: readonly GardenObject[],
  state: BoardState,
  key: string,
  needed: number,
): { state: BoardState; result: TapResult } {
  if (state.found.length >= needed) return { state, result: 'over' }
  const object = board.find((candidate) => candidate.key === key)
  if (!object) return { state, result: 'over' }
  if (!object.target) return { state: { ...state, mistakes: state.mistakes + 1 }, result: 'wrong' }
  if (state.found.includes(key)) return { state, result: 'already' }
  const found = [...state.found, key]
  return { state: { ...state, found }, result: found.length >= needed ? 'done' : 'found' }
}

/** The tasks of one session: a little review of what was hard, never the same order twice. */
export function pickTasks(
  level: AgeLevel,
  language: Language,
  learn: LearnChild,
  rng: () => number = Math.random,
): GardenTask[] {
  const picked = mixWithReview(
    taskPool(level),
    (task) => task.skill,
    learn,
    'garden',
    language,
    testLength(level),
    rng,
    (task) => task.id,
  )
  return notSameOrder(
    picked,
    (task) => task.id,
    learn.lastOrder[sessionOrderKey(language, level)],
    rng,
  )
}

export const sessionOrderKey = (language: Language, level: AgeLevel) =>
  `${stageKey('garden', language)}|${level}`

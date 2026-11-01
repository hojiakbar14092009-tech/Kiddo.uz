import { useMemo } from 'react'
import { GUEST_KEY } from '@/domain/childKey'
import { spendCoins, wasRewarded } from '@/domain/rewards/rewardStore'
import { useChildKey, useProgressStore } from '@/store/progressStore'
import { nutValue } from './nuts'
import {
  EMPTY_BALANCES,
  emitUniverse,
  refreshIfStale,
  reloadFromOtherTabs,
  setBuildingLevel,
  universeChild,
  useUniverseStore,
} from './store'
import type { ResourceId, Wallet } from './types'

/*
 * Kiddo City, data-driven. Every learning building is built and open at
 * level 0: core learning is never locked. A discovery place (`opensWith`)
 * opens when the connected world says so. Levels 1–3 are upgrades that change how
 * the building looks; they cost yong‘oq (nuts) and may need a number of stars
 * earned (stars are a measure, never spent).
 *
 * `cost` keeps the server's price list (building_costs: crystals, workshops
 * also parts); the price in nuts is that cost at the fixed rate (nuts.ts:
 * 10 / 15, 20 / 30, 30 / 45), which the server checks the same way (0017).
 */

export interface BuildingLevel {
  cost: Partial<Record<ResourceId, number>>
  starsNeeded?: number
}

export interface BuildingDef {
  id: string
  nameKey: string
  /** public/3d/<icon3d>.webp */
  icon3d: string
  route: string
  /** levels[0] is the free, open building; the rest are upgrades. */
  levels: BuildingLevel[]
  /**
   * A place the connected world opens (progression/content.ts UNLOCKS): shown
   * closed, with what opens it, until then. Learning buildings never have one.
   */
  opensWith?: string
}

function upgrades(workshop: boolean): BuildingLevel[] {
  const parts = (count: number) => (workshop ? { part: count } : {})
  return [
    { cost: {} },
    { cost: { crystal: 1, ...parts(1) } },
    { cost: { crystal: 2, ...parts(2) }, starsNeeded: 10 },
    { cost: { crystal: 3, ...parts(3) }, starsNeeded: 25 },
  ]
}

function building(
  id: string,
  icon3d: string,
  route: string,
  workshop = false,
  opensWith?: string,
): BuildingDef {
  return {
    id,
    nameKey: `universe.buildings.${id}`,
    icon3d,
    route,
    levels: upgrades(workshop),
    ...(opensWith ? { opensWith } : {}),
  }
}

export const BUILDINGS: readonly BuildingDef[] = [
  // Math Land opens the adaptive Math Lab, which links to the step-by-step lessons
  building('math-land', 'school', '/math-lab'),
  building('reading-house', 'house', '/alphabet'),
  building('word-workshop', 'pencil', '/learn/words', true),
  building('writing-school', 'notebook', '/trace'),
  building('observatory', 'telescope', '/learn/space'),
  // the rocket: built with nuts, it flies to Mars (the first journey)
  building('spaceport', 'rocket', '/spaceport', true),
  // the Story Engine's library; it links on to the classic tales
  building('story-library', 'book', '/stories'),
  building('garden', 'garden-house', '/learn/garden'),
  // practice plants from the learning memory, and the bed for the Mars seed
  building('mistake-garden', 'seedling', '/mistake-garden'),
  building('robot-workshop', 'clock', '/learn/help', true),
  // opens when the Mars flower blooms (a place to discover, not a lesson)
  building('science-lab', 'blossom', '/science-lab', false, 'science-lab'),
  building('art-studio', 'paintbrush', '/studio'),
  // Emotions & Social Skills: open at level 0 like every building, first upgrade 10 nuts
  building('friendship-house', 'teddy', '/feelings'),
  // The Dinosaur world: explore in 3D, dig up bones, a quiz
  building('dino-park', 'dinosaur', '/worlds/dino'),
  // "My Uzbekistan": its picture is the Registon model's still
  building('uzbekistan-gate', 'worlds/uz-registan', '/worlds/uzbekistan'),
  building('shop', 'gift', '/shop'),
  building('museum', 'castle', '/collection'),
]

export function findBuilding(id: string): BuildingDef | undefined {
  return BUILDINGS.find((item) => item.id === id)
}

export interface BuildingView {
  id: string
  nameKey: string
  icon3d: string
  route: string
  level: number
  maxLevel: number
  /** Not opened yet by the connected world (`opensWith`); it cannot be upgraded. */
  locked: boolean
  /**
   * The next upgrade: its price in nuts and what is still missing for it
   * ('nut' = nuts to earn, 'star' = stars to earn); null at max.
   */
  next: {
    cost: { nut: number }
    missing: Partial<Record<'nut' | 'star', number>>
  } | null
}

/** The price of a level in nuts. */
export function levelPrice(level: BuildingLevel): number {
  return nutValue(level.cost)
}

/** Pure: a building as the city shows it. */
export function buildingView(
  def: BuildingDef,
  level: number,
  wallet: Wallet,
  unlocked: Readonly<Record<string, string>> = {},
): BuildingView {
  const maxLevel = def.levels.length - 1
  const current = Math.min(Math.max(0, level), maxLevel)
  const locked = def.opensWith !== undefined && !(def.opensWith in unlocked)
  const upgrade = locked ? undefined : def.levels[current + 1]
  let next: BuildingView['next'] = null
  if (upgrade) {
    const price = levelPrice(upgrade)
    const missing: Partial<Record<'nut' | 'star', number>> = {}
    const nutLack = price - (wallet.nut ?? 0)
    if (nutLack > 0) missing.nut = nutLack
    const starLack = (upgrade.starsNeeded ?? 0) - (wallet.star ?? 0)
    if (starLack > 0) missing.star = starLack
    next = { cost: { nut: price }, missing }
  }
  return {
    id: def.id,
    nameKey: def.nameKey,
    icon3d: def.icon3d,
    route: def.route,
    level: current,
    maxLevel,
    locked,
    next,
  }
}

export type UpgradeResult = 'ok' | 'missing' | 'max' | 'locked'

/** The ref an upgrade is paid under (the server checks the same: 0010, 0017). */
export const upgradeRef = (id: string, level: number) => `upgrade|${id}|${level}`

/** The child's wallet: resource balances plus nuts. */
export function walletOf(childKey: string): Wallet {
  return {
    ...universeChild(childKey).balances,
    nut: useProgressStore.getState().byChild[childKey]?.coins ?? 0,
  }
}

/**
 * Upgrades a building one level: pays its price in nuts once (ref
 * `upgrade|<id>|<level>`) and emits `building.upgraded`. Unknown ids answer 'max'.
 */
export function upgradeBuilding(childKey: string, id: string): UpgradeResult {
  const def = findBuilding(id)
  if (!def || !childKey) return 'max'
  refreshIfStale(childKey)
  // another tab may have spent or bought just now: read the saved nuts first
  // (localStorage is synchronous, so the stores are current before paying)
  if (childKey !== GUEST_KEY) {
    void reloadFromOtherTabs('kiddo.rewards')
    void reloadFromOtherTabs('kiddo.progress')
  }
  const child = universeChild(childKey)
  const view = buildingView(
    def,
    child.buildings[id] ?? 0,
    walletOf(childKey),
    child.progress?.unlocked,
  )
  if (view.locked) return 'locked'
  if (!view.next) return 'max'
  const level = view.level + 1
  const ref = upgradeRef(id, level)
  // paid before (another tab, a half-finished upgrade): the level only catches
  // up, whatever the nuts are now; the stars still have to be there
  if (wasRewarded(childKey, 'purchase', ref)) {
    if (view.next.missing.star) return 'missing'
  } else {
    if (Object.keys(view.next.missing).length > 0) return 'missing'
    if (!spendCoins({ childKey, coins: view.next.cost.nut, refId: ref })) return 'missing'
  }
  setBuildingLevel(childKey, id, level)
  emitUniverse({ type: 'building.upgraded', childKey, id, level })
  return 'ok'
}

/** The city of the active child. */
export function useWorld(): { buildings: BuildingView[]; upgrade: (id: string) => UpgradeResult } {
  const childKey = useChildKey()
  const levels = useUniverseStore((s) => s.byChild[childKey]?.buildings)
  const balances = useUniverseStore((s) => s.byChild[childKey]?.balances ?? EMPTY_BALANCES)
  const nuts = useProgressStore((s) => s.byChild[childKey]?.coins ?? 0)
  const unlocked = useUniverseStore((s) => s.byChild[childKey]?.progress?.unlocked)
  return useMemo(
    () => ({
      buildings: BUILDINGS.map((def) =>
        buildingView(def, levels?.[def.id] ?? 0, { ...balances, nut: nuts }, unlocked),
      ),
      upgrade: (id: string) => upgradeBuilding(childKey, id),
    }),
    [levels, balances, nuts, unlocked, childKey],
  )
}

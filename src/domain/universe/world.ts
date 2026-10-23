import { useMemo } from 'react'
import { useChildKey } from '@/store/progressStore'
import {
  EMPTY_BALANCES,
  emitUniverse,
  refreshIfStale,
  setBuildingLevel,
  spendResources,
  universeChild,
  useUniverseStore,
} from './store'
import type { ResourceId } from './types'

/*
 * Kiddo City, data-driven. Every building is built and open at level 0:
 * core learning is never locked. Levels 1–3 are upgrades that change how
 * the building looks; they cost crystals (workshops also parts) and may need
 * a number of stars earned (stars are a measure, never spent).
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

function building(id: string, icon3d: string, route: string, workshop = false): BuildingDef {
  return { id, nameKey: `universe.buildings.${id}`, icon3d, route, levels: upgrades(workshop) }
}

export const BUILDINGS: readonly BuildingDef[] = [
  // Math Land opens the adaptive Math Lab, which links to the step-by-step lessons
  building('math-land', 'school', '/math-lab'),
  building('reading-house', 'house', '/alphabet'),
  building('word-workshop', 'pencil', '/learn/words', true),
  building('writing-school', 'notebook', '/trace'),
  building('observatory', 'telescope', '/learn/space'),
  building('story-library', 'book', '/learn/tales'),
  building('garden', 'garden-house', '/learn/garden'),
  building('robot-workshop', 'clock', '/learn/help', true),
  building('art-studio', 'paintbrush', '/studio'),
  // Emotions & Social Skills: open at level 0 like every building, first upgrade 1 crystal
  building('friendship-house', 'teddy', '/feelings'),
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
  /** The next upgrade and what is still missing for it ('star' = stars to earn); null at max. */
  next: {
    cost: Partial<Record<ResourceId, number>>
    missing: Partial<Record<ResourceId, number>>
  } | null
}

/** Pure: a building as the city shows it. */
export function buildingView(
  def: BuildingDef,
  level: number,
  balances: Readonly<Record<ResourceId, number>>,
): BuildingView {
  const maxLevel = def.levels.length - 1
  const current = Math.min(Math.max(0, level), maxLevel)
  const upgrade = def.levels[current + 1]
  let next: BuildingView['next'] = null
  if (upgrade) {
    const missing: Partial<Record<ResourceId, number>> = {}
    for (const [resource, amount] of Object.entries(upgrade.cost) as [ResourceId, number][]) {
      const lack = amount - (balances[resource] ?? 0)
      if (lack > 0) missing[resource] = lack
    }
    const starLack = (upgrade.starsNeeded ?? 0) - (balances.star ?? 0)
    if (starLack > 0) missing.star = starLack
    next = { cost: upgrade.cost, missing }
  }
  return {
    id: def.id,
    nameKey: def.nameKey,
    icon3d: def.icon3d,
    route: def.route,
    level: current,
    maxLevel,
    next,
  }
}

export type UpgradeResult = 'ok' | 'missing' | 'max'

/**
 * Upgrades a building one level: spends its cost once (refId
 * `upgrade|<id>|<level>`) and emits `building.upgraded`. Unknown ids answer 'max'.
 */
export function upgradeBuilding(childKey: string, id: string): UpgradeResult {
  const def = findBuilding(id)
  if (!def || !childKey) return 'max'
  refreshIfStale(childKey)
  const child = universeChild(childKey)
  const view = buildingView(def, child.buildings[id] ?? 0, child.balances)
  if (!view.next) return 'max'
  if (Object.keys(view.next.missing).length > 0) return 'missing'
  const level = view.level + 1
  const paid = spendResources({
    childKey,
    cost: view.next.cost,
    reason: 'upgrade',
    refId: `upgrade|${id}|${level}`,
  })
  if (!paid) return 'missing'
  setBuildingLevel(childKey, id, level)
  emitUniverse({ type: 'building.upgraded', childKey, id, level })
  return 'ok'
}

/** The city of the active child. */
export function useWorld(): { buildings: BuildingView[]; upgrade: (id: string) => UpgradeResult } {
  const childKey = useChildKey()
  const levels = useUniverseStore((s) => s.byChild[childKey]?.buildings)
  const balances = useUniverseStore((s) => s.byChild[childKey]?.balances ?? EMPTY_BALANCES)
  return useMemo(
    () => ({
      buildings: BUILDINGS.map((def) => buildingView(def, levels?.[def.id] ?? 0, balances)),
      upgrade: (id: string) => upgradeBuilding(childKey, id),
    }),
    [levels, balances, childKey],
  )
}

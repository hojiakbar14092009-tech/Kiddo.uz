import { stageRank, type GardenPlant } from '@/domain/garden'

/*
 * Which stage each plant had when the child last looked at the garden, kept
 * for this page's lifetime only (never saved, never authoritative): it only
 * decides whether a plant plays its growth sequence. The stage itself always
 * comes from the learning memory. A reload simply shows the garden as it is.
 */

const seen = new Map<string, Map<string, number>>()

/**
 * Plants that grew (or appeared, old rank 0) since the child last saw this
 * garden: skill key → old rank. Only an old rank ≥ 1 is growth to celebrate.
 */
export function grownSince(childKey: string, plants: readonly GardenPlant[]): Map<string, number> {
  const before = seen.get(childKey)
  const grown = new Map<string, number>()
  if (!before) return grown
  for (const plant of plants) {
    const old = before.get(plant.skillKey) ?? 0
    if (stageRank(plant.stage) > old) grown.set(plant.skillKey, old)
  }
  return grown
}

export function markSeen(childKey: string, plants: readonly GardenPlant[]): void {
  seen.set(childKey, new Map(plants.map((plant) => [plant.skillKey, stageRank(plant.stage)])))
}

/** Tests: forget what was seen. */
export function resetSeen(): void {
  seen.clear()
}

/** Did any plant grow from a stage the child had seen (not just a new seed)? */
export function anyGrew(grown: ReadonlyMap<string, number>): boolean {
  return [...grown.values()].some((old) => old >= 1)
}

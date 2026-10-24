import { useMemo } from 'react'
import { useChildMemory } from '@/domain/learningMemory/store'
import { gardenPlants, gardenSummary, type GardenPlant, type GardenSummary } from './garden'

/** A child's garden, recomputed only when that child's learning memory changes. */
export function useGarden(childKey: string): { plants: GardenPlant[]; summary: GardenSummary } {
  const memory = useChildMemory(childKey)
  return useMemo(() => {
    const plants = gardenPlants(memory.skills)
    return { plants, summary: gardenSummary(plants) }
  }, [memory.skills])
}

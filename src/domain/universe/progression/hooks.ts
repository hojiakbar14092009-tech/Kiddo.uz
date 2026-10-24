import { useEffect, useMemo } from 'react'
import { useChildKey } from '@/store/progressStore'
import { EMPTY_BALANCES, EMPTY_UNIVERSE_CHILD, useUniverseStore } from '../store'
import { FIRST_FLIGHT, type JourneyDef } from './content'
import {
  EMPTY_PROGRESS,
  journeyView,
  plotStage,
  projectedProgress,
  type JourneyView,
  type WorldProgress,
  type WorldSnapshot,
} from './engine'
import { discoverArtifact, plantSeed, syncProgression } from './service'

function useSnapshot(): { childKey: string; progress: WorldProgress; world: WorldSnapshot } {
  const childKey = useChildKey()
  const child = useUniverseStore((s) => s.byChild[childKey] ?? EMPTY_UNIVERSE_CHILD)
  // a child opened (app start, child switch): the stored world catches up with
  // what the rules say now, so the city and the pages agree
  useEffect(() => {
    syncProgression(childKey)
  }, [childKey])
  return useMemo(
    () => ({
      childKey,
      progress: child.progress ?? EMPTY_PROGRESS,
      world: {
        buildings: child.buildings,
        recent: child.recent ?? [],
        balances: { ...EMPTY_BALANCES, ...child.balances },
      },
    }),
    [childKey, child],
  )
}

/** A journey of the active child, step by step. */
export function useJourney(def: JourneyDef = FIRST_FLIGHT): JourneyView {
  const { progress, world } = useSnapshot()
  return useMemo(() => journeyView(def, progress, world), [def, progress, world])
}

export interface WorldProgressView {
  progress: WorldProgress
  isUnlocked: (id: string) => boolean
  isDiscovered: (id: string) => boolean
  /** -1: not planted; 0 … stages. */
  stageOf: (plot: string) => number
  seeds: number
  discover: (id: string) => ReturnType<typeof discoverArtifact>
  plant: (plot: string) => ReturnType<typeof plantSeed>
}

/** The opened places, finds and garden beds of the active child. */
export function useWorldProgress(): WorldProgressView {
  const { childKey, progress, world } = useSnapshot()
  return useMemo(() => {
    const now = projectedProgress(progress, world)
    return {
      progress: now,
      isUnlocked: (id) => id in now.unlocked,
      isDiscovered: (id) => id in now.discoveries,
      stageOf: (plot) => plotStage(now, plot),
      seeds: world.balances.seed ?? 0,
      discover: (id) => discoverArtifact(childKey, id),
      plant: (plot) => plantSeed(childKey, plot),
    }
  }, [childKey, progress, world])
}

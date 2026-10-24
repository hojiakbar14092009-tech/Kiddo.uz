import { useEffect, useMemo } from 'react'
import { useChildKey } from '@/store/progressStore'
import { EMPTY_BALANCES, EMPTY_UNIVERSE_CHILD, useUniverseStore } from '../store'
import { FIRST_FLIGHT, UNLOCKS, type JourneyDef } from './content'
import {
  EMPTY_PROGRESS,
  journeyView,
  plotStage,
  projectedProgress,
  type JourneyView,
  type WorldProgress,
  type WorldSnapshot,
} from './engine'
import { useGarden } from '@/domain/garden/hooks'
import { discoverArtifact, plantSeed, syncProgression } from './service'
import {
  conditionNeeds,
  mainQuest,
  smartQuests,
  worldState,
  type Need,
  type Quest,
  type SmartQuests,
  type WorldState,
} from './quests'

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

/** The active child's lasting world facts (rocket built, Mars open, flower, lab…). */
export function useWorldState(): WorldState {
  const { progress, world } = useSnapshot()
  return useMemo(() => worldState(progress, world), [progress, world])
}

/**
 * The active child's next adventure: the journey's current step and up to two
 * optional practice quests from the garden. Recomputed only when the child's
 * world or learning memory changes (memoized, never per render).
 */
export function useSmartQuests(def: JourneyDef = FIRST_FLIGHT): SmartQuests {
  const { childKey, progress, world } = useSnapshot()
  const { plants } = useGarden(childKey)
  return useMemo(
    () => smartQuests({ journey: def, view: journeyView(def, progress, world), world, plants }),
    [def, progress, world, plants],
  )
}

/** What a closed place still needs before it opens (from the unlock rules; empty when nothing to count). */
export function useUnlockNeeds(id: string): Need[] {
  const { world } = useSnapshot()
  return useMemo(() => {
    const unlock = UNLOCKS.find((item) => item.id === id)
    return unlock ? conditionNeeds(unlock.when, world) : []
  }, [id, world])
}

/**
 * The big journey and its current step as the main quest (with what it still
 * needs), from one computation; no learning-memory subscription.
 */
export function useMainQuest(def: JourneyDef = FIRST_FLIGHT): {
  view: JourneyView
  main: Quest | null
} {
  const { progress, world } = useSnapshot()
  return useMemo(() => {
    const view = journeyView(def, progress, world)
    return { view, main: mainQuest(def, view, world) }
  }, [def, progress, world])
}

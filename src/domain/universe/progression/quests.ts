import type { GardenPlant } from '@/domain/garden/garden'
import { findBuilding } from '../world'
import type { ResourceId } from '../types'
import { FIRST_FLIGHT, PLANT_STAGES, type Condition, type JourneyDef } from './content'
import {
  conditionMet,
  plotStage,
  projectedProgress,
  type JourneyView,
  type WorldProgress,
  type WorldSnapshot,
} from './engine'

/*
 * Smart Quest (Phase 18): which journey step is next, and what else is worth
 * doing, chosen by rules, never by chance and never by an AI. Pure: the
 * world's state in, at most one main quest and two optional quests out.
 *
 * - The main quest is the current step of the big journey (the progression
 *   engine decides which one; nothing here marks a step done).
 * - Optional quests never block the journey: today they are "help your
 *   plant grow" practice quests from the learning memory (Mistake Garden).
 * - Stable until done: the same state always gives the same quests, in the
 *   same order, so goals do not reshuffle.
 *
 * Quest state (what to do next) is derived; world state (what is true for
 * good) lives in the stored progress. Nothing here pays or stores anything.
 */

/** What is still missing for a step (a resource and how many). */
export interface Need {
  resource: ResourceId
  missing: number
}

export type QuestKind = 'main' | 'practice'

export interface Quest {
  /** Stable id: `main:<journey>|<step>`, `practice:<skill>`. */
  id: string
  kind: QuestKind
  /** A picture from public/3d. */
  icon: string
  /** i18n key of the short title (+ params). */
  titleKey: string
  titleParams?: Record<string, string | number>
  /** i18n key of the one-line explanation. */
  textKey: string
  textParams?: Record<string, string | number>
  /** Where the child goes to do it. */
  route: string
  /** Main quest: steps of the journey done / total. */
  progress?: { done: number; total: number }
  /** Main quest: what the step still needs (shown instead of a dead lock). */
  needs: Need[]
  /** Practice quest: the learning-memory skill (its plant). */
  skill?: string
}

export interface SmartQuests {
  main: Quest | null
  optional: Quest[]
}

/** At most this many optional quests next to the main one (no quest wall). */
export const MAX_OPTIONAL = 2

/**
 * What a condition still needs from the child's resources: the next level of
 * a building costs resources (server prices: world.ts BUILDINGS). Other
 * conditions are actions, not purchases: nothing to count.
 */
export function conditionNeeds(condition: Condition, world: WorldSnapshot): Need[] {
  if (condition.kind !== 'building') return []
  if ((world.buildings[condition.id] ?? 0) >= condition.level) return []
  const cost = findBuilding(condition.id)?.levels[condition.level]?.cost ?? {}
  return (Object.entries(cost) as [ResourceId, number][])
    .map(([resource, amount]) => ({
      resource,
      missing: Math.max(0, amount - (world.balances[resource] ?? 0)),
    }))
    .filter((need) => need.missing > 0)
}

/** The world's lasting facts, by name (one place every screen reads them from). */
export interface WorldState {
  rocketBuilt: boolean
  marsOpen: boolean
  seedFound: boolean
  seedPlanted: boolean
  /** 0 … PLANT_STAGES after planting, -1 before. */
  flowerStage: number
  flowerBloomed: boolean
  scienceLabOpen: boolean
  journeyDone: boolean
}

export function worldState(progress: WorldProgress, world: WorldSnapshot): WorldState {
  const now = projectedProgress(progress, world)
  const flowerStage = plotStage(now, 'mars')
  return {
    rocketBuilt: conditionMet({ kind: 'building', id: 'spaceport', level: 1 }, now, world),
    marsOpen: 'mars' in now.unlocked,
    seedFound: 'mars-seed' in now.discoveries,
    seedPlanted: 'mars' in now.plots,
    flowerStage,
    flowerBloomed: flowerStage >= PLANT_STAGES,
    scienceLabOpen: 'science-lab' in now.unlocked,
    journeyDone: FIRST_FLIGHT.id in now.completed,
  }
}

/** The current step of a journey as the main quest (null when the journey is done). */
export function mainQuest(def: JourneyDef, view: JourneyView, world: WorldSnapshot): Quest | null {
  if (view.complete) return null
  const current = view.steps.find((step) => step.status === 'current')
  const step = current ? def.steps.find((item) => item.id === current.id) : undefined
  if (!current || !step) return null
  return {
    id: `main:${def.id}|${step.id}`,
    kind: 'main',
    icon: step.icon,
    titleKey: `voyage.steps.${step.id}.title`,
    textKey: `voyage.steps.${step.id}.text`,
    route: step.route,
    progress: { done: view.done, total: view.steps.length },
    needs: conditionNeeds(step.done, world),
  }
}

const NEXT_TEXT: Record<GardenPlant['next']['kind'], string> = {
  practise: 'practise',
  grow: 'grow',
  bloom: 'bloom',
  'bloom-later': 'bloomLater',
  'check-later': 'checkLater',
  learned: 'learned',
}

const STAGE_ORDER: Record<GardenPlant['stage'], number> = { seed: 0, sprout: 1, plant: 2, bloom: 3 }

/**
 * Practice quests from the garden: plants still growing, the youngest stage
 * first (a seed needs help most), then the garden's own stable order; one
 * per learning area before a second from the same area.
 */
export function practiceQuests(plants: readonly GardenPlant[], limit = MAX_OPTIONAL): Quest[] {
  const growing = plants
    .map((plant, index) => ({ plant, index }))
    // only plants practice can grow right now (a bloom is done; a plant waiting
    // for tomorrow's look has nothing to do today)
    .filter(
      ({ plant }) =>
        plant.stage !== 'bloom' && plant.practice !== null && plant.next.kind !== 'check-later',
    )
    .sort((a, b) => STAGE_ORDER[a.plant.stage] - STAGE_ORDER[b.plant.stage] || a.index - b.index)
  const chosen: GardenPlant[] = []
  const areas = new Set<string>()
  for (const { plant } of growing) {
    if (chosen.length >= limit) break
    if (areas.has(plant.domain ?? '')) continue
    chosen.push(plant)
    areas.add(plant.domain ?? '')
  }
  for (const { plant } of growing) {
    if (chosen.length >= limit) break
    if (!chosen.includes(plant)) chosen.push(plant)
  }
  return chosen.map((plant) => ({
    id: `practice:${plant.skillKey}`,
    kind: 'practice',
    icon: plant.stage === 'seed' ? 'seedling' : 'herb',
    titleKey: 'quests.practice.title',
    // the garden's own next step, so the quest never promises what cannot happen yet
    textKey: `practiceGarden.next.${NEXT_TEXT[plant.next.kind]}`,
    ...('count' in plant.next ? { textParams: { count: plant.next.count } } : {}),
    route: plant.practice!,
    needs: [],
    skill: plant.skillKey,
  }))
}

/** The next useful things to do: one main quest and up to two optional ones. */
export function smartQuests(input: {
  journey: JourneyDef
  view: JourneyView
  world: WorldSnapshot
  plants: readonly GardenPlant[]
}): SmartQuests {
  return {
    main: mainQuest(input.journey, input.view, input.world),
    optional: practiceQuests(input.plants),
  }
}

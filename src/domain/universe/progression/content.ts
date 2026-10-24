import type { ResourceId, Strand } from '../types'

/*
 * The connected world as data. Rules (engine.ts) read these lists; nothing
 * about a step, an unlock or a plant is written into a screen. Adding a new
 * journey is adding data here (and its texts), not code.
 */

/** Something true about a child's world, checked by the engine. */
export type Condition =
  /** A finished run (kept in the universe `recent` log): by strand and/or activity id prefix. */
  | { kind: 'run'; strand?: Strand; activityPrefix?: string; minStars: number }
  | { kind: 'building'; id: string; level: number }
  | { kind: 'unlocked'; id: string }
  | { kind: 'discovered'; id: string }
  | { kind: 'planted'; plot: string }
  | { kind: 'plotStage'; plot: string; stage: number }

/** A place that opens when its condition becomes true (and stays open). */
export interface UnlockDef {
  id: string
  when: Condition
}

/**
 * A find in one of the worlds. The child finds it (an action), only once its
 * place is open; it pays what `grant` says, once.
 */
export interface ArtifactDef {
  id: string
  requires: Condition
  grant: { resource: ResourceId; amount: number }
}

/**
 * A garden bed. Planting spends `cost`; the plant grows one stage per run
 * that `grows` describes (each run once), after it was planted.
 */
export interface PlotDef {
  id: string
  /** The find whose seed is planted here. */
  seed: string
  cost: Partial<Record<ResourceId, number>>
  grows: { strand: Strand; minStars: number }
  /** Stages after planting; the last one is the bloom. */
  stages: number
}

export interface JourneyStepDef {
  id: string
  done: Condition
  /** Where the child goes to do this step. */
  route: string
  /** A picture from public/3d. */
  icon: string
}

/** A chain of steps across worlds; each step needs the one before. */
export interface JourneyDef {
  id: string
  steps: readonly JourneyStepDef[]
  /** Paid once when the last step is done; announced before the journey starts. */
  reward: { resource: ResourceId; amount: number }
}

export const PLANT_STAGES = 3

export const UNLOCKS: readonly UnlockDef[] = [
  // the rocket's first level takes the child to Mars
  { id: 'mars', when: { kind: 'building', id: 'spaceport', level: 1 } },
  // the Mars flower in bloom opens the Science Lab
  { id: 'science-lab', when: { kind: 'plotStage', plot: 'mars', stage: PLANT_STAGES } },
]

export const ARTIFACTS: readonly ArtifactDef[] = [
  {
    id: 'mars-seed',
    requires: { kind: 'unlocked', id: 'mars' },
    grant: { resource: 'seed', amount: 1 },
  },
]

export const PLOTS: readonly PlotDef[] = [
  {
    id: 'mars',
    seed: 'mars-seed',
    cost: { seed: 1 },
    // biology: the Garden lessons, the dinosaur quiz, any science activity done well
    grows: { strand: 'science', minStars: 2 },
    stages: PLANT_STAGES,
  },
]

/**
 * Math challenge → crystal → rocket → Mars → rare seed → Mistake Garden →
 * biology → the plant grows → Science Lab.
 */
export const FIRST_FLIGHT: JourneyDef = {
  id: 'first-flight',
  steps: [
    // three stars in a maths activity pays a crystal and a part (rules.ts)
    {
      id: 'math',
      done: { kind: 'run', strand: 'number', minStars: 3 },
      route: '/math-lab',
      icon: 'school',
    },
    {
      id: 'rocket',
      done: { kind: 'building', id: 'spaceport', level: 1 },
      route: '/spaceport',
      icon: 'rocket',
    },
    {
      id: 'mars',
      done: { kind: 'discovered', id: 'mars-seed' },
      route: '/spaceport/mars',
      icon: 'space/mars',
    },
    {
      id: 'plant',
      done: { kind: 'planted', plot: 'mars' },
      route: '/mistake-garden',
      icon: 'seedling',
    },
    {
      id: 'grow',
      done: { kind: 'plotStage', plot: 'mars', stage: PLANT_STAGES },
      route: '/learn/garden',
      icon: 'blossom',
    },
    {
      id: 'lab',
      done: { kind: 'run', activityPrefix: 'science-lab:', minStars: 1 },
      route: '/science-lab',
      icon: 'telescope',
    },
  ],
  reward: { resource: 'crystal', amount: 2 },
}

export const JOURNEYS: readonly JourneyDef[] = [FIRST_FLIGHT]

export function findArtifact(id: string): ArtifactDef | undefined {
  return ARTIFACTS.find((item) => item.id === id)
}

export function findPlot(id: string): PlotDef | undefined {
  return PLOTS.find((item) => item.id === id)
}

export function findJourney(id: string): JourneyDef | undefined {
  return JOURNEYS.find((item) => item.id === id)
}

/** The ledger refs the server knows (migration 0011). */
export const discoveryRef = (artifact: string) => artifact
export const plotRef = (plot: string) => `plot|${plot}`
export const journeyRef = (journey: string) => `journey|${journey}`

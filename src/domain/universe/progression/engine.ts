import type { RecentRun } from '../history'
import type { ResourceId } from '../types'
import {
  findArtifact,
  findPlot,
  JOURNEYS,
  PLOTS,
  UNLOCKS,
  type ArtifactDef,
  type Condition,
  type JourneyDef,
  type PlotDef,
} from './content'

/*
 * The progression engine: pure functions from (what the child's world holds
 * now) to (what changes). No store, no React, no clock of its own. The
 * service applies the effects once; because every effect is computed as a
 * difference against the stored progress, running the engine again finds
 * nothing new (idempotent by construction).
 */

export interface PlotState {
  /** The find that was planted. */
  seed: string
  plantedAt: string
  /** Runs that made it grow, oldest first (one stage each, capped at the plot's stages). */
  growth: string[]
}

/** The world's progress for one child (stored in the universe child). */
export interface WorldProgress {
  /** Place id → when it opened. */
  unlocked: Record<string, string>
  /** Find id → when it was found. */
  discoveries: Record<string, string>
  plots: Record<string, PlotState>
  /** `${journey}|${step}` → when it was done. */
  steps: Record<string, string>
  /** Journey id → when it was finished (and its reward paid). */
  completed: Record<string, string>
}

export const EMPTY_PROGRESS: WorldProgress = Object.freeze({
  unlocked: Object.freeze({}),
  discoveries: Object.freeze({}),
  plots: Object.freeze({}),
  steps: Object.freeze({}),
  completed: Object.freeze({}),
}) as WorldProgress

/** The rest of the child's universe the rules look at. */
export interface WorldSnapshot {
  buildings: Readonly<Record<string, number>>
  /** Finished runs, newest first (universe `recent`). */
  recent: readonly RecentRun[]
  balances: Readonly<Record<ResourceId, number>>
}

export type Effect =
  | { kind: 'grow'; plot: string; runId: string; stage: number }
  | { kind: 'unlock'; id: string }
  | { kind: 'step'; journey: string; step: string }
  | { kind: 'complete'; journey: string }

const stepKey = (journey: string, step: string) => `${journey}|${step}`

function time(iso: string): number {
  const value = new Date(iso).getTime()
  return Number.isNaN(value) ? 0 : value
}

export function plotStage(progress: WorldProgress, plot: string): number {
  const state = progress.plots[plot]
  if (!state) return -1
  const def = findPlot(plot)
  return Math.min(state.growth.length, def?.stages ?? 0)
}

export function conditionMet(
  condition: Condition,
  progress: WorldProgress,
  world: WorldSnapshot,
): boolean {
  switch (condition.kind) {
    case 'run':
      return world.recent.some(
        (run) =>
          run.stars >= condition.minStars &&
          (condition.strand === undefined || run.strand === condition.strand) &&
          (condition.activityPrefix === undefined ||
            run.activity.startsWith(condition.activityPrefix)),
      )
    case 'building':
      return (world.buildings[condition.id] ?? 0) >= condition.level
    case 'unlocked':
      return condition.id in progress.unlocked
    case 'discovered':
      return condition.id in progress.discoveries
    case 'planted':
      return condition.plot in progress.plots
    case 'plotStage':
      return plotStage(progress, condition.plot) >= condition.stage
  }
}

/** Runs that grow a plot now: after planting, of its kind, not counted yet; oldest first. */
export function newGrowth(def: PlotDef, state: PlotState, recent: readonly RecentRun[]): string[] {
  const room = def.stages - state.growth.length
  if (room <= 0) return []
  const planted = time(state.plantedAt)
  const counted = new Set(state.growth)
  return [...recent]
    .reverse()
    .filter(
      (run) =>
        run.strand === def.grows.strand &&
        run.stars >= def.grows.minStars &&
        time(run.at) >= planted &&
        !counted.has(run.id),
    )
    .map((run) => run.id)
    .slice(0, room)
}

/** Applies effects to the progress (pure). `at` stamps what opened or finished. */
export function applyEffects(
  progress: WorldProgress,
  effects: readonly Effect[],
  at: string,
): WorldProgress {
  let next = progress
  for (const effect of effects) {
    switch (effect.kind) {
      case 'grow': {
        const state = next.plots[effect.plot]
        if (!state || state.growth.includes(effect.runId)) break
        next = {
          ...next,
          plots: {
            ...next.plots,
            [effect.plot]: { ...state, growth: [...state.growth, effect.runId] },
          },
        }
        break
      }
      case 'unlock':
        if (!(effect.id in next.unlocked))
          next = { ...next, unlocked: { ...next.unlocked, [effect.id]: at } }
        break
      case 'step': {
        const key = stepKey(effect.journey, effect.step)
        if (!(key in next.steps)) next = { ...next, steps: { ...next.steps, [key]: at } }
        break
      }
      case 'complete':
        if (!(effect.journey in next.completed)) {
          next = { ...next, completed: { ...next.completed, [effect.journey]: at } }
        }
        break
    }
  }
  return next
}

/** One pass: what is newly true. */
function pass(progress: WorldProgress, world: WorldSnapshot): Effect[] {
  const effects: Effect[] = []
  for (const def of PLOTS) {
    const state = progress.plots[def.id]
    if (!state) continue
    newGrowth(def, state, world.recent).forEach((runId, index) => {
      effects.push({ kind: 'grow', plot: def.id, runId, stage: state.growth.length + index + 1 })
    })
  }
  for (const unlock of UNLOCKS) {
    if (!(unlock.id in progress.unlocked) && conditionMet(unlock.when, progress, world)) {
      effects.push({ kind: 'unlock', id: unlock.id })
    }
  }
  for (const journey of JOURNEYS) {
    if (journey.id in progress.completed) continue
    // steps in order: a step counts only after the one before it
    let allDone = true
    for (const step of journey.steps) {
      if (stepKey(journey.id, step.id) in progress.steps) continue
      allDone = false
      if (conditionMet(step.done, progress, world)) {
        effects.push({ kind: 'step', journey: journey.id, step: step.id })
      }
      break
    }
    if (allDone) effects.push({ kind: 'complete', journey: journey.id })
  }
  return effects
}

/**
 * Everything that follows from the world as it is: growth, places opening,
 * journey steps and finished journeys, including chains (a bloom opens the
 * lab, which finishes a step). Bounded, so a bad rule can never loop.
 */
export function advance(
  progress: WorldProgress,
  world: WorldSnapshot,
  at: string,
): { progress: WorldProgress; effects: Effect[] } {
  let current = progress
  const all: Effect[] = []
  for (let round = 0; round < 16; round++) {
    const effects = pass(current, world)
    if (effects.length === 0) break
    current = applyEffects(current, effects, at)
    all.push(...effects)
  }
  return { progress: current, effects: all }
}

// ---------------------------------------------------------------- actions

export type DiscoverCheck = 'ok' | 'unknown' | 'locked' | 'found'

export function canDiscover(
  progress: WorldProgress,
  world: WorldSnapshot,
  id: string,
): DiscoverCheck {
  const def: ArtifactDef | undefined = findArtifact(id)
  if (!def) return 'unknown'
  if (id in progress.discoveries) return 'found'
  return conditionMet(def.requires, progress, world) ? 'ok' : 'locked'
}

export type PlantCheck = 'ok' | 'unknown' | 'planted' | 'no-seed' | 'no-find'

export function canPlant(progress: WorldProgress, world: WorldSnapshot, plot: string): PlantCheck {
  const def = findPlot(plot)
  if (!def) return 'unknown'
  if (plot in progress.plots) return 'planted'
  if (!(def.seed in progress.discoveries)) return 'no-find'
  for (const [resource, amount] of Object.entries(def.cost) as [ResourceId, number][]) {
    if ((world.balances[resource] ?? 0) < amount) return 'no-seed'
  }
  return 'ok'
}

// ---------------------------------------------------------------- views

export type StepStatus = 'done' | 'current' | 'later'

export interface JourneyView {
  id: string
  reward: JourneyDef['reward']
  complete: boolean
  steps: { id: string; route: string; icon: string; status: StepStatus }[]
  /** Steps done, for "3 / 6". */
  done: number
}

/** A journey as the child sees it (from the progress the engine would reach now). */
export function journeyView(
  journey: JourneyDef,
  progress: WorldProgress,
  world: WorldSnapshot,
): JourneyView {
  const reached = advance(progress, world, new Date(0).toISOString()).progress
  let currentFound = false
  const steps = journey.steps.map((step) => {
    let status: StepStatus = 'later'
    if (stepKey(journey.id, step.id) in reached.steps) status = 'done'
    else if (!currentFound) {
      status = 'current'
      currentFound = true
    }
    return { id: step.id, route: step.route, icon: step.icon, status }
  })
  return {
    id: journey.id,
    reward: journey.reward,
    complete: journey.id in reached.completed,
    steps,
    done: steps.filter((step) => step.status === 'done').length,
  }
}

/** The opened places and plots as the engine would have them now. */
export function projectedProgress(progress: WorldProgress, world: WorldSnapshot): WorldProgress {
  return advance(progress, world, new Date().toISOString()).progress
}

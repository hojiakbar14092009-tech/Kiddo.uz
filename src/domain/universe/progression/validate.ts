import { STRANDS, RESOURCE_IDS } from '../types'
import { BUILDINGS } from '../world'
import {
  ARTIFACTS,
  JOURNEYS,
  PLOTS,
  UNLOCKS,
  type ArtifactDef,
  type Condition,
  type JourneyDef,
  type PlotDef,
  type UnlockDef,
} from './content'

/*
 * Static checks of the connected world's data (Phase 18): a journey that can
 * never finish is a bug, found by tests, not by a child. Pure: data in, a list
 * of problems out (empty when the world is sound).
 */

export interface WorldContent {
  unlocks: readonly UnlockDef[]
  artifacts: readonly ArtifactDef[]
  plots: readonly PlotDef[]
  journeys: readonly JourneyDef[]
}

export const CONTENT: WorldContent = {
  unlocks: UNLOCKS,
  artifacts: ARTIFACTS,
  plots: PLOTS,
  journeys: JOURNEYS,
}

function duplicates(ids: readonly string[]): string[] {
  return ids.filter((id, index) => ids.indexOf(id) !== index)
}

/** The things a condition waits for (`unlock:mars`, `artifact:mars-seed`, `plot:mars`). */
function dependsOn(condition: Condition): string[] {
  switch (condition.kind) {
    case 'unlocked':
      return [`unlock:${condition.id}`]
    case 'discovered':
      return [`artifact:${condition.id}`]
    case 'planted':
    case 'plotStage':
      return [`plot:${condition.plot}`]
    default:
      return []
  }
}

function checkCondition(condition: Condition, content: WorldContent, where: string): string[] {
  const problems: string[] = []
  switch (condition.kind) {
    case 'run':
      if (condition.strand && !(STRANDS as readonly string[]).includes(condition.strand)) {
        problems.push(`${where}: unknown strand ${condition.strand}`)
      }
      if (condition.minStars < 1 || condition.minStars > 3) {
        problems.push(`${where}: stars must be 1–3`)
      }
      break
    case 'building': {
      const building = BUILDINGS.find((item) => item.id === condition.id)
      if (!building) problems.push(`${where}: unknown building ${condition.id}`)
      else if (condition.level < 1 || condition.level >= building.levels.length) {
        problems.push(`${where}: building ${condition.id} has no level ${condition.level}`)
      }
      break
    }
    case 'unlocked':
      if (!content.unlocks.some((item) => item.id === condition.id)) {
        problems.push(`${where}: nothing unlocks ${condition.id}`)
      }
      break
    case 'discovered':
      if (!content.artifacts.some((item) => item.id === condition.id)) {
        problems.push(`${where}: unknown find ${condition.id}`)
      }
      break
    case 'planted':
    case 'plotStage': {
      const plot = content.plots.find((item) => item.id === condition.plot)
      if (!plot) problems.push(`${where}: unknown bed ${condition.plot}`)
      else if (condition.kind === 'plotStage' && condition.stage > plot.stages) {
        problems.push(`${where}: bed ${plot.id} never reaches stage ${condition.stage}`)
      }
      break
    }
  }
  return problems
}

/** Every problem of the world's data: unknown references, impossible values, cycles. */
export function validateProgression(content: WorldContent = CONTENT): string[] {
  const problems: string[] = []
  const all = [
    ...content.unlocks.map((item) => `unlock:${item.id}`),
    ...content.artifacts.map((item) => `artifact:${item.id}`),
    ...content.plots.map((item) => `plot:${item.id}`),
    ...content.journeys.map((item) => `journey:${item.id}`),
  ]
  for (const id of duplicates(all)) problems.push(`duplicate id ${id}`)

  const isResource = (id: string) => (RESOURCE_IDS as readonly string[]).includes(id)
  const graph = new Map<string, string[]>()

  for (const unlock of content.unlocks) {
    problems.push(...checkCondition(unlock.when, content, `unlock ${unlock.id}`))
    graph.set(`unlock:${unlock.id}`, dependsOn(unlock.when))
  }
  for (const artifact of content.artifacts) {
    problems.push(...checkCondition(artifact.requires, content, `find ${artifact.id}`))
    if (!isResource(artifact.grant.resource) || artifact.grant.amount <= 0) {
      problems.push(`find ${artifact.id}: invalid grant`)
    }
    graph.set(`artifact:${artifact.id}`, dependsOn(artifact.requires))
  }
  for (const plot of content.plots) {
    if (!content.artifacts.some((item) => item.id === plot.seed)) {
      problems.push(`bed ${plot.id}: unknown seed ${plot.seed}`)
    }
    for (const [resource, amount] of Object.entries(plot.cost)) {
      if (!isResource(resource) || (amount ?? 0) <= 0) problems.push(`bed ${plot.id}: invalid cost`)
    }
    if (plot.stages < 1) problems.push(`bed ${plot.id}: no stages`)
    graph.set(`plot:${plot.id}`, [`artifact:${plot.seed}`])
  }
  for (const journey of content.journeys) {
    const stepIds = journey.steps.map((step) => step.id)
    for (const id of duplicates(stepIds))
      problems.push(`journey ${journey.id}: duplicate step ${id}`)
    if (journey.steps.length === 0) problems.push(`journey ${journey.id}: no steps`)
    if (!isResource(journey.reward.resource) || journey.reward.amount <= 0) {
      problems.push(`journey ${journey.id}: invalid reward`)
    }
    journey.steps.forEach((step, index) => {
      // a step waits for what its condition needs and for the step before it
      const before = journey.steps[index - 1]
      graph.set(`step:${journey.id}|${step.id}`, [
        ...dependsOn(step.done),
        ...(before ? [`step:${journey.id}|${before.id}`] : []),
      ])
    })
    for (const step of journey.steps) {
      problems.push(...checkCondition(step.done, content, `journey ${journey.id} step ${step.id}`))
      if (!step.route.startsWith('/'))
        problems.push(`journey ${journey.id} step ${step.id}: bad route`)
    }
  }

  // a place that (indirectly) waits for itself can never open
  const state = new Map<string, 'visiting' | 'done'>()
  const visit = (node: string, path: string[]) => {
    if (state.get(node) === 'done') return
    if (state.get(node) === 'visiting') {
      problems.push(`cycle: ${[...path, node].join(' → ')}`)
      return
    }
    state.set(node, 'visiting')
    for (const next of graph.get(node) ?? []) visit(next, [...path, node])
    state.set(node, 'done')
  }
  for (const node of graph.keys()) visit(node, [])
  return problems
}

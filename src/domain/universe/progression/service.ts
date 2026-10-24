import { subscribeEvidence } from '@/domain/learningMemory'
import { hasKey } from '@/domain/ledger'
import {
  emitUniverse,
  EMPTY_BALANCES,
  grantResource,
  refreshIfStale,
  setProgress,
  spendResources,
  subscribeUniverse,
  universeChild,
} from '../store'
import { discoveryRef, findArtifact, findJourney, findPlot, journeyRef, plotRef } from './content'
import {
  advance,
  canDiscover,
  canPlant,
  EMPTY_PROGRESS,
  type DiscoverCheck,
  type Effect,
  type PlantCheck,
  type WorldProgress,
  type WorldSnapshot,
} from './engine'
import type { DomainEvent, DomainEventType } from './events'
import { memoryEvents } from './memoryEvents'

/*
 * Applies the progression engine to the universe store. The only writer of a
 * child's world progress. Every grant goes through the universe's idempotent
 * resource ledger (and from there, in cloud mode, to the server's
 * `record_resource`, which checks the same refs: migration 0011), so a
 * replay, a second tab or a double tap can never pay twice.
 */

/** Ledger reasons of the connected world (also allowed by the server). */
export const PROGRESSION_REASONS = {
  discovery: 'discovery',
  plant: 'plant',
  journey: 'journey',
} as const

export function progressOf(childKey: string): WorldProgress {
  return universeChild(childKey).progress ?? EMPTY_PROGRESS
}

export function snapshotOf(childKey: string): WorldSnapshot {
  const child = universeChild(childKey)
  return {
    buildings: child.buildings,
    recent: child.recent ?? [],
    balances: { ...EMPTY_BALANCES, ...child.balances },
  }
}

/** Every domain event type (a new type in events.ts must be added here: the compiler checks). */
const DOMAIN_TYPE_LIST = {
  'activity.completed': true,
  'resource.changed': true,
  'achievement.reached': true,
  'quest.claimed': true,
  'building.upgraded': true,
  'mistake.made': true,
  'mistake.confirmed': true,
  'mistake.resolved': true,
  'skill.mastered': true,
  'adaptation.updated': true,
  'world.unlocked': true,
  'artifact.discovered': true,
  'seed.planted': true,
  'plant.grew': true,
  'journey.step': true,
  'quest.completed': true,
} satisfies Record<DomainEventType, true>
const DOMAIN_TYPES: ReadonlySet<string> = new Set(Object.keys(DOMAIN_TYPE_LIST))

/**
 * Typed listening to the universe (Phase 18): every domain event, typed, for
 * features that react to the world without owning it. Its first users come
 * with Phase 19 (mascots reacting to quest and world events) and sound. Listeners never change progression; they
 * only react. Returns an unsubscribe.
 */
export function subscribeDomainEvents(listener: (event: DomainEvent) => void): () => void {
  return subscribeUniverse((event) => {
    if (typeof event.type === 'string' && DOMAIN_TYPES.has(event.type)) {
      listener(event as unknown as DomainEvent)
    }
  })
}

/** Publishes a typed domain event on the universe bus. */
export function publish(event: DomainEvent): void {
  emitUniverse(event)
}

function eventFor(childKey: string, effect: Effect): DomainEvent {
  switch (effect.kind) {
    case 'grow':
      return { type: 'plant.grew', childKey, plot: effect.plot, stage: effect.stage }
    case 'unlock':
      return { type: 'world.unlocked', childKey, id: effect.id }
    case 'step':
      return { type: 'journey.step', childKey, journey: effect.journey, step: effect.step }
    case 'complete':
      return { type: 'quest.completed', childKey, quest: effect.journey }
  }
}

const running = new Set<string>()
const again = new Set<string>()

/**
 * Brings a child's world up to date with everything it holds now and pays
 * what finished journeys promised. Safe to call any number of times; a call
 * from inside another (an event it published) runs once more afterwards.
 */
export function syncProgression(childKey: string): Effect[] {
  if (!childKey) return []
  if (running.has(childKey)) {
    again.add(childKey)
    return []
  }
  running.add(childKey)
  const applied: Effect[] = []
  try {
    for (let round = 0; round < 4; round++) {
      again.delete(childKey)
      const { progress, effects } = advance(
        progressOf(childKey),
        snapshotOf(childKey),
        new Date().toISOString(),
      )
      if (effects.length === 0) break
      // stored before anything is published, so a listener sees the new world
      setProgress(childKey, progress)
      for (const effect of effects) {
        if (effect.kind === 'complete') payJourney(childKey, effect.journey)
        publish(eventFor(childKey, effect))
      }
      applied.push(...effects)
      if (!again.has(childKey)) break
    }
  } finally {
    running.delete(childKey)
    again.delete(childKey)
  }
  return applied
}

function payJourney(childKey: string, journey: string) {
  const def = findJourney(journey)
  if (!def) return
  grantResource({
    childKey,
    resource: def.reward.resource,
    amount: def.reward.amount,
    reason: PROGRESSION_REASONS.journey,
    refId: journeyRef(journey),
  })
}

/** The child finds something in a world: once, and only where it is open. */
export function discoverArtifact(childKey: string, id: string): DiscoverCheck {
  refreshIfStale(childKey)
  syncProgression(childKey)
  const check = canDiscover(progressOf(childKey), snapshotOf(childKey), id)
  if (check !== 'ok') return check
  const def = findArtifact(id)!
  const ref = discoveryRef(id)
  const key = `${def.grant.resource}|${PROGRESSION_REASONS.discovery}|${ref}`
  const entry = grantResource({
    childKey,
    resource: def.grant.resource,
    amount: def.grant.amount,
    reason: PROGRESSION_REASONS.discovery,
    refId: ref,
  })
  // paid before (another tab, restored data): the find is still the child's
  if (!entry && !hasKey(universeChild(childKey).ledger, key)) return 'locked'
  const progress = progressOf(childKey)
  setProgress(childKey, {
    ...progress,
    discoveries: { ...progress.discoveries, [id]: new Date().toISOString() },
  })
  publish({ type: 'artifact.discovered', childKey, id })
  syncProgression(childKey)
  return 'ok'
}

/** The ledger entry that paid for planting this bed, if any. */
function plantedEntry(childKey: string, plot: string) {
  const ref = plotRef(plot)
  return universeChild(childKey).ledger.entries.find(
    (entry) => entry.reason === PROGRESSION_REASONS.plant && entry.refId === ref,
  )
}

/** Plants a found seed in its garden bed: spends the seed once. */
export function plantSeed(childKey: string, plot: string): PlantCheck {
  refreshIfStale(childKey)
  syncProgression(childKey)
  const check = canPlant(progressOf(childKey), snapshotOf(childKey), plot)
  const def = findPlot(plot)
  // the seed was spent before (another tab, restored data) but the bed was not
  // recorded: the planting stands, with the time it was paid
  const spent = def ? plantedEntry(childKey, plot) : undefined
  if (check !== 'ok' && !(spent && check === 'no-seed')) return check
  if (!spent) {
    const paid = spendResources({
      childKey,
      cost: def!.cost,
      reason: PROGRESSION_REASONS.plant,
      refId: plotRef(plot),
    })
    if (!paid) return 'no-seed'
  }
  const progress = progressOf(childKey)
  setProgress(childKey, {
    ...progress,
    plots: {
      ...progress.plots,
      [plot]: { seed: def!.seed, plantedAt: spent?.at ?? new Date().toISOString(), growth: [] },
    },
  })
  publish({ type: 'seed.planted', childKey, plot })
  syncProgression(childKey)
  return 'ok'
}

/** Events after which the world may have moved on. */
const TRIGGERS = new Set(['activity.completed', 'building.upgraded', 'resource.changed'])

let installed: (() => void) | null = null

/**
 * Connects the engine to the universe bus and the learning memory (once per
 * page). Returns a stop function (tests).
 */
export function installProgression(): () => void {
  if (installed) return installed
  const stopUniverse = subscribeUniverse((event) => {
    if (TRIGGERS.has(event.type) && typeof event.childKey === 'string') {
      syncProgression(event.childKey)
    }
  })
  const stopMemory = subscribeEvidence((childKey, _evidence, change) => {
    for (const event of memoryEvents(childKey, change.before, change.after)) publish(event)
  })
  installed = () => {
    stopUniverse()
    stopMemory()
    installed = null
  }
  return installed
}

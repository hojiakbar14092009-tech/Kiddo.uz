import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useRewardStore } from '@/domain/rewards'
import { recordEvidence, useLearningMemoryStore, type SkillMemory } from '@/domain/learningMemory'
import { useLearnStore } from '@/features/learn/learnStore'
import { useFamilyStore } from '@/store/familyStore'
import { useProgressStore } from '@/store/progressStore'
import connected from '../../../../supabase/migrations/0011_connected_world.sql?raw'
import type { RecentRun } from '../history'
import {
  emitActivity,
  getResources,
  grantResource,
  resourceHistory,
  subscribeUniverse,
  universeChild,
  upgradeBuilding,
  useUniverseStore,
  type ActivityCompleted,
  type UniverseEvent,
} from '..'
import { ARTIFACTS, FIRST_FLIGHT, JOURNEYS, PLOTS, journeyRef, plotRef } from './content'
import {
  advance,
  canDiscover,
  canPlant,
  conditionMet,
  EMPTY_PROGRESS,
  journeyView,
  newGrowth,
  plotStage,
  type WorldProgress,
  type WorldSnapshot,
} from './engine'
import { memoryEvents } from './memoryEvents'
import {
  discoverArtifact,
  installProgression,
  plantSeed,
  progressOf,
  syncProgression,
} from './service'

const AT = '2026-10-24T09:00:00.000Z'
const EMPTY_BALANCES = { star: 0, crystal: 0, seed: 0, part: 0, scroll: 0, key: 0 }

function runOf(over: Partial<RecentRun>): RecentRun {
  return {
    id: 'r',
    activity: 'math-lab:count:L1',
    strand: 'number',
    at: AT,
    stars: 3,
    independent: 5,
    total: 5,
    ...over,
  }
}

function world(over: Partial<WorldSnapshot> = {}): WorldSnapshot {
  return { buildings: {}, recent: [], balances: EMPTY_BALANCES, ...over }
}

describe('progression engine (pure)', () => {
  it('reads conditions from the world, never from a screen', () => {
    const w = world({ buildings: { spaceport: 1 }, recent: [runOf({ stars: 3 })] })
    expect(conditionMet({ kind: 'run', strand: 'number', minStars: 3 }, EMPTY_PROGRESS, w)).toBe(
      true,
    )
    expect(conditionMet({ kind: 'run', strand: 'science', minStars: 1 }, EMPTY_PROGRESS, w)).toBe(
      false,
    )
    expect(conditionMet({ kind: 'building', id: 'spaceport', level: 1 }, EMPTY_PROGRESS, w)).toBe(
      true,
    )
    expect(conditionMet({ kind: 'building', id: 'spaceport', level: 2 }, EMPTY_PROGRESS, w)).toBe(
      false,
    )
    expect(
      conditionMet({ kind: 'run', activityPrefix: 'science-lab:', minStars: 1 }, EMPTY_PROGRESS, w),
    ).toBe(false)
  })

  it('opens Mars when the rocket has its first level, once', () => {
    const first = advance(EMPTY_PROGRESS, world({ buildings: { spaceport: 1 } }), AT)
    expect(first.effects).toContainEqual({ kind: 'unlock', id: 'mars' })
    expect(first.progress.unlocked.mars).toBe(AT)
    // idempotent: the same world again changes nothing
    expect(advance(first.progress, world({ buildings: { spaceport: 1 } }), AT).effects).toEqual([])
  })

  it('takes journey steps only in order', () => {
    // the rocket is built, but the maths step is not done: nothing counts yet
    const early = advance(EMPTY_PROGRESS, world({ buildings: { spaceport: 1 } }), AT)
    expect(early.effects.filter((e) => e.kind === 'step')).toEqual([])
    // the maths step arrives: both steps are done in one go
    const later = advance(
      early.progress,
      world({ buildings: { spaceport: 1 }, recent: [runOf({ stars: 3 })] }),
      AT,
    )
    expect(
      later.effects.filter((e) => e.kind === 'step').map((e) => e.kind === 'step' && e.step),
    ).toEqual(['math', 'rocket'])
  })

  it('a plant grows once per qualifying run after planting, up to its bloom', () => {
    const def = PLOTS[0]!
    const state = { seed: 'mars-seed', plantedAt: AT, growth: [] }
    const before = runOf({ id: 'old', strand: 'science', stars: 3, at: '2026-10-23T09:00:00.000Z' })
    const weak = runOf({ id: 'weak', strand: 'science', stars: 1, at: '2026-10-24T10:00:00.000Z' })
    const maths = runOf({ id: 'maths', strand: 'number', stars: 3, at: '2026-10-24T10:00:00.000Z' })
    const good = (n: number) =>
      runOf({ id: `g${n}`, strand: 'science', stars: 2, at: `2026-10-24T1${n}:00:00.000Z` })
    // newest first, as the universe keeps them
    const recent = [good(4), good(3), good(2), good(1), maths, weak, before]
    expect(newGrowth(def, state, recent)).toEqual(['g1', 'g2', 'g3'])
    expect(newGrowth(def, { ...state, growth: ['g1'] }, recent)).toEqual(['g2', 'g3'])
    expect(newGrowth(def, { ...state, growth: ['g1', 'g2', 'g3'] }, recent)).toEqual([])
  })

  it('a bloom opens the Science Lab in the same pass (chains)', () => {
    const progress: WorldProgress = {
      ...EMPTY_PROGRESS,
      unlocked: { mars: AT },
      discoveries: { 'mars-seed': AT },
      plots: { mars: { seed: 'mars-seed', plantedAt: AT, growth: ['a', 'b'] } },
    }
    const recent = [runOf({ id: 'c', strand: 'science', stars: 3, at: '2026-10-24T11:00:00.000Z' })]
    const { progress: next, effects } = advance(progress, world({ recent }), AT)
    expect(effects).toContainEqual({ kind: 'grow', plot: 'mars', runId: 'c', stage: 3 })
    expect(effects).toContainEqual({ kind: 'unlock', id: 'science-lab' })
    expect(plotStage(next, 'mars')).toBe(3)
  })

  it('finds need their place open; planting needs the find and a seed', () => {
    expect(canDiscover(EMPTY_PROGRESS, world(), 'mars-seed')).toBe('locked')
    expect(canDiscover(EMPTY_PROGRESS, world(), 'moon-rock')).toBe('unknown')
    const open = { ...EMPTY_PROGRESS, unlocked: { mars: AT } }
    expect(canDiscover(open, world(), 'mars-seed')).toBe('ok')
    const found = { ...open, discoveries: { 'mars-seed': AT } }
    expect(canDiscover(found, world(), 'mars-seed')).toBe('found')
    expect(canPlant(open, world({ balances: { ...EMPTY_BALANCES, seed: 1 } }), 'mars')).toBe(
      'no-find',
    )
    expect(canPlant(found, world(), 'mars')).toBe('no-seed')
    expect(canPlant(found, world({ balances: { ...EMPTY_BALANCES, seed: 1 } }), 'mars')).toBe('ok')
    expect(canPlant(found, world(), 'pluto')).toBe('unknown')
  })

  it('shows the journey with one current step', () => {
    const view = journeyView(FIRST_FLIGHT, EMPTY_PROGRESS, world({ recent: [runOf({ stars: 3 })] }))
    expect(view.steps.map((s) => s.status)).toEqual([
      'done',
      'current',
      'later',
      'later',
      'later',
      'later',
    ])
    expect(view.done).toBe(1)
    expect(view.complete).toBe(false)
    expect(view.reward).toEqual({ resource: 'crystal', amount: 2 })
  })

  it('turns learning memory changes into events', () => {
    const base: SkillMemory = {
      skill: 'math:add:within10',
      mastery: 0.5,
      evidence: 3,
      successStreak: 0,
      firstAt: AT,
      lastPracticedAt: AT,
      lastErrorAt: AT,
      retained: false,
      nextReviewAt: null,
      reviewStep: 0,
      reviewCount: 0,
      misconceptions: {
        'off-by-one': {
          code: 'off-by-one',
          count: 1,
          items: ['a'],
          firstAt: AT,
          lastAt: AT,
          status: 'observed',
        },
      },
      hintsRecent: [],
      correctedAfterHint: 0,
      masteredAt: null,
    }
    const confirmed = {
      ...base,
      misconceptions: {
        'off-by-one': { ...base.misconceptions['off-by-one']!, status: 'confirmed' as const },
      },
    }
    expect(memoryEvents('kid', base, confirmed)).toEqual([
      {
        type: 'mistake.confirmed',
        childKey: 'kid',
        skill: 'math:add:within10',
        code: 'off-by-one',
      },
    ])
    const resolved = {
      ...confirmed,
      misconceptions: {
        'off-by-one': { ...confirmed.misconceptions['off-by-one'], status: 'resolved' as const },
      },
      masteredAt: AT,
    }
    expect(memoryEvents('kid', confirmed, resolved)).toEqual([
      { type: 'mistake.resolved', childKey: 'kid', skill: 'math:add:within10', code: 'off-by-one' },
      { type: 'skill.mastered', childKey: 'kid', skill: 'math:add:within10' },
    ])
    expect(memoryEvents('kid', resolved, resolved)).toEqual([])
  })
})

describe('the server knows the same world (0011)', () => {
  const rows = [
    ...connected.matchAll(
      /\('(discovery|plant|journey)', '([^']+)', '([a-z]+)', (-?\d+), '([^']+)', '([^']+)'\)/g,
    ),
  ].map((m) => ({ reason: m[1], ref: m[2], resource: m[3], amount: Number(m[4]), needsRef: m[6] }))

  it('lists every find, bed and journey reward with its exact amount', () => {
    const app = [
      ...ARTIFACTS.map((a) => ({
        reason: 'discovery',
        ref: a.id,
        resource: a.grant.resource,
        amount: a.grant.amount,
      })),
      ...PLOTS.flatMap((p) =>
        Object.entries(p.cost).map(([resource, amount]) => ({
          reason: 'plant',
          ref: plotRef(p.id),
          resource,
          amount: -(amount ?? 0),
        })),
      ),
      ...JOURNEYS.map((j) => ({
        reason: 'journey',
        ref: journeyRef(j.id),
        resource: j.reward.resource,
        amount: j.reward.amount,
      })),
    ]
    const server = rows.map(({ reason, ref, resource, amount }) => ({
      reason,
      ref,
      resource,
      amount,
    }))
    expect(server.length).toBeGreaterThan(0)
    expect(server).toEqual(expect.arrayContaining(app))
    expect(app).toEqual(expect.arrayContaining(server))
  })

  it('asks for the step before: rocket → seed → planted → reward', () => {
    const needs = Object.fromEntries(rows.map((row) => [row.ref, row.needsRef]))
    expect(needs['mars-seed']).toBe('upgrade|spaceport|1')
    expect(needs[plotRef('mars')]).toBe('mars-seed')
    expect(needs[journeyRef('first-flight')]).toBe(plotRef('mars'))
  })
})

// ---------------------------------------------------------------- integration

const KID = 'kid-journey'
let counter = 0
function activity(over: Partial<ActivityCompleted>): ActivityCompleted {
  counter += 1
  return {
    id: `run-${counter}`,
    childKey: KID,
    activity: 'math-lab:count:L1',
    strand: 'number',
    correct: 5,
    total: 5,
    independent: 5,
    at: new Date().toISOString(),
    ...over,
  }
}

function resetAll() {
  useProgressStore.setState({ byChild: {} })
  useRewardStore.setState({ byChild: {} })
  useLearnStore.setState({ byChild: {} })
  useUniverseStore.setState({ byChild: {} })
  useLearningMemoryStore.setState({ byChild: {} })
  useFamilyStore.setState({ children: [], activeChildId: null })
}

describe('the first journey across worlds (store + rules)', () => {
  let stop: () => void
  let seen: UniverseEvent[]
  let unsubscribe: () => void
  beforeEach(() => {
    resetAll()
    stop = installProgression()
    seen = []
    unsubscribe = subscribeUniverse((event) => seen.push(event))
  })
  afterEach(() => {
    unsubscribe()
    stop()
  })

  const types = () => seen.map((event) => event.type)

  it('maths → crystal → rocket → Mars → seed → garden → biology → bloom → lab → reward', () => {
    // 1. a maths challenge with three stars pays a crystal and a part
    const award = emitActivity(activity({}))
    expect(award.crystals).toBe(1)
    expect(award.parts).toBe(1)
    expect(progressOf(KID).steps['first-flight|math']).toBeDefined()

    // 2. they build the rocket's first level
    expect(upgradeBuilding(KID, 'spaceport')).toBe('ok')
    expect(getResources(KID)).toMatchObject({ crystal: 0, part: 0 })
    expect(progressOf(KID).unlocked.mars).toBeDefined()
    expect(types()).toContain('world.unlocked')

    // 3. on Mars the rare seed is found once
    expect(discoverArtifact(KID, 'mars-seed')).toBe('ok')
    expect(discoverArtifact(KID, 'mars-seed')).toBe('found')
    expect(getResources(KID).seed).toBe(1)

    // 4. planted in the Mistake Garden (the seed is spent once)
    expect(plantSeed(KID, 'mars')).toBe('ok')
    expect(plantSeed(KID, 'mars')).toBe('planted')
    expect(getResources(KID).seed).toBe(0)
    expect(plotStage(progressOf(KID), 'mars')).toBe(0)

    // 5. biology: science runs done well make it grow; a weak one or a repeat does not
    emitActivity(activity({ activity: 'garden:1', strand: 'science', independent: 1 }))
    expect(plotStage(progressOf(KID), 'mars')).toBe(0)
    const grow = activity({ activity: 'garden:1', strand: 'science', independent: 4 })
    emitActivity(grow)
    emitActivity(grow)
    expect(plotStage(progressOf(KID), 'mars')).toBe(1)
    emitActivity(activity({ activity: 'garden:2', strand: 'science' }))
    expect(progressOf(KID).unlocked['science-lab']).toBeUndefined()
    emitActivity(activity({ activity: 'dino:quiz', strand: 'science' }))
    expect(plotStage(progressOf(KID), 'mars')).toBe(3)
    // 6. the bloom opens the Science Lab
    expect(progressOf(KID).unlocked['science-lab']).toBeDefined()

    // 7. its first experiment finishes the journey: the promised reward, once
    const before = getResources(KID).crystal
    emitActivity(activity({ activity: 'science-lab:plants', strand: 'science' }))
    expect(progressOf(KID).completed['first-flight']).toBeDefined()
    const crystalsAfter = getResources(KID).crystal
    // 1 crystal for the lab's first three stars + 2 for the journey
    expect(crystalsAfter - before).toBe(3)
    expect(types()).toContain('quest.completed')
    syncProgression(KID)
    emitActivity(activity({ activity: 'science-lab:plants', strand: 'science' }))
    expect(getResources(KID).crystal).toBe(crystalsAfter)
    const journeyRows = resourceHistory(KID).filter((entry) => entry.reason === 'journey')
    expect(journeyRows).toHaveLength(1)
    expect(journeyRows[0]).toMatchObject({
      resource: 'crystal',
      amount: 2,
      refId: 'journey|first-flight',
    })

    // the events tell the story in order
    const story = types().filter((type) =>
      [
        'world.unlocked',
        'artifact.discovered',
        'seed.planted',
        'plant.grew',
        'quest.completed',
      ].includes(type),
    )
    expect(story).toEqual([
      'world.unlocked',
      'artifact.discovered',
      'seed.planted',
      'plant.grew',
      'plant.grew',
      'plant.grew',
      'world.unlocked',
      'quest.completed',
    ])
  })

  it('cannot skip ahead: no Mars without the rocket, no planting without the find', () => {
    expect(discoverArtifact(KID, 'mars-seed')).toBe('locked')
    grantResource({ childKey: KID, resource: 'seed', amount: 3, reason: 'admin', refId: 'g' })
    expect(plantSeed(KID, 'mars')).toBe('no-find')
    expect(getResources(KID).seed).toBe(3)
    expect(universeChild(KID).progress?.plots.mars).toBeUndefined()
  })

  it('a second tab that already paid the find still records it, without paying again', () => {
    grantResource({ childKey: KID, resource: 'crystal', amount: 1, reason: 'admin', refId: 'c' })
    grantResource({ childKey: KID, resource: 'part', amount: 1, reason: 'admin', refId: 'p' })
    expect(upgradeBuilding(KID, 'spaceport')).toBe('ok')
    // the other tab's ledger row, without its progress
    grantResource({
      childKey: KID,
      resource: 'seed',
      amount: 1,
      reason: 'discovery',
      refId: 'mars-seed',
    })
    expect(discoverArtifact(KID, 'mars-seed')).toBe('ok')
    expect(getResources(KID).seed).toBe(1)
  })

  it('a bed paid for before (progress lost) is recorded as planted, without paying again', () => {
    grantResource({ childKey: KID, resource: 'crystal', amount: 1, reason: 'admin', refId: 'c' })
    grantResource({ childKey: KID, resource: 'part', amount: 1, reason: 'admin', refId: 'p' })
    expect(upgradeBuilding(KID, 'spaceport')).toBe('ok')
    expect(discoverArtifact(KID, 'mars-seed')).toBe('ok')
    expect(plantSeed(KID, 'mars')).toBe('ok')
    const progress = progressOf(KID)
    const { mars: _gone, ...plots } = progress.plots
    useUniverseStore.setState((state) => ({
      byChild: {
        ...state.byChild,
        [KID]: { ...state.byChild[KID]!, progress: { ...progress, plots } },
      },
    }))
    expect(getResources(KID).seed).toBe(0)
    expect(plantSeed(KID, 'mars')).toBe('ok')
    expect(progressOf(KID).plots.mars).toBeDefined()
    expect(resourceHistory(KID).filter((e) => e.reason === 'plant')).toHaveLength(1)
  })

  it('confirmed and resolved mistakes reach the bus from the learning memory', () => {
    const evidence = (n: number, item: string, firstTry: boolean) => ({
      id: `run-${n}|q${n}`,
      skill: 'math:add:within10',
      item,
      at: new Date(Date.UTC(2026, 9, 24, 9, n)).toISOString(),
      firstTry,
      helpedBefore: false,
      review: false,
      errors: firstTry ? [] : ['off-by-one'],
      maxHint: 0 as const,
    })
    recordEvidence(KID, evidence(1, 'add:3+4', false))
    recordEvidence(KID, evidence(2, 'add:2+5', false))
    expect(types()).toContain('mistake.confirmed')
  })
})

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import routesSource from '@/app/routes.tsx?raw'
import { gardenPlants } from '@/domain/garden/garden'
import { applyEvidence, type Evidence, type SkillMemory } from '@/domain/learningMemory/memory'
import { en } from '@/i18n/locales/en'
import { ru } from '@/i18n/locales/ru'
import { uz } from '@/i18n/locales/uz'
import type { RecentRun } from '../history'
import { clearUniverseChild, emitActivity, emitUniverse, getResources } from '../store'
import type { ActivityCompleted } from '../types'
import { RESOURCE_IDS } from '../types'
import { FIRST_FLIGHT, JOURNEYS, UNLOCKS, type JourneyDef } from './content'
import { EMPTY_PROGRESS, journeyView, type WorldSnapshot } from './engine'
import { conditionNeeds, practiceQuests, smartQuests, worldState } from './quests'
import { installProgression, progressOf, subscribeDomainEvents, syncProgression } from './service'
import { EXPERIMENT_ACTIVITY } from '@/features/scienceLab/experiment'
import { CONTENT, validateProgression } from './validate'

const AT = '2026-10-24T09:00:00.000Z'
const NO_BALANCES = { star: 0, crystal: 0, seed: 0, part: 0, scroll: 0, key: 0 }
const run = (over: Partial<RecentRun>): RecentRun => ({
  id: 'r',
  activity: 'math-lab:count:L1',
  strand: 'number',
  at: AT,
  stars: 3,
  independent: 5,
  total: 5,
  ...over,
})
const world = (over: Partial<WorldSnapshot> = {}): WorldSnapshot => ({
  buildings: {},
  recent: [],
  balances: NO_BALANCES,
  ...over,
})

function quests(w: WorldSnapshot, plants = gardenPlants({})) {
  return smartQuests({
    journey: FIRST_FLIGHT,
    view: journeyView(FIRST_FLIGHT, EMPTY_PROGRESS, w),
    world: w,
    plants,
  })
}

describe('quest registry: the connected world can always be finished', () => {
  it('has no unknown reference, impossible value or cycle', () => {
    expect(validateProgression()).toEqual([])
  })

  it('catches a cycle, an unknown place and a stage a bed never reaches', () => {
    const broken = {
      ...CONTENT,
      unlocks: [
        { id: 'a', when: { kind: 'unlocked', id: 'b' } },
        { id: 'b', when: { kind: 'unlocked', id: 'a' } },
        { id: 'c', when: { kind: 'unlocked', id: 'nowhere' } },
        { id: 'd', when: { kind: 'plotStage', plot: 'mars', stage: 9 } },
        { id: 'e', when: { kind: 'building', id: 'castle', level: 1 } },
      ],
    } as never
    const problems = validateProgression(broken).join('\n')
    expect(problems).toMatch(/cycle: unlock:a → unlock:b → unlock:a/)
    expect(problems).toMatch(/nothing unlocks nowhere/)
    expect(problems).toMatch(/never reaches stage 9/)
    expect(problems).toMatch(/unknown building castle/)
  })

  it('every step has its words in uz, ru, en and leads to a real screen', () => {
    const paths = [...routesSource.matchAll(/'(\/[a-z][^'\s]*)'/g)].map((m) => m[1]!)
    for (const journey of JOURNEYS) {
      for (const step of journey.steps) {
        for (const texts of [uz, ru, en]) {
          const steps = texts.voyage.steps as Record<string, { title: string; text: string }>
          expect(steps[step.id]?.title, step.id).toBeTruthy()
          expect(steps[step.id]?.text, step.id).toBeTruthy()
        }
        expect(paths, step.route).toContain(step.route)
      }
    }
    for (const texts of [uz, ru, en]) {
      for (const resource of RESOURCE_IDS) expect(texts.quests.needs[resource]).toBeTruthy()
      expect(texts.quests.practice.title).toContain('{{skill}}')
    }
  })
})

describe('Smart Quest (deterministic, stable, explainable)', () => {
  it('a new child starts with the maths step; nothing to count yet', () => {
    const { main } = quests(world())
    expect(main).toMatchObject({ id: 'main:first-flight|math', route: '/math-lab', needs: [] })
    expect(main?.progress).toEqual({ done: 0, total: FIRST_FLIGHT.steps.length })
  })

  it('an unrelated activity (a dinosaur quiz) never completes the maths step', () => {
    const w = world({ recent: [run({ id: 'dino', activity: 'dino:quiz:L2', strand: 'science' })] })
    expect(quests(w).main?.id).toBe('main:first-flight|math')
  })

  it('the rocket step says what is still missing, instead of "locked"', () => {
    const w = world({ recent: [run({})], balances: { ...NO_BALANCES, part: 1 } })
    const { main } = quests(w)
    expect(main?.id).toBe('main:first-flight|rocket')
    expect(main?.needs).toEqual([{ resource: 'crystal', missing: 1 }])
    const ready = world({ recent: [run({})], balances: { ...NO_BALANCES, part: 1, crystal: 1 } })
    expect(quests(ready).main?.needs).toEqual([])
    const mars = UNLOCKS.find((item) => item.id === 'mars')!
    expect(conditionNeeds(mars.when, world())).toEqual([
      { resource: 'crystal', missing: 1 },
      { resource: 'part', missing: 1 },
    ])
  })

  it('a finished journey has no main quest', () => {
    const done = { ...EMPTY_PROGRESS, completed: { 'first-flight': AT } }
    const view = journeyView(FIRST_FLIGHT, done, world())
    expect(view.complete).toBe(true)
    expect(smartQuests({ journey: FIRST_FLIGHT, view, world: world(), plants: [] }).main).toBeNull()
  })

  it('optional quests: growing plants only, the youngest first, one per area, at most two, stable', () => {
    let n = 0
    const memory = (skill: string, extra: Partial<Evidence>[] = []): SkillMemory => {
      const ev = (over: Partial<Evidence>): Evidence => {
        n += 1
        return {
          id: `s${n}|q`,
          skill,
          item: `q:${n}`,
          at: new Date(Date.parse(AT) + n * 3_600_000).toISOString(),
          firstTry: false,
          helpedBefore: false,
          errors: ['wrong-choice'],
          maxHint: 0,
          review: false,
          ...over,
        }
      }
      let m: SkillMemory | undefined
      for (const e of [ev({}), ev({}), ...extra.map(ev)]) m = applyEvidence(m, e)
      return m!
    }
    const plants = gardenPlants({
      'math:add:within10': memory('math:add:within10', [{ firstTry: true, errors: [] }]),
      'math:sub:within10': memory('math:sub:within10'),
      'language:reading-words': memory('language:reading-words'),
      'science:dino-diet': memory('science:dino-diet'),
    })
    const optional = practiceQuests(plants)
    expect(optional.map((quest) => quest.skill)).toEqual([
      'math:sub:within10',
      'language:reading-words',
    ])
    expect(optional[0]).toMatchObject({
      kind: 'practice',
      route: '/math-lab?practice=sub%3Awithin10&from=garden',
      titleKey: 'quests.practice.title',
      // the garden's own next step (never a promise that cannot happen yet)
      textKey: 'practiceGarden.next.practise',
    })
    expect(practiceQuests(plants)).toEqual(optional)
    expect(practiceQuests([])).toEqual([])
  })

  it('every "run" step can really happen: an activity emits it', () => {
    for (const journey of JOURNEYS) {
      for (const step of journey.steps) {
        if (step.done.kind === 'run' && step.done.activityPrefix) {
          expect(EXPERIMENT_ACTIVITY.startsWith(step.done.activityPrefix), step.id).toBe(true)
        }
      }
    }
  })

  it('names the world’s lasting facts in one place', () => {
    const w = world({ buildings: { spaceport: 1 } })
    expect(worldState(EMPTY_PROGRESS, w)).toMatchObject({
      rocketBuilt: true,
      marsOpen: true,
      seedFound: false,
      flowerStage: -1,
      scienceLabOpen: false,
      journeyDone: false,
    })
  })
})

describe('quests in the store: profiles, idempotency, typed events', () => {
  let stop: () => void
  beforeEach(() => {
    for (const key of ['qa', 'qb']) clearUniverseChild(key)
    stop = installProgression()
  })
  afterEach(() => stop())

  const finish = (over: Partial<ActivityCompleted>): ActivityCompleted => ({
    id: 'run-1',
    childKey: 'qa',
    activity: 'math-lab:count:L1',
    strand: 'number',
    correct: 5,
    total: 5,
    independent: 5,
    at: new Date().toISOString(),
    ...over,
  })

  it('the same completion twice pays once; another child gets nothing', () => {
    emitActivity(finish({}))
    emitActivity(finish({}))
    expect(getResources('qa').crystal).toBe(1)
    expect(getResources('qb').crystal).toBe(0)
    expect('first-flight|math' in progressOf('qa').steps).toBe(true)
    syncProgression('qb')
    expect(progressOf('qb').steps).toEqual({})
  })

  it('mascots and sounds can listen to typed events (nothing unknown gets through)', () => {
    const seen: string[] = []
    const off = subscribeDomainEvents((event) => seen.push(event.type))
    emitUniverse({ type: 'not.a.domain.event', childKey: 'qa' })
    emitActivity(finish({ id: 'run-2' }))
    off()
    expect(seen).toContain('activity.completed')
    expect(seen).toContain('journey.step')
    expect(seen).not.toContain('not.a.domain.event')
  })

  it('a journey definition is data: a new chain needs no code', () => {
    const tiny: JourneyDef = {
      id: 'tiny',
      steps: [
        {
          id: 'math',
          done: { kind: 'run', strand: 'number', minStars: 1 },
          route: '/math-lab',
          icon: 'school',
        },
      ],
      reward: { resource: 'star', amount: 1 },
    }
    const view = journeyView(tiny, EMPTY_PROGRESS, world())
    expect(view.steps[0]?.status).toBe('current')
  })
})

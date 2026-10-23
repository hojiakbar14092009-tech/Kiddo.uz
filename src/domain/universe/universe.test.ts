import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { rewardHistory, useRewardStore } from '@/domain/rewards'
import { dailyPlanState } from '@/features/home/dailyPlan'
import { getLearnChild, useLearnStore } from '@/features/learn/learnStore'
import { useFamilyStore } from '@/store/familyStore'
import { GUEST_KEY, useProgressStore } from '@/store/progressStore'
import {
  ACHIEVEMENT_COINS,
  ACHIEVEMENTS,
  activityEffects,
  adventureState,
  BUILDINGS,
  claimDailyQuest,
  emitActivity,
  getAward,
  getDailyQuest,
  getResources,
  grantResource,
  PARTS_DAILY_CAP,
  QUEST_COINS,
  resourceHistory,
  spendResources,
  starsForRun,
  subscribeUniverse,
  tryClaimDailyQuest,
  universeChild,
  upgradeBuilding,
  useAchievements,
  useAdventure,
  useDailyQuest,
  useResources,
  useUniverseStore,
  useWorld,
  WORLDS,
  type ActivityCompleted,
  type UniverseChild,
  type UniverseEvent,
} from '.'

const galleryRemoved: string[] = []
vi.mock('@/features/studio/gallery', () => ({
  studioGallery: () => ({
    removeChild: (key: string) => {
      galleryRemoved.push(key)
      return Promise.resolve()
    },
  }),
}))

const KID = 'kid-1'
const MORNING = new Date(2026, 9, 18, 9, 0)
const NEXT_DAY = new Date(2026, 9, 19, 9, 0)

let counter = 0
function run(over: Partial<ActivityCompleted> = {}): ActivityCompleted {
  counter += 1
  return {
    id: `run-${counter}`,
    childKey: KID,
    activity: 'math:4',
    strand: 'number',
    correct: 5,
    total: 5,
    independent: 5,
    at: MORNING.toISOString(),
    ...over,
  }
}

const coinsOf = (key = KID) => useProgressStore.getState().byChild[key]?.coins ?? 0

function reset() {
  useProgressStore.setState({ byChild: {} })
  useRewardStore.setState({ byChild: {} })
  useLearnStore.setState({ byChild: {} })
  useUniverseStore.setState({ byChild: {} })
  useFamilyStore.setState({ children: [], activeChildId: null })
}

/** A page reload: memory is gone, the stores read localStorage again. */
async function reload() {
  const keys = ['kiddo.progress', 'kiddo.rewards', 'kiddo.learn', 'kiddo.universe']
  const saved = Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)]))
  reset()
  for (const [key, value] of Object.entries(saved)) {
    if (value !== null) localStorage.setItem(key, value)
  }
  await useProgressStore.persist.rehydrate()
  await useRewardStore.persist.rehydrate()
  await useLearnStore.persist.rehydrate()
  await useUniverseStore.persist.rehydrate()
}

describe('rules', () => {
  it('rates a run by its share of independent answers', () => {
    expect(starsForRun({ independent: 9, total: 10 })).toBe(3)
    expect(starsForRun({ independent: 8, total: 10 })).toBe(2)
    expect(starsForRun({ independent: 6, total: 10 })).toBe(2)
    expect(starsForRun({ independent: 5, total: 10 })).toBe(1)
    expect(starsForRun({ independent: 0, total: 0 })).toBe(1)
  })

  it('pays stars only for an improvement, a crystal only for the first 3 stars', () => {
    const base = { activity: 'math:4', strand: 'number' as const, total: 5 }
    const ctx = { previousBest: 0, partsToday: 0, partPaidToday: false }
    expect(activityEffects({ ...base, independent: 3 }, ctx)).toMatchObject({
      stars: 2,
      starGain: 2,
      crystals: 0,
    })
    expect(activityEffects({ ...base, independent: 3 }, { ...ctx, previousBest: 2 })).toMatchObject(
      { starGain: 0, crystals: 0 },
    )
    expect(activityEffects({ ...base, independent: 5 }, { ...ctx, previousBest: 2 })).toMatchObject(
      { stars: 3, starGain: 1, crystals: 1, parts: 1 },
    )
    expect(activityEffects({ ...base, independent: 5 }, { ...ctx, previousBest: 3 })).toMatchObject(
      { starGain: 0, crystals: 0, parts: 1 },
    )
  })

  it('caps parts per day and pays them for number activities only', () => {
    const three = { activity: 'math:4', total: 5, independent: 5 }
    const ctx = { previousBest: 0, partsToday: PARTS_DAILY_CAP, partPaidToday: false }
    expect(activityEffects({ ...three, strand: 'number' }, ctx).parts).toBe(0)
    expect(
      activityEffects(
        { ...three, strand: 'number' },
        { ...ctx, partsToday: 0, partPaidToday: true },
      ).parts,
    ).toBe(0)
    expect(activityEffects({ ...three, strand: 'reading' }, { ...ctx, partsToday: 0 }).parts).toBe(
      0,
    )
  })

  it('gives a scroll only for a tale read for the first time; seeds and keys are reserved', () => {
    const tale = { activity: 'tale:fox', strand: 'language' as const, total: 3, independent: 1 }
    const ctx = { previousBest: 0, partsToday: 0, partPaidToday: false }
    expect(activityEffects(tale, ctx)).toMatchObject({ scrolls: 1, seeds: 0, keys: 0 })
    expect(activityEffects(tale, { ...ctx, previousBest: 1 }).scrolls).toBe(0)
    expect(activityEffects({ ...tale, activity: 'words:4' }, ctx).scrolls).toBe(0)
  })
})

describe('emitActivity', () => {
  beforeEach(reset)

  it('grows the star resource only by the improvement over the best', () => {
    expect(emitActivity(run({ independent: 3 }))).toMatchObject({ stars: 2, starGain: 2 })
    expect(emitActivity(run({ independent: 3 }))).toMatchObject({ stars: 2, starGain: 0 })
    expect(emitActivity(run({ independent: 1 }))).toMatchObject({ stars: 1, starGain: 0 })
    const best = emitActivity(run())
    expect(best).toMatchObject({ stars: 3, starGain: 1, crystals: 1, parts: 1 })
    expect(emitActivity(run())).toMatchObject({ stars: 3, starGain: 0, crystals: 0, parts: 0 })
    expect(getResources(KID)).toMatchObject({ star: 3, crystal: 1, part: 1 })
    // A different activity has its own best.
    expect(emitActivity(run({ activity: 'math:5' }))).toMatchObject({ starGain: 3, crystals: 1 })
  })

  it('counts each run id once and remembers its award across a reload', async () => {
    const event = run()
    const award = emitActivity(event)
    expect(award.stars).toBe(3)
    expect(emitActivity(event)).toMatchObject({ stars: 0, crystals: 0, achievements: [] })
    await reload()
    expect(emitActivity(event)).toMatchObject({ stars: 0, crystals: 0, parts: 0 })
    expect(getAward(event.id, KID)).toEqual(award)
    expect(getResources(KID).crystal).toBe(1)
    expect(universeChild(KID).stats.activities).toBe(1)
  })

  it('pays at most one part per number activity a day and three a day in all', () => {
    expect(emitActivity(run()).parts).toBe(1)
    expect(emitActivity(run()).parts).toBe(0)
    for (const stage of ['5', '6', '7']) emitActivity(run({ activity: `math:${stage}` }))
    expect(getResources(KID).part).toBe(PARTS_DAILY_CAP)
    expect(emitActivity(run({ at: NEXT_DAY.toISOString() })).parts).toBe(1)
    expect(getResources(KID).part).toBe(PARTS_DAILY_CAP + 1)
  })

  it('gives one scroll per tale', () => {
    const tale = { activity: 'tale:fox', strand: 'language' as const }
    expect(emitActivity(run(tale)).scrolls).toBe(1)
    expect(emitActivity(run(tale)).scrolls).toBe(0)
    expect(emitActivity(run({ ...tale, activity: 'tale:bear' })).scrolls).toBe(1)
    expect(getResources(KID).scroll).toBe(2)
  })

  it('keeps a guest in memory only', async () => {
    emitActivity(run({ childKey: GUEST_KEY }))
    emitActivity(run())
    expect(getResources(GUEST_KEY).star).toBe(3)
    await reload()
    expect(getResources(GUEST_KEY).star).toBe(0)
    expect(getResources(KID).star).toBe(3)
  })

  it('tells subscribers about resources and activities; a failing listener changes nothing', () => {
    const seen: UniverseEvent[] = []
    const stop = subscribeUniverse((event) => seen.push(event))
    const failing = subscribeUniverse(() => {
      throw new Error('sync is down')
    })
    for (let i = 0; i < 3; i++) emitActivity(run())
    stop()
    failing()
    expect(seen.map((event) => event.type)).toEqual(
      expect.arrayContaining(['resource.changed', 'activity.completed', 'achievement.reached']),
    )
    expect(getResources(KID).star).toBe(3)
  })
})

describe('resources', () => {
  beforeEach(reset)

  it('grants once per (resource, reason, refId) and refuses bad amounts', () => {
    expect(
      grantResource({ childKey: KID, resource: 'seed', amount: 2, reason: 'x', refId: 'a' }),
    ).not.toBeNull()
    expect(
      grantResource({ childKey: KID, resource: 'seed', amount: 2, reason: 'x', refId: 'a' }),
    ).toBeNull()
    expect(
      grantResource({ childKey: KID, resource: 'seed', amount: 0, reason: 'x', refId: 'b' }),
    ).toBeNull()
    expect(
      grantResource({ childKey: KID, resource: 'seed', amount: -1, reason: 'x', refId: 'c' }),
    ).toBeNull()
    expect(getResources(KID).seed).toBe(2)
  })

  it('spends all or nothing, once per refId, and never spends stars', () => {
    grantResource({ childKey: KID, resource: 'crystal', amount: 3, reason: 'admin', refId: 'g' })
    grantResource({ childKey: KID, resource: 'part', amount: 1, reason: 'admin', refId: 'g' })
    const spend = (refId: string, cost: Record<string, number>) =>
      spendResources({ childKey: KID, cost, refId, reason: 'upgrade' })
    expect(spend('a', { crystal: 2, part: 2 })).toBe(false)
    expect(getResources(KID)).toMatchObject({ crystal: 3, part: 1 })
    expect(spend('b', { crystal: 2, part: 1 })).toBe(true)
    expect(spend('b', { crystal: 1 })).toBe(false)
    expect(spend('c', {})).toBe(false)
    expect(spend('d', { star: 1 })).toBe(false)
    expect(getResources(KID)).toMatchObject({ crystal: 1, part: 0 })
    expect(resourceHistory(KID).filter((entry) => entry.amount < 0)).toHaveLength(2)
  })
})

describe('world', () => {
  beforeEach(reset)

  it('has every building open at level 0 with three upgrades', () => {
    expect(BUILDINGS.map((b) => b.id)).toEqual([
      'math-land',
      'reading-house',
      'word-workshop',
      'writing-school',
      'observatory',
      'story-library',
      'garden',
      'robot-workshop',
      'art-studio',
      'friendship-house',
      'shop',
      'museum',
    ])
    for (const building of BUILDINGS) {
      expect(building.levels[0]).toEqual({ cost: {} })
      expect(building.levels).toHaveLength(4)
    }
  })

  it('upgrades by spending once, needs stars for higher levels, and stops at max', () => {
    const seen: UniverseEvent[] = []
    const stop = subscribeUniverse((event) => seen.push(event))
    expect(upgradeBuilding(KID, 'math-land')).toBe('missing')
    grantResource({ childKey: KID, resource: 'crystal', amount: 6, reason: 'admin', refId: 'g' })
    expect(upgradeBuilding(KID, 'math-land')).toBe('ok')
    expect(universeChild(KID).buildings['math-land']).toBe(1)
    expect(getResources(KID).crystal).toBe(5)
    // Level 2 also needs 10 stars earned.
    expect(upgradeBuilding(KID, 'math-land')).toBe('missing')
    grantResource({ childKey: KID, resource: 'star', amount: 30, reason: 'admin', refId: 'g' })
    expect(upgradeBuilding(KID, 'math-land')).toBe('ok')
    expect(upgradeBuilding(KID, 'math-land')).toBe('ok')
    expect(upgradeBuilding(KID, 'math-land')).toBe('max')
    expect(getResources(KID)).toMatchObject({ crystal: 0, star: 30 })
    expect(upgradeBuilding(KID, 'nowhere')).toBe('max')
    stop()
    expect(seen.filter((event) => event.type === 'building.upgraded')).toHaveLength(3)
  })

  it('makes workshops cost parts too', () => {
    grantResource({ childKey: KID, resource: 'crystal', amount: 1, reason: 'admin', refId: 'g' })
    expect(upgradeBuilding(KID, 'robot-workshop')).toBe('missing')
    grantResource({ childKey: KID, resource: 'part', amount: 1, reason: 'admin', refId: 'g' })
    expect(upgradeBuilding(KID, 'robot-workshop')).toBe('ok')
  })

  it('shows the next cost and what is missing', () => {
    useFamilyStore.setState({ activeChildId: KID })
    const { result } = renderHook(() => useWorld())
    const math = result.current.buildings.find((b) => b.id === 'math-land')!
    expect(math).toMatchObject({ level: 0, maxLevel: 3, route: '/math-lab' })
    expect(math.next).toEqual({ cost: { crystal: 1 }, missing: { crystal: 1 } })
    act(() => {
      grantResource({ childKey: KID, resource: 'crystal', amount: 1, reason: 'a', refId: 'g' })
    })
    act(() => {
      expect(result.current.upgrade('math-land')).toBe('ok')
    })
    const upgraded = result.current.buildings.find((b) => b.id === 'math-land')!
    expect(upgraded.level).toBe(1)
    expect(upgraded.next?.missing).toEqual({ crystal: 2, star: 10 })
  })
})

describe('achievements', () => {
  beforeEach(reset)

  it('records a tier once and pays its coins once', () => {
    emitActivity(run())
    expect(emitActivity(run()).achievements).toEqual([])
    expect(emitActivity(run()).achievements).toContain('first-steps|bronze')
    expect(emitActivity(run()).achievements).not.toContain('first-steps|bronze')
    const paid = rewardHistory(KID).filter((entry) => entry.refId === 'first-steps|bronze')
    expect(paid).toEqual([expect.objectContaining({ coins: ACHIEVEMENT_COINS.bronze })])
  })

  it('records every tier passed when a value jumps', () => {
    grantResource({ childKey: KID, resource: 'star', amount: 100, reason: 'admin', refId: 'g' })
    const award = emitActivity(run({ activity: 'x:1', strand: 'art', total: 0, independent: 0 }))
    expect(award.achievements).toEqual(
      expect.arrayContaining([
        'star-collector|bronze',
        'star-collector|silver',
        'star-collector|gold',
      ]),
    )
  })

  it('shows tier and progress for the active child', () => {
    useFamilyStore.setState({ activeChildId: KID })
    const { result } = renderHook(() => useAchievements())
    expect(result.current).toHaveLength(ACHIEVEMENTS.length)
    act(() => {
      for (let i = 0; i < 3; i++) emitActivity(run())
    })
    const first = result.current.find((a) => a.id === 'first-steps')!
    expect(first).toMatchObject({ tier: 'bronze', current: 3, next: 25 })
    const counter = result.current.find((a) => a.id === 'counter')!
    expect(counter).toMatchObject({ tier: null, current: 3, next: 5 })
  })

  it('only uses 3D pictures that exist', () => {
    const icons = [
      ...ACHIEVEMENTS.map((a) => a.icon3d),
      ...BUILDINGS.map((b) => b.icon3d),
      ...WORLDS.map((w) => w.icon3d),
    ]
    const pictures = Object.keys(import.meta.glob('/public/3d/*.webp'))
    for (const icon of icons) expect(pictures, icon).toContain(`/public/3d/${icon}.webp`)
  })
})

describe('daily quest', () => {
  beforeEach(reset)

  const play = (type: 'find-letter' | 'find-picture' | 'trace', now: Date) =>
    useProgressStore
      .getState()
      .completeTask(KID, { type, language: 'uz', letterIds: ['a'], mistakeDetails: [] }, now)

  it('is today’s plan and can be claimed once per day', async () => {
    expect(claimDailyQuest(KID, MORNING)).toBeNull()
    play('find-letter', MORNING)
    play('find-picture', MORNING)
    expect(getDailyQuest(KID, MORNING).steps.map((s) => s.status)).toEqual(['done', 'done', 'next'])
    play('trace', MORNING)
    const quest = getDailyQuest(KID, MORNING)
    expect(quest).toMatchObject({ complete: true, claimed: false })
    const coinsBefore = coinsOf()
    const award = claimDailyQuest(KID, MORNING)
    expect(award).toMatchObject({ crystals: 1, stars: 0 })
    expect(coinsOf() - coinsBefore).toBe(
      QUEST_COINS +
        (award?.achievements ?? []).reduce(
          (sum, key) => sum + ACHIEVEMENT_COINS[key.split('|')[1] as 'bronze'],
          0,
        ),
    )
    expect(claimDailyQuest(KID, MORNING)).toBeNull()
    await reload()
    expect(claimDailyQuest(KID, MORNING)).toBeNull()
    expect(getDailyQuest(KID, MORNING).claimed).toBe(true)
    expect(rewardHistory(KID).filter((e) => e.reason === 'quest')).toHaveLength(1)
    expect(getDailyQuest(KID, NEXT_DAY)).toMatchObject({ complete: false, claimed: false })
  })

  it('counts a finished learning section when the plan contains it', () => {
    const plan = dailyPlanState([], '2026-10-18', 4, ['memory', 'math'])
    expect(plan.steps.map((step) => step.status)).toEqual(['next', 'done'])
  })

  it('gives the active child steps, reward and claim', () => {
    const { result } = renderHook(() => useDailyQuest())
    expect(result.current.steps.map((s) => s.activity)).toEqual([
      'find-letter',
      'find-picture',
      'trace',
    ])
    expect(result.current.reward).toEqual({ crystals: 1, coins: QUEST_COINS })
    expect(result.current.claim()).toBeNull()
  })
})

describe('adventure', () => {
  it('opens worlds at 0, 6, 14, 24, 36 and 50 stars', () => {
    expect(WORLDS.map((w) => [w.id, w.starsNeeded])).toEqual([
      ['forest', 0],
      ['ocean', 6],
      ['dinosaur', 14],
      ['space', 24],
      ['science', 36],
      ['uzbekistan', 50],
    ])
    const unlocked = (stars: number) =>
      adventureState(stars, {})
        .filter((w) => w.unlocked)
        .map((w) => w.id)
    expect(unlocked(0)).toEqual(['forest'])
    expect(unlocked(5)).toEqual(['forest'])
    expect(unlocked(6)).toEqual(['forest', 'ocean'])
    expect(unlocked(49)).toHaveLength(5)
    expect(unlocked(50)).toHaveLength(6)
    // 'Coming soon' worlds are drawn but never where the child stands.
    expect(adventureState(14, {}).find((w) => w.current)?.id).toBe('ocean')
    expect(adventureState(60, {}).find((w) => w.current)?.id).toBe('science')
  })

  it('shows the best stars per activity and marks future worlds', () => {
    const map = adventureState(0, {
      'words:4': 2,
      'words:6': 3,
      'find-letter:uz': 1,
      'math:4': 2,
      'feelings:faces:basic': 2,
    })
    const forest = map[0]!
    expect(forest.activities.map((a) => [a.activity, a.route, a.bestStars])).toEqual([
      ['alphabet', '/alphabet', 1],
      ['words', '/learn/words', 3],
      ['garden', '/learn/garden', 0],
      ['feelings', '/feelings', 2],
    ])
    expect(map.find((w) => w.id === 'dinosaur')).toMatchObject({ comingSoon: true })
    // Learning routes are open even in a world not unlocked yet; only future routes are not.
    expect(map.find((w) => w.id === 'science')).toMatchObject({ unlocked: false })
    expect(map.find((w) => w.id === 'science')?.activities.every((a) => a.open)).toBe(true)
    expect(map.find((w) => w.id === 'dinosaur')?.activities.every((a) => !a.open)).toBe(true)
    expect(map.find((w) => w.id === 'uzbekistan')?.activities[0]?.route).toBe('/worlds/uzbekistan')
  })

  it('follows the active child’s stars', () => {
    reset()
    useFamilyStore.setState({ activeChildId: KID })
    const { result } = renderHook(() => ({ map: useAdventure(), resources: useResources() }))
    act(() => {
      emitActivity(run())
      emitActivity(run({ activity: 'math:5' }))
    })
    expect(result.current.resources.star).toBe(6)
    expect(result.current.map.find((w) => w.current)?.id).toBe('ocean')
    expect(result.current.map[1]?.activities[0]?.bestStars).toBe(3)
  })
})

describe('wiring', () => {
  beforeEach(reset)

  it('completeTask counts the result once', async () => {
    useProgressStore
      .getState()
      .completeTask(
        KID,
        { type: 'memory', language: 'uz', letterIds: ['a'], mistakeDetails: [] },
        MORNING,
      )
    const result = useProgressStore.getState().byChild[KID]!.results[0]!
    const award = getAward(result.id, KID)
    expect(award).toMatchObject({ stars: 3, starGain: 3, crystals: 1 })
    expect(universeChild(KID).best['memory:uz']).toBe(3)
    expect(universeChild(KID).stats.byStrand.logic).toBe(1)
    await reload()
    expect(getAward(result.id, KID)).toEqual(award)
    expect(getResources(KID).star).toBe(3)
  })

  it('rates a game with mistakes like the game does', () => {
    useProgressStore.getState().completeTask(
      KID,
      {
        type: 'find-letter',
        language: 'ru',
        letterIds: ['a'],
        mistakeDetails: [{ targetId: 'a', chosenId: 'b' }],
      },
      MORNING,
    )
    const result = useProgressStore.getState().byChild[KID]!.results[0]!
    expect(getAward(result.id, KID)?.stars).toBe(result.stars)
  })

  it('finishSession counts a session once, and a tale pays a scroll', async () => {
    const session = {
      id: 'session-1',
      section: 'tales' as const,
      stage: 'fox',
      language: 'uz' as const,
      mode: 'learn' as const,
      total: 3,
      independent: 3,
      helped: 0,
      wrong: 0,
      weakSkills: [],
      strongSkills: ['a'],
    }
    useLearnStore.getState().finishSession(KID, session)
    expect(getAward('session-1', KID)).toMatchObject({ stars: 3, scrolls: 1 })
    await reload()
    useLearnStore.getState().finishSession(KID, session)
    useLearnStore.getState().finishSession(KID, { ...session, id: 'session-2' })
    expect(getResources(KID)).toMatchObject({ scroll: 1, star: 3, crystal: 1 })
    expect(universeChild(KID).stats.activities).toBe(2)
    expect(universeChild(KID).best['tale:fox']).toBe(3)
  })

  it('maps learning sections to strands', () => {
    const finish = (id: string, section: 'words' | 'math' | 'space' | 'garden' | 'help') =>
      useLearnStore.getState().finishSession(KID, {
        id,
        section,
        stage: '4',
        language: 'any',
        mode: 'learn',
        total: 2,
        independent: 1,
        helped: 0,
        wrong: 1,
        weakSkills: [],
        strongSkills: [],
      })
    finish('a', 'words')
    finish('b', 'math')
    finish('c', 'space')
    finish('d', 'garden')
    finish('e', 'help')
    expect(universeChild(KID).stats.byStrand).toEqual({
      reading: 1,
      number: 1,
      space: 1,
      science: 1,
      logic: 1,
    })
  })

  it('forgets a removed child’s universe', () => {
    const child = useFamilyStore
      .getState()
      .addChild({ name: 'Ali', birthDate: '2021-01-01', gender: 'boy' })
    emitActivity(run({ childKey: child.id }))
    expect(getResources(child.id).star).toBe(3)
    useFamilyStore.getState().removeChild(child.id)
    expect(useUniverseStore.getState().byChild[child.id]).toBeUndefined()
    expect(getLearnChild(child.id).sessions).toHaveLength(0)
  })

  it('starts a guest fresh, studio pictures included', async () => {
    emitActivity(run({ childKey: GUEST_KEY }))
    useProgressStore.getState().startGuest()
    expect(getResources(GUEST_KEY).star).toBe(0)
    await vi.waitFor(() => expect(galleryRemoved).toContain(GUEST_KEY))
  })
})

describe('creative work cannot be farmed', () => {
  beforeEach(reset)

  const picture = () =>
    run({ activity: 'studio:creation', strand: 'art', correct: 1, total: 1, independent: 1 })

  it('rates a studio picture 1 star, once, and never pays a crystal', () => {
    expect(
      activityEffects(
        { activity: 'studio:creation', strand: 'art', total: 1, independent: 1 },
        {
          previousBest: 0,
          partsToday: 0,
          partPaidToday: false,
        },
      ),
    ).toMatchObject({ stars: 1, crystals: 0 })
    expect(emitActivity(picture())).toMatchObject({ stars: 1, starGain: 1, crystals: 0 })
    for (let i = 0; i < 20; i++) emitActivity(picture())
    expect(getResources(KID)).toMatchObject({ star: 1, crystal: 0 })
  })

  it('counts art once a day for medals and never as an activity', () => {
    for (let i = 0; i < 20; i++) emitActivity(picture())
    for (let i = 0; i < 5; i++) {
      emitActivity(run({ activity: `trace:shape:s${i}`, strand: 'art' }))
    }
    const stats = universeChild(KID).stats
    expect(stats.activities).toBe(0)
    expect(stats.byStrand.art).toBe(1)
    expect(stats.daysActive).toBe(1)
    emitActivity(picture())
    emitActivity({ ...picture(), at: NEXT_DAY.toISOString() })
    expect(universeChild(KID).stats.byStrand.art).toBe(2)
    const medals = rewardHistory(KID).filter((e) => e.reason === 'achievement')
    // Distinct shapes may earn star and crystal medals; repetition earns none.
    expect(medals.map((e) => e.refId.split('|')[0])).not.toContain('first-steps')
    expect(medals.map((e) => e.refId.split('|')[0])).not.toContain('artist')
  })

  it('pays a traced shape its stars and crystal once, like any activity', () => {
    const shape = { activity: 'trace:shape:circle', strand: 'art' as const }
    expect(emitActivity(run(shape))).toMatchObject({ stars: 3, crystals: 1 })
    expect(emitActivity(run(shape))).toMatchObject({ starGain: 0, crystals: 0, parts: 0 })
  })
})

describe('daily quest across midnight', () => {
  beforeEach(reset)

  const LATE = new Date(2026, 9, 18, 23, 50)
  const AFTER_MIDNIGHT = new Date(2026, 9, 19, 0, 10)
  const DAY_AFTER = new Date(2026, 9, 20, 9, 0)
  const finishPlan = (now: Date) => {
    for (const type of ['find-letter', 'find-picture', 'trace'] as const) {
      useProgressStore
        .getState()
        .completeTask(KID, { type, language: 'uz', letterIds: ['a'], mistakeDetails: [] }, now)
    }
  }

  it('keeps yesterday’s completed quest claimable until today’s is claimed', () => {
    finishPlan(LATE)
    const shown = getDailyQuest(KID, AFTER_MIDNIGHT)
    expect(shown).toMatchObject({ day: '2026-10-18', complete: true, claimed: false })
    expect(tryClaimDailyQuest(KID, '2026-10-19', AFTER_MIDNIGHT)).toEqual({
      award: null,
      reason: 'not-complete',
    })
    expect(tryClaimDailyQuest(KID, undefined, AFTER_MIDNIGHT).award).toMatchObject({ crystals: 1 })
    expect(tryClaimDailyQuest(KID, '2026-10-18', AFTER_MIDNIGHT).reason).toBe('claimed')
    expect(getDailyQuest(KID, AFTER_MIDNIGHT)).toMatchObject({ day: '2026-10-19', claimed: false })
  })

  it('says why a claim gives nothing', () => {
    finishPlan(LATE)
    expect(tryClaimDailyQuest(KID, '2026-10-18', DAY_AFTER).reason).toBe('expired')
    expect(tryClaimDailyQuest(KID, '2026-10-21', DAY_AFTER).reason).toBe('future')
    expect(getDailyQuest(KID, DAY_AFTER)).toMatchObject({ day: '2026-10-20', complete: false })
    // Once today's quest is claimed, yesterday's is gone.
    finishPlan(AFTER_MIDNIGHT)
    expect(claimDailyQuest(KID, '2026-10-19', AFTER_MIDNIGHT)).not.toBeNull()
    expect(tryClaimDailyQuest(KID, '2026-10-18', AFTER_MIDNIGHT).reason).toBe('expired')
  })

  it('gives the hook the quest’s own day and a reason', () => {
    useFamilyStore.setState({ activeChildId: KID })
    const { result } = renderHook(() => useDailyQuest())
    expect(result.current.day).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.current.tryClaim()).toEqual({ award: null, reason: 'not-complete' })
  })
})

describe('two tabs', () => {
  beforeEach(reset)

  /** What another tab does: it writes its own copy of the store to localStorage. */
  function otherTabWrites(change: (state: { byChild: Record<string, UniverseChild> }) => void) {
    const saved = JSON.parse(localStorage.getItem('kiddo.universe')!) as {
      state: { byChild: Record<string, UniverseChild> }
    }
    change(saved.state)
    localStorage.setItem('kiddo.universe', JSON.stringify(saved))
  }

  it('re-reads balances before spending what another tab already spent', () => {
    grantResource({ childKey: KID, resource: 'crystal', amount: 1, reason: 'admin', refId: 'g' })
    otherTabWrites((state) => {
      const child = state.byChild[KID]!
      child.balances.crystal = 0
      child.ledger = {
        ...child.ledger,
        keys: ['crystal|upgrade|upgrade|math-land|1', ...child.ledger.keys],
      }
      child.buildings = { 'math-land': 1 }
    })
    expect(upgradeBuilding(KID, 'math-land')).toBe('missing')
    expect(getResources(KID).crystal).toBe(0)
    expect(universeChild(KID).buildings['math-land']).toBe(1)
  })

  it('follows storage events and keeps the guest in memory', async () => {
    emitActivity(run({ childKey: GUEST_KEY }))
    grantResource({ childKey: KID, resource: 'seed', amount: 1, reason: 'admin', refId: 'g' })
    otherTabWrites((state) => {
      state.byChild[KID]!.balances.seed = 7
    })
    window.dispatchEvent(new StorageEvent('storage', { key: 'kiddo.universe' }))
    await vi.waitFor(() => expect(getResources(KID).seed).toBe(7))
    expect(getResources(GUEST_KEY).star).toBe(3)
  })
})

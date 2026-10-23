import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { GUEST_KEY } from '@/domain/childKey'
import { appendIdempotent, hasKey, type LedgerBook } from '@/domain/ledger'
import { grantReward, useRewardStore } from '@/domain/rewards/rewardStore'
import { useProgressStore } from '@/store/progressStore'
import { newId } from '@/lib/id'
import {
  ACHIEVEMENT_COINS,
  achievementKey,
  countRun,
  EMPTY_STATS,
  newTiers,
  type UniverseStats,
} from './achievements'
import { applyRun, childAgeFor, levelOf, type LearnerStrands } from '@/domain/learner/profile'
import { activityEffects } from './rules'
import {
  isResourceId,
  RESOURCE_IDS,
  type ActivityCompleted,
  type AwardSummary,
  type ResourceEntry,
  type ResourceId,
  type Tier,
  type UniverseEvent,
} from './types'

/*
 * The universe store (`kiddo.universe`, per child; a guest is never saved,
 * like coins). Everything a child earns here is written once:
 * - resources go through an idempotent ledger keyed `resource|reason|refId`,
 *   and the balances move with it in the same update;
 * - an activity run (`emitActivity`) is counted once per id; its award is
 *   kept so a result screen can show it again after a reload;
 * - an achievement tier is recorded once and pays its coins once.
 * Every call is synchronous, so a double tap or a parallel call cannot pay twice.
 *
 * Callers outside the domain call these functions inside their actions only
 * (never at module load), which keeps the store graph free of load-time cycles.
 */

export const UNIVERSE_LIMITS = { maxEntries: 1000, maxKeys: 2000 } as const
/** Activity ids remembered for idempotency, and awards kept for result screens. */
const MAX_PROCESSED = 2000
const MAX_AWARDS = 200
const MAX_CLAIMED_DAYS = 60

export interface StoredAward {
  id: string
  award: AwardSummary
}

export interface UniverseChild {
  balances: Record<ResourceId, number>
  ledger: LedgerBook<ResourceEntry>
  /** Best stars per activity id (an activity seen once stays here for good). */
  best: Record<string, number>
  stats: UniverseStats
  /** Parts earned on `day` (resets on a new day). */
  partsDay: { day: string; count: number } | null
  /** Activity run ids already counted, newest first. */
  processed: string[]
  /** Awards of recent runs, newest first. */
  awards: StoredAward[]
  /** Highest tier recorded per achievement. */
  achievements: Record<string, Tier>
  /** Building id → level (missing: level 0). */
  buildings: Record<string, number>
  /** Days whose daily quest was claimed, newest first. */
  questsClaimed: string[]
  /** LearnerProfile: challenge level per strand (domain/learner). */
  strands?: LearnerStrands
}

export const EMPTY_BALANCES: Record<ResourceId, number> = Object.freeze(
  Object.fromEntries(RESOURCE_IDS.map((id) => [id, 0])) as Record<ResourceId, number>,
)

export const EMPTY_UNIVERSE_CHILD: UniverseChild = Object.freeze({
  balances: EMPTY_BALANCES,
  ledger: Object.freeze({ entries: [], keys: [] }),
  best: Object.freeze({}),
  stats: EMPTY_STATS,
  partsDay: null,
  processed: [],
  awards: [],
  achievements: Object.freeze({}),
  buildings: Object.freeze({}),
  questsClaimed: [],
}) as UniverseChild

interface UniverseState {
  byChild: Record<string, UniverseChild>
}

export const useUniverseStore = create<UniverseState>()(
  persist(() => ({ byChild: {} as Record<string, UniverseChild> }), {
    name: 'kiddo.universe',
    version: 1,
    partialize: (state) => {
      const byChild = { ...state.byChild }
      delete byChild[GUEST_KEY]
      return { byChild }
    },
  }),
)

// ---------------------------------------------------------------- other tabs

export const UNIVERSE_STORAGE_KEY = 'kiddo.universe'
const REWARDS_STORAGE_KEY = 'kiddo.rewards'
/** Coin balances, owned items and results (src/store/progressStore). */
const PROGRESS_STORAGE_KEY = 'kiddo.progress'

interface PerChildStore {
  getState: () => { byChild: Record<string, unknown> }
  setState: (change: (state: { byChild: Record<string, unknown> }) => object) => void
  persist: { rehydrate: () => Promise<void> | void }
}

/**
 * Re-reads a per-child store from localStorage (another tab wrote it). The
 * guest is never saved, so the one in memory is put back afterwards.
 */
function rehydrateKeepingGuest(store: PerChildStore): Promise<void> {
  const guest = store.getState().byChild[GUEST_KEY]
  const restore = () => {
    if (guest === undefined || store.getState().byChild[GUEST_KEY] === guest) return
    store.setState((state) => ({ byChild: { ...state.byChild, [GUEST_KEY]: guest } }))
  }
  const done = Promise.resolve(store.persist.rehydrate()).then(restore)
  // localStorage is synchronous: the state is already re-read here.
  restore()
  return done
}

/** Brings the universe, the coin ledger and the coin balances up to date with another tab. */
export function reloadFromOtherTabs(key: string | null = UNIVERSE_STORAGE_KEY): Promise<void> {
  if (key === PROGRESS_STORAGE_KEY) {
    return rehydrateKeepingGuest(useProgressStore as unknown as PerChildStore)
  }
  if (key === REWARDS_STORAGE_KEY) {
    return rehydrateKeepingGuest(useRewardStore as unknown as PerChildStore)
  }
  if (key === UNIVERSE_STORAGE_KEY || key === null) {
    return rehydrateKeepingGuest(useUniverseStore as unknown as PerChildStore)
  }
  return Promise.resolve()
}

if (typeof window !== 'undefined') {
  // Called later (never at load), so the store graph has finished loading by then.
  window.addEventListener('storage', (event) => {
    if (event.storageArea && event.storageArea !== window.localStorage) return
    void reloadFromOtherTabs(event.key)
  })
}

/**
 * Has another tab written newer resources for this child than this tab holds?
 * Compares the newest ledger key in localStorage with the one in memory.
 */
function savedIsNewer(childKey: string): boolean {
  if (childKey === GUEST_KEY) return false
  try {
    const raw = window.localStorage.getItem(UNIVERSE_STORAGE_KEY)
    if (!raw) return false
    const saved = (JSON.parse(raw) as { state?: UniverseState }).state?.byChild?.[childKey]
    const savedKeys = saved?.ledger?.keys ?? []
    const memoryKeys = universeChild(childKey).ledger.keys
    return savedKeys.length > 0 && savedKeys[0] !== memoryKeys[0]
  } catch {
    return false
  }
}

/** Re-reads the saved universe when another tab changed this child (before a spend or claim). */
export function refreshIfStale(childKey: string): void {
  if (savedIsNewer(childKey)) void reloadFromOtherTabs(UNIVERSE_STORAGE_KEY)
}

export function universeChild(childKey: string): UniverseChild {
  return useUniverseStore.getState().byChild[childKey] ?? EMPTY_UNIVERSE_CHILD
}

function update(childKey: string, change: (child: UniverseChild) => UniverseChild) {
  useUniverseStore.setState((state) => ({
    byChild: {
      ...state.byChild,
      [childKey]: change(state.byChild[childKey] ?? EMPTY_UNIVERSE_CHILD),
    },
  }))
}

// ---------------------------------------------------------------- events

type Listener = (event: UniverseEvent) => void
const listeners = new Set<Listener>()

/**
 * Domain events: `resource.changed` { entry }, `activity.completed` { activityId,
 * award }, `achievement.reached` { id, tier }, `quest.claimed` { day, award },
 * `building.upgraded` { id, level }. Returns an unsubscribe.
 */
export function subscribeUniverse(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function emitUniverse(event: UniverseEvent) {
  for (const listener of listeners) {
    try {
      listener(event)
    } catch {
      // A failing listener (e.g. sync) never undoes or blocks a change.
    }
  }
}

// ---------------------------------------------------------------- resources

const keyOf = (resource: ResourceId, reason: string, refId: string) =>
  `${resource}|${reason}|${refId}`

/** Low level: writes one entry and moves the balance, unless the key exists. */
function record(
  childKey: string,
  resource: ResourceId,
  amount: number,
  reason: string,
  refId: string,
): ResourceEntry | null {
  const key = keyOf(resource, reason, refId)
  const current = universeChild(childKey)
  if (hasKey(current.ledger, key)) return null
  const entry: ResourceEntry = {
    id: newId(),
    childKey,
    resource,
    amount,
    reason,
    refId,
    at: new Date().toISOString(),
  }
  const ledger = appendIdempotent(current.ledger, entry, key, UNIVERSE_LIMITS)
  if (!ledger) return null
  update(childKey, (child) => ({
    ...child,
    ledger,
    balances: {
      ...child.balances,
      [resource]: Math.max(0, (child.balances[resource] ?? 0) + amount),
    },
    stats:
      amount > 0
        ? {
            ...child.stats,
            earned: {
              ...child.stats.earned,
              [resource]: (child.stats.earned[resource] ?? 0) + amount,
            },
          }
        : child.stats,
  }))
  emitUniverse({ type: 'resource.changed', childKey, entry })
  return entry
}

function validRef(childKey: string, reason: string, refId: string) {
  return Boolean(childKey && reason && refId)
}

/**
 * Gives a resource once per (child, resource, reason, refId). Refuses (`null`)
 * a repeat, an unknown resource, and amounts that are not positive after rounding.
 */
export function grantResource(p: {
  childKey: string
  resource: ResourceId
  amount: number
  reason: string
  refId: string
}): ResourceEntry | null {
  const amount = Math.round(p.amount)
  if (!Number.isFinite(amount) || amount <= 0 || !isResourceId(p.resource)) return null
  if (!validRef(p.childKey, p.reason, p.refId)) return null
  return record(p.childKey, p.resource, amount, p.reason, p.refId)
}

/**
 * Spends several resources at once: all of them or none. Returns true only
 * when it spent now; false when the child lacks any of them, the cost is
 * empty or invalid, stars are asked for (stars are a measure, never spent),
 * or this refId was spent before (a repeat changes nothing).
 */
export function spendResources(p: {
  childKey: string
  cost: Partial<Record<ResourceId, number>>
  refId: string
  reason: string
}): boolean {
  if (!validRef(p.childKey, p.reason, p.refId)) return false
  const parts: [ResourceId, number][] = []
  for (const [resource, raw] of Object.entries(p.cost)) {
    const amount = Math.round(raw ?? 0)
    if (!isResourceId(resource) || !Number.isFinite(amount) || amount < 0) return false
    if (resource === 'star' && amount > 0) return false
    if (amount > 0) parts.push([resource, amount])
  }
  if (parts.length === 0) return false
  // Another tab may have spent (or earned) since: check the saved balances first.
  refreshIfStale(p.childKey)
  const child = universeChild(p.childKey)
  for (const [resource, amount] of parts) {
    if (hasKey(child.ledger, keyOf(resource, p.reason, p.refId))) return false
    if ((child.balances[resource] ?? 0) < amount) return false
  }
  for (const [resource, amount] of parts) record(p.childKey, resource, -amount, p.reason, p.refId)
  return true
}

export function getResources(childKey: string): Record<ResourceId, number> {
  return { ...EMPTY_BALANCES, ...universeChild(childKey).balances }
}

/** The child's resource ledger, newest first (bounded history). */
export function resourceHistory(childKey: string): readonly ResourceEntry[] {
  return universeChild(childKey).ledger.entries
}

// ---------------------------------------------------------------- achievements

/**
 * Records every tier newly reached by the child's stats and pays its coins
 * (once per tier, also guarded by the rewards ledger). Returns the keys.
 */
export function checkAchievements(childKey: string): string[] {
  const child = universeChild(childKey)
  const fresh = newTiers(child.stats, child.achievements)
  if (fresh.length === 0) return []
  update(childKey, (latest) => {
    const achievements = { ...latest.achievements }
    for (const [id, tier] of fresh) achievements[id] = tier
    return { ...latest, achievements }
  })
  const keys: string[] = []
  for (const [id, tier] of fresh) {
    const key = achievementKey(id, tier)
    keys.push(key)
    grantReward({ childKey, coins: ACHIEVEMENT_COINS[tier], reason: 'achievement', refId: key })
    emitUniverse({ type: 'achievement.reached', childKey, id, tier })
  }
  return keys
}

// ---------------------------------------------------------------- activities

function zeroAward(): AwardSummary {
  return { stars: 0, crystals: 0, parts: 0, scrolls: 0, achievements: [], starGain: 0 }
}

/** Local calendar day (YYYY-MM-DD), the same as the daily plan. */
export function localDay(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/**
 * Counts a finished activity once (by `e.id`) and pays what it earned:
 * stars (improvement only), crystals, parts, scrolls, and any achievement
 * tiers reached. Returns the award, or zeros when this id was counted before.
 */
/** Moves the strand only for an adaptive run played at the child's current level. */
function adaptStrands(
  strands: LearnerStrands | undefined,
  e: ActivityCompleted,
  childKey: string,
): LearnerStrands | undefined {
  if (e.level === undefined) return strands
  const age = childAgeFor(childKey)
  if (e.level !== levelOf(strands, e.strand, age)) return strands
  return { ...strands, [e.strand]: applyRun(strands?.[e.strand], e, age) }
}

export function emitActivity(e: ActivityCompleted): AwardSummary {
  const { childKey, id, activity } = e
  if (!childKey || !id || !activity) return zeroAward()
  const before = universeChild(childKey)
  if (before.processed.includes(id)) return zeroAward()

  const when = e.at ? new Date(e.at) : new Date()
  const day = localDay(Number.isNaN(when.getTime()) ? new Date() : when)
  const previousBest = before.best[activity] ?? 0
  const partsToday = before.partsDay?.day === day ? before.partsDay.count : 0
  const partRef = `${activity}|${day}`
  const effects = activityEffects(e, {
    previousBest,
    partsToday,
    partPaidToday: hasKey(before.ledger, keyOf('part', 'number-3star', partRef)),
  })

  // Count the run first, so even a failing grant below cannot count it twice.
  update(childKey, (child) => ({
    ...child,
    processed: [id, ...child.processed].slice(0, MAX_PROCESSED),
    best: { ...child.best, [activity]: Math.max(child.best[activity] ?? 0, effects.stars) },
    stats: countRun(child.stats, e.strand, day),
    strands: adaptStrands(child.strands, e, childKey),
  }))

  const award: AwardSummary = { ...zeroAward(), stars: effects.stars }
  if (effects.starGain > 0) {
    const entry = record(childKey, 'star', effects.starGain, 'activity', id)
    award.starGain = entry?.amount ?? 0
  }
  if (
    effects.crystals > 0 &&
    record(childKey, 'crystal', effects.crystals, 'three-stars', activity)
  ) {
    award.crystals = effects.crystals
  }
  if (effects.parts > 0 && record(childKey, 'part', effects.parts, 'number-3star', partRef)) {
    award.parts = effects.parts
    update(childKey, (child) => ({
      ...child,
      partsDay: { day, count: (child.partsDay?.day === day ? child.partsDay.count : 0) + 1 },
    }))
  }
  if (effects.scrolls > 0 && record(childKey, 'scroll', effects.scrolls, 'tale', activity)) {
    award.scrolls = effects.scrolls
  }
  award.achievements = checkAchievements(childKey)

  update(childKey, (child) => ({
    ...child,
    awards: [{ id, award }, ...child.awards].slice(0, MAX_AWARDS),
  }))
  emitUniverse({ type: 'activity.completed', childKey, activityId: id, activity, award })
  return award
}

/** What a run earned when it was counted (null: unknown or too old). */
export function getAward(activityId: string, childKey: string): AwardSummary | null {
  return universeChild(childKey).awards.find((item) => item.id === activityId)?.award ?? null
}

// ---------------------------------------------------------------- world & quests (low level)

export function setBuildingLevel(childKey: string, id: string, level: number) {
  update(childKey, (child) => ({ ...child, buildings: { ...child.buildings, [id]: level } }))
}

export function markQuestClaimed(childKey: string, day: string) {
  update(childKey, (child) => ({
    ...child,
    questsClaimed: [day, ...child.questsClaimed.filter((item) => item !== day)].slice(
      0,
      MAX_CLAIMED_DAYS,
    ),
  }))
}

/** Forgets a child's universe (the child was removed, or a guest starts fresh). */
export function clearUniverseChild(childKey: string): void {
  if (!useUniverseStore.getState().byChild[childKey]) return
  useUniverseStore.setState((state) => {
    const byChild = { ...state.byChild }
    delete byChild[childKey]
    return { byChild }
  })
}

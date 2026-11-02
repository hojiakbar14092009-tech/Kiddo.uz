import type { SupabaseClient } from '@supabase/supabase-js'
import { rememberRewards, type RewardEntry, type RewardReason } from '@/domain/rewards'
import { AGE_LEVELS, type AgeLevel } from '@/features/age/ageLevel'
import { useLearnStore, type LearnChild } from '@/features/learn/learnStore'
import { useFamilyStore, type ChildProfile, type Gender } from '@/store/familyStore'
import { useSyncStore } from './syncQueue'
import {
  EMPTY_PROGRESS,
  useProgressStore,
  type ChildProgress,
  type TaskResult,
} from '@/store/progressStore'

/*
 * Two-way sync, the cloud → device half (Phase 44). Signing in on a device brings the
 * account's children that this device does not have: their profiles, coins, learned letters,
 * stickers, clothes, pets, screen time, recent results and learning data. Rewards the server
 * already gave are remembered by their run id (`rememberRewards`), so a run played on another
 * device never pays twice here. A child already on this device keeps its own data (it is the
 * newer copy and goes up to the cloud as usual). The child's photo is not part of this (it is
 * fetched separately, only when the parent keeps photos in the cloud).
 */

/** The most recent results brought back per child (the device keeps 300). */
const RESULTS_LIMIT = 300
/** Rewards remembered per child (the device remembers 2000 keys). */
const REWARDS_LIMIT = 2000

export interface CloudChildRow {
  id: string
  name: string
  birth_date: string | null
  age: number
  celebrated_level: number | null
  gender: string
  mascot: string
  daily_limit_minutes: number
  homework: unknown
  created_at: string
}

export interface CloudStateRow {
  child_id: string
  coins: number
  learned: unknown
  struggles: unknown
  stickers: unknown
  outfits: unknown
  wearing: unknown
  pets: unknown
  pet: string | null
  minutes_by_day: unknown
}

export interface CloudResultRow {
  id: string
  child_id: string
  type: string
  language: string
  letter_ids: string[] | null
  mistakes: number
  mistake_details: unknown
  coins: number
  stars: number
  sticker_id: string | null
  day: string
  finished_at: string
}

export interface CloudRewardRow {
  id: string
  child_id: string
  coins: number
  reason: string
  ref_id: string
  created_at: string
}

export interface CloudFamily {
  children: CloudChildRow[]
  states: CloudStateRow[]
  results: CloudResultRow[]
  rewards: CloudRewardRow[]
  learn: { child_id: string; data: unknown }[]
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
const gender = (value: string): Gender => (value === 'girl' ? 'girl' : 'boy')

/** A birth date for a child stored before birth dates existed: 1 January of the year of its age. */
function birthDateOf(row: CloudChildRow, today: Date): string {
  if (row.birth_date && /^\d{4}-\d{2}-\d{2}$/.test(row.birth_date)) return row.birth_date
  return `${today.getFullYear() - Math.max(3, Math.round(row.age))}-01-01`
}

/** A cloud profile as this device keeps it (photo, tours and gifts are this device's own). */
export function profileFromRow(row: CloudChildRow, today = new Date()): ChildProfile {
  const level = (AGE_LEVELS as readonly number[]).includes(row.celebrated_level ?? 0)
    ? (row.celebrated_level as AgeLevel)
    : AGE_LEVELS[0]
  return {
    id: row.id,
    name: row.name,
    birthDate: birthDateOf(row, today),
    celebratedLevel: level,
    gender: gender(row.gender),
    mascot: gender(row.mascot),
    dailyLimitMinutes: row.daily_limit_minutes,
    createdAt: row.created_at,
    ...(Array.isArray(row.homework) && row.homework.length > 0
      ? { homeworks: row.homework as ChildProfile['homeworks'] }
      : {}),
  }
}

export function resultFromRow(row: CloudResultRow): TaskResult {
  return {
    id: row.id,
    type: row.type as TaskResult['type'],
    language: row.language as TaskResult['language'],
    letterIds: row.letter_ids ?? [],
    mistakes: row.mistakes,
    mistakeDetails: Array.isArray(row.mistake_details)
      ? (row.mistake_details as TaskResult['mistakeDetails'])
      : [],
    coins: row.coins,
    stars: row.stars,
    stickerId: row.sticker_id,
    day: row.day,
    finishedAt: row.finished_at,
  }
}

/** A child's progress from its cloud state and results (newest result first). */
export function progressFromRows(
  state: CloudStateRow | undefined,
  results: readonly CloudResultRow[],
): ChildProgress {
  const minutes = isObject(state?.minutes_by_day) ? state.minutes_by_day : {}
  return {
    ...EMPTY_PROGRESS,
    coins: Math.max(0, Math.round(state?.coins ?? 0)),
    learned: (isObject(state?.learned) ? state.learned : {}) as ChildProgress['learned'],
    struggles: (isObject(state?.struggles) ? state.struggles : {}) as ChildProgress['struggles'],
    stickers: strings(state?.stickers),
    outfits: strings(state?.outfits) as ChildProgress['outfits'],
    wearing: (isObject(state?.wearing) ? state.wearing : {}) as ChildProgress['wearing'],
    pets: strings(state?.pets) as ChildProgress['pets'],
    pet: (state?.pet ?? null) as ChildProgress['pet'],
    minutesByDay: Object.fromEntries(
      Object.entries(minutes).filter(
        (pair): pair is [string, number] => typeof pair[1] === 'number',
      ),
    ),
    results: [...results]
      .sort((a, b) => b.finished_at.localeCompare(a.finished_at))
      .slice(0, RESULTS_LIMIT)
      .map(resultFromRow),
  }
}

export function rewardFromRow(row: CloudRewardRow): RewardEntry {
  return {
    id: row.id,
    childKey: row.child_id,
    coins: row.coins,
    reason: row.reason as RewardReason,
    refId: row.ref_id,
    at: row.created_at,
  }
}

export interface RestorePlan {
  /** Children to bring to this device, with everything they had. */
  children: {
    profile: ChildProfile
    progress: ChildProgress
    rewards: RewardEntry[]
    learn: LearnChild | null
  }[]
}

/** Which cloud children this device does not have yet, and what they bring (pure). */
export function planRestore(
  cloud: CloudFamily,
  localIds: ReadonlySet<string>,
  today = new Date(),
): RestorePlan {
  return {
    children: cloud.children
      .filter((row) => !localIds.has(row.id))
      .map((row) => {
        const learn = cloud.learn.find((item) => item.child_id === row.id)?.data
        return {
          profile: profileFromRow(row, today),
          progress: progressFromRows(
            cloud.states.find((state) => state.child_id === row.id),
            cloud.results.filter((result) => result.child_id === row.id),
          ),
          rewards: cloud.rewards.filter((reward) => reward.child_id === row.id).map(rewardFromRow),
          learn: isObject(learn) ? (learn as unknown as LearnChild) : null,
        }
      }),
  }
}

/** Brings the planned children onto this device (their own keys only; nothing else changes). */
export function applyRestore(plan: RestorePlan): number {
  if (plan.children.length === 0) return 0
  // rewards and learning data first: the family change below starts the upload of the new
  // children, and by then everything they had is already in place
  for (const { profile, rewards, learn } of plan.children) {
    rememberRewards(profile.id, rewards)
    if (learn) {
      useLearnStore.setState((state) => ({ byChild: { ...state.byChild, [profile.id]: learn } }))
    }
  }
  useProgressStore.setState((state) => ({
    byChild: {
      ...state.byChild,
      ...Object.fromEntries(plan.children.map(({ profile, progress }) => [profile.id, progress])),
    },
  }))
  useFamilyStore.setState((state) => {
    const known = new Set(state.children.map((child) => child.id))
    const added = plan.children.map(({ profile }) => profile).filter((p) => !known.has(p.id))
    return { children: [...state.children, ...added] }
  })
  return plan.children.length
}

/** Rewards that happen once ever (not per run): all of them are remembered, however old. */
const ONE_TIME_REASONS = ['achievement', 'birthday', 'conversion', 'quest', 'pro-gift']
/** Rows per request: the hosted API returns at most 1000 rows per select. */
const PAGE = 1000

type Page = { data: unknown[] | null; error: unknown }

/** Reads newest-first pages of a child's rows until `limit` rows or the end. */
async function pages(read: (from: number, to: number) => PromiseLike<Page>, limit: number) {
  const rows: unknown[] = []
  while (rows.length < limit) {
    const size = Math.min(PAGE, limit - rows.length)
    const { data, error } = await read(rows.length, rows.length + size - 1)
    if (error) return null
    rows.push(...(data ?? []))
    if ((data ?? []).length < size) break
  }
  return rows
}

/**
 * Reads, from the cloud (only the account's own rows: RLS), the children that are not in
 * `skip`, with everything they bring. Each child is read on its own (a busy sibling cannot push
 * out another's rows), newest first, page by page; every one-time reward is read however old.
 * Null when anything could not be read.
 */
export async function fetchCloudFamily(
  supabase: SupabaseClient,
  skip: ReadonlySet<string> = new Set(),
): Promise<CloudFamily | null> {
  const children = await supabase.from('children').select('*')
  if (children.error) return null
  const rows = ((children.data ?? []) as CloudChildRow[]).filter((row) => !skip.has(row.id))
  const family: CloudFamily = { children: rows, states: [], results: [], rewards: [], learn: [] }
  // nothing missing on this device: one small request and done
  if (rows.length === 0) return family
  const ids = rows.map((row) => row.id)
  const [states, learn] = await Promise.all([
    supabase.from('child_state').select('*').in('child_id', ids),
    supabase.from('child_learn').select('child_id, data').in('child_id', ids),
  ])
  if (states.error || learn.error) return null
  family.states = (states.data ?? []) as CloudStateRow[]
  family.learn = (learn.data ?? []) as { child_id: string; data: unknown }[]
  const rewardColumns = 'id, child_id, coins, reason, ref_id, created_at'
  for (const id of ids) {
    const [results, recent, oneTime] = await Promise.all([
      pages(
        (from, to) =>
          supabase
            .from('task_results')
            .select('*')
            .eq('child_id', id)
            .order('finished_at', { ascending: false })
            .range(from, to),
        RESULTS_LIMIT,
      ),
      pages(
        (from, to) =>
          supabase
            .from('reward_ledger')
            .select(rewardColumns)
            .eq('child_id', id)
            .order('created_at', { ascending: false })
            .range(from, to),
        REWARDS_LIMIT,
      ),
      pages(
        (from, to) =>
          supabase
            .from('reward_ledger')
            .select(rewardColumns)
            .eq('child_id', id)
            .in('reason', ONE_TIME_REASONS)
            .order('created_at', { ascending: false })
            .range(from, to),
        REWARDS_LIMIT,
      ),
    ])
    // a building level paid in nuts is paid once ever, too (`upgrade|<building>|<level>`)
    const upgrades = await pages(
      (from, to) =>
        supabase
          .from('reward_ledger')
          .select(rewardColumns)
          .eq('child_id', id)
          .eq('reason', 'purchase')
          .like('ref_id', 'upgrade|%')
          .order('created_at', { ascending: false })
          .range(from, to),
      REWARDS_LIMIT,
    )
    if (!results || !recent || !oneTime || !upgrades) return null
    family.results.push(...(results as CloudResultRow[]))
    const seen = new Set<string>()
    const kept = [...(oneTime as CloudRewardRow[]), ...(upgrades as CloudRewardRow[])]
    for (const row of [...kept, ...(recent as CloudRewardRow[])]) {
      if (seen.has(row.id)) continue
      seen.add(row.id)
      family.rewards.push(row)
    }
  }
  return family
}

/** Children this device has, or removed with the removal not yet in the cloud (queued or given up on). */
function childrenHere(): Set<string> {
  const { queue, deadLetter } = useSyncStore.getState()
  const leaving = [...queue, ...deadLetter].flatMap((item) =>
    item.operation.kind === 'deleteChild' ? [item.operation.childId] : [],
  )
  return new Set([...useFamilyStore.getState().children.map((child) => child.id), ...leaving])
}

/**
 * Brings the account's children that this device lacks. `stillCurrent` is asked right before
 * anything changes (the parent may have signed out meanwhile). Returns how many came, or null
 * when the cloud could not be read (nothing changes; it is tried again at the next sign-in).
 */
export async function restoreFromCloud(
  supabase: SupabaseClient,
  stillCurrent: () => boolean = () => true,
): Promise<number | null> {
  // taken before reading: a removal sent while the cloud is being read stays a removal
  const before = childrenHere()
  const family = await fetchCloudFamily(supabase, before)
  if (!family || !stillCurrent()) return null
  return applyRestore(planRestore(family, new Set([...before, ...childrenHere()])))
}

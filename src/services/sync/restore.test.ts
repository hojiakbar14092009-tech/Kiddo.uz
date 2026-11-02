import type { SupabaseClient } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { rewardHistory, subscribeRewards, wasRewarded } from '@/domain/rewards'
import { useLearnStore } from '@/features/learn/learnStore'
import { useFamilyStore } from '@/store/familyStore'
import { useProgressStore } from '@/store/progressStore'
import { fakeTables } from '@/test/fakeSupabase'
import {
  applyRestore,
  fetchCloudFamily,
  planRestore,
  profileFromRow,
  restoreFromCloud,
  type CloudFamily,
} from './restore'
import { useSyncStore } from './syncQueue'

/* Phase 44: two-way sync — the account's children come to a new device, rewards stay paid once. */

const child = (id: string, name: string) => ({
  id,
  name,
  birth_date: '2021-03-04',
  age: 5,
  celebrated_level: 5,
  gender: 'girl',
  mascot: 'girl',
  daily_limit_minutes: 30,
  homework: [],
  created_at: '2026-01-01T00:00:00Z',
})

const family = (): CloudFamily => ({
  children: [child('c1', 'Aziza'), child('c2', 'Bek')],
  states: [
    {
      child_id: 'c1',
      coins: 42,
      learned: { uz: ['a', 'b'] },
      struggles: {},
      stickers: ['star'],
      outfits: ['cap'],
      wearing: { head: 'cap' },
      pets: ['cat'],
      pet: 'cat',
      minutes_by_day: { '2026-11-01': 12, broken: 'x' },
    },
  ],
  results: [
    {
      id: 'r1',
      child_id: 'c1',
      type: 'trace',
      language: 'uz',
      letter_ids: ['a'],
      mistakes: 0,
      mistake_details: [],
      coins: 5,
      stars: 3,
      sticker_id: null,
      day: '2026-11-01',
      finished_at: '2026-11-01T10:00:00Z',
    },
  ],
  rewards: [
    {
      id: 'w1',
      child_id: 'c1',
      coins: 5,
      reason: 'task',
      ref_id: 'r1',
      created_at: '2026-11-01T10:00:01Z',
    },
  ],
  learn: [{ child_id: 'c1', data: { stages: {}, attempts: [], sessions: [] } }],
})

describe('restoring the family from the cloud', () => {
  beforeEach(() => {
    useFamilyStore.setState({ children: [], activeChildId: null })
    useProgressStore.setState({ byChild: {} })
    useSyncStore.getState().clear()
  })
  afterEach(() => {
    for (const id of ['c1', 'c2']) useFamilyStore.getState().removeChild(id)
  })

  it('brings only the children this device does not have', () => {
    const plan = planRestore(family(), new Set(['c2']))
    expect(plan.children.map((item) => item.profile.id)).toEqual(['c1'])
    const c1 = plan.children[0]!
    expect(c1.progress.coins).toBe(42)
    expect(c1.progress.learned).toEqual({ uz: ['a', 'b'] })
    expect(c1.progress.minutesByDay).toEqual({ '2026-11-01': 12 })
    expect(c1.progress.results.map((result) => result.id)).toEqual(['r1'])
    expect(c1.rewards.map((entry) => entry.refId)).toEqual(['r1'])
  })

  it('a child with no state starts empty; an old profile without a birth date gets one', () => {
    const plan = planRestore(family(), new Set(['c1']))
    expect(plan.children[0]!.progress.coins).toBe(0)
    expect(
      profileFromRow({ ...child('c3', 'Old'), birth_date: null, age: 6 }, new Date('2026-11-02'))
        .birthDate,
    ).toBe('2020-01-01')
  })

  it('applies: the profile, its progress and learning data; a run paid there is not paid again', () => {
    const notified = vi.fn()
    const stop = subscribeRewards(notified)
    expect(applyRestore(planRestore(family(), new Set()))).toBe(2)
    stop()
    expect(useFamilyStore.getState().children.map((item) => item.name)).toEqual(['Aziza', 'Bek'])
    expect(useProgressStore.getState().byChild.c1?.coins).toBe(42)
    expect(useLearnStore.getState().byChild.c1).toBeDefined()
    // remembered, not given: the balance is the cloud's and nothing is sent back
    expect(wasRewarded('c1', 'task', 'r1')).toBe(true)
    expect(rewardHistory('c1')).toHaveLength(1)
    expect(notified).not.toHaveBeenCalled()
  })

  const tables = () => ({
    children: family().children,
    child_state: family().states,
    task_results: family().results,
    reward_ledger: family().rewards,
    child_learn: family().learn,
  })

  it('a child removed here whose removal is still queued (or given up on) is not brought back', async () => {
    useSyncStore.getState().enqueue({ kind: 'deleteChild', childId: 'c2' })
    const { client } = fakeTables(tables())
    expect(await restoreFromCloud(client as unknown as SupabaseClient)).toBe(1)
    expect(useFamilyStore.getState().children.map((item) => item.id)).toEqual(['c1'])
  })

  it('a removal sent while the cloud is read stays a removal (taken before reading)', async () => {
    useSyncStore.getState().enqueue({ kind: 'deleteChild', childId: 'c2' })
    const { client } = fakeTables(tables())
    const from = client.from
    const racing = {
      from: (table: string) => {
        // the queue is sent meanwhile
        if (table === 'child_state') useSyncStore.setState({ queue: [] })
        return from(table)
      },
    }
    expect(await restoreFromCloud(racing as unknown as SupabaseClient)).toBe(1)
    expect(useFamilyStore.getState().children.map((item) => item.id)).toEqual(['c1'])
  })

  it('signed out while reading: nothing comes down', async () => {
    const { client } = fakeTables(tables())
    expect(await restoreFromCloud(client as unknown as SupabaseClient, () => false)).toBeNull()
    expect(useFamilyStore.getState().children).toEqual([])
  })

  it('Phase 53: the children are read with the account as a filter (the index, not every family)', async () => {
    const { client, requests } = fakeTables(tables())
    await fetchCloudFamily(client as unknown as SupabaseClient, new Set(), 'parent-1')
    expect(requests[0]).toEqual({ table: 'children', filters: ['eq:parent_id'] })
  })

  it('nothing missing here: one small read only', async () => {
    useFamilyStore.setState({
      children: family().children.map((row) => profileFromRow(row)),
    })
    const { client, requests } = fakeTables(tables())
    expect(await restoreFromCloud(client as unknown as SupabaseClient)).toBe(0)
    expect(requests.map((request) => request.table)).toEqual(['children'])
    useFamilyStore.setState({ children: [] })
  })

  it('reads each child on its own, page by page, and every one-time reward however old', async () => {
    const many = Array.from({ length: 2600 }, (_, i) => ({
      id: `w${i}`,
      child_id: 'c1',
      coins: 1,
      reason: 'task',
      ref_id: `run-${i}`,
      created_at: new Date(Date.UTC(2026, 0, 1) + i * 60_000).toISOString(),
    }))
    const old = {
      id: 'old',
      child_id: 'c1',
      coins: 10,
      reason: 'achievement',
      ref_id: 'first-steps',
      created_at: '2025-01-01T00:00:00Z',
    }
    const upgrade = {
      id: 'up',
      child_id: 'c1',
      coins: -30,
      reason: 'purchase',
      ref_id: 'upgrade|school|2',
      created_at: '2025-02-01T00:00:00Z',
    }
    const { client, requests } = fakeTables({
      ...tables(),
      reward_ledger: [old, upgrade, ...many],
    })
    const cloud = await fetchCloudFamily(client as unknown as SupabaseClient)
    const c1 = cloud!.rewards.filter((row) => row.child_id === 'c1')
    // the newest 2000 runs, the old achievement and the old paid building level
    expect(c1).toHaveLength(2002)
    expect(c1.some((row) => row.ref_id === 'first-steps')).toBe(true)
    expect(c1.some((row) => row.ref_id === 'upgrade|school|2')).toBe(true)
    // no request asks for more than 1000 rows
    for (const request of requests) {
      const range = request.filters.find((filter) => filter.startsWith('range:'))
      if (!range) continue
      const [start, end] = range.slice(6).split('-').map(Number)
      expect(end! - start! + 1).toBeLessThanOrEqual(1000)
    }
  })

  it('nothing changes when the cloud cannot be read', async () => {
    const supabase = {
      from: () => ({ select: async () => ({ data: null, error: { message: 'offline' } }) }),
    }
    expect(await restoreFromCloud(supabase as unknown as SupabaseClient)).toBeNull()
    expect(useFamilyStore.getState().children).toEqual([])
  })
})

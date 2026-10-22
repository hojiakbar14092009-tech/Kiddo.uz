import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { birthDateForAge } from '@/features/age/ageLevel'
import { useLearnStore } from '@/features/learn/learnStore'
import { dayKey } from '@/features/tasks/rules'
import { grantReward, useRewardStore } from '@/domain/rewards'
import { useFamilyStore } from '@/store/familyStore'
import { useParentStore } from '@/store/parentStore'
import { usePaymentStore } from '@/store/paymentStore'
import { useProgressStore } from '@/store/progressStore'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { authDecision, endCloudSession } from './cloudSession'
import {
  applyServerSubscription,
  enforceVerifyGrace,
  pullSubscription,
  useProVerifyStore,
  VERIFY_GRACE_MS,
} from './subscription'
import { classify } from './supabaseSyncClient'
import { trackCloudChanges } from './trackCloud'
import { useSyncStore } from './syncQueue'

const USER = 'user-1'

function addChild(name = 'Ali') {
  return useFamilyStore
    .getState()
    .addChild({ name, birthDate: birthDateForAge(5, dayKey()), gender: 'boy' })
}

function kinds() {
  return useSyncStore.getState().queue.map((item) => item.operation.kind)
}

function answer(questionId: string) {
  return {
    questionId,
    skill: 'count',
    first: '3',
    firstCorrect: true,
    helped: false,
    final: '3',
    finalCorrect: true,
    errorType: null,
    section: 'math' as const,
    language: 'any' as const,
    mode: 'learn' as const,
  }
}

beforeEach(() => {
  useFamilyStore.setState({ children: [], activeChildId: null })
  useProgressStore.setState({ byChild: {} })
  useLearnStore.setState({ byChild: {} })
  useRewardStore.setState({ byChild: {} })
  usePaymentStore.setState({ payments: [] })
  useSyncStore.setState({ queue: [], deadLetter: [], paused: null, snapshotFor: USER })
  useSubscriptionStore.getState().cancel()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('cloud change tracking', () => {
  it('never queues a payment: in cloud mode payments come from the server', () => {
    const stop = trackCloudChanges(USER, () => undefined)
    usePaymentStore
      .getState()
      .record({ plan: 'yearly', provider: 'click', amount: 278_400, family: 'Ali' })
    expect(useSyncStore.getState().queue).toHaveLength(0)
    // …while the device keeps its own list for the device admin view.
    expect(usePaymentStore.getState().payments).toHaveLength(1)
    stop()
  })

  it('queues each reward once for the server ledger, never guests or admin grants', () => {
    const ali = addChild()
    const stop = trackCloudChanges(USER, () => undefined)
    useSyncStore.setState({ queue: [] })

    const entry = { childKey: ali.id, coins: 20, reason: 'learn' as const, refId: 'session-1' }
    grantReward(entry)
    grantReward(entry) // the same session again: the ledger refuses, nothing new is queued
    grantReward({ childKey: 'guest', coins: 5, reason: 'task', refId: 't1' })
    grantReward({ childKey: ali.id, coins: 50, reason: 'admin', refId: 'a1' })
    grantReward({ childKey: ali.id, coins: 50, reason: 'pro-gift', refId: 'pay-1' })

    const rewards = useSyncStore
      .getState()
      .queue.filter((item) => item.operation.kind === 'recordReward')
    expect(rewards).toHaveLength(1)
    expect(rewards[0]!.operation).toEqual({
      kind: 'recordReward',
      row: { p_child: ali.id, p_coins: 20, p_reason: 'learn', p_ref: 'session-1' },
    })
    stop()
  })

  it('sends learning data once per quiet spell, as the latest copy', () => {
    vi.useFakeTimers()
    const ali = addChild()
    const stop = trackCloudChanges(USER, () => undefined, 1_000)
    useSyncStore.setState({ queue: [] })

    const learn = useLearnStore.getState()
    learn.recordAttempt(ali.id, answer('q1'))
    vi.advanceTimersByTime(500)
    learn.recordAttempt(ali.id, answer('q2'))
    learn.recordAttempt(ali.id, answer('q3'))
    expect(kinds()).not.toContain('upsertLearn')

    vi.advanceTimersByTime(1_000)
    const learnOps = useSyncStore
      .getState()
      .queue.filter((item) => item.operation.kind === 'upsertLearn')
    expect(learnOps).toHaveLength(1)
    const op = learnOps[0]!.operation
    expect(op.kind === 'upsertLearn' && op.row.data.attempts).toHaveLength(3)

    // Later changes replace the waiting copy instead of adding another.
    learn.recordAttempt(ali.id, answer('q4'))
    vi.advanceTimersByTime(1_000)
    expect(kinds().filter((kind) => kind === 'upsertLearn')).toHaveLength(1)
    stop()
  })

  it('queues the learning data with the first snapshot of an account', () => {
    const ali = addChild()
    useLearnStore.getState().recordAttempt(ali.id, answer('q1'))
    useSyncStore.setState({ snapshotFor: null })
    const stop = trackCloudChanges(USER, () => undefined)
    expect(kinds()).toEqual(['upsertChild', 'upsertLearn'])
    expect(useSyncStore.getState().snapshotFor).toBe(USER)
    stop()
  })
})

describe('server subscription is authoritative in cloud mode', () => {
  it('extends, shortens and ends PRO as the server says', () => {
    const store = useSubscriptionStore
    store.getState().activatePlan('lifetime', 'payment')

    // A refund turned lifetime into a month that ends soon: the device follows (downgrade).
    applyServerSubscription({
      plan: 'monthly',
      source: 'payment',
      expires_at: '2030-01-01T00:00:00Z',
      status: 'active',
    })
    expect(store.getState()).toMatchObject({
      plan: 'monthly',
      expiresAt: '2030-01-01T00:00:00.000Z',
      source: 'payment',
    })

    // Revoked: no row means Free, even though the device had PRO.
    applyServerSubscription(null)
    expect(store.getState()).toMatchObject({ plan: null, expiresAt: null, source: null })
  })

  it('treats a row that is not active as Free, and grants PRO the server gives', () => {
    applyServerSubscription({ plan: 'yearly', source: 'admin', expires_at: null })
    expect(useSubscriptionStore.getState()).toMatchObject({ plan: 'yearly', source: 'admin' })
    applyServerSubscription({
      plan: 'yearly',
      source: 'payment',
      expires_at: '2030-01-01T00:00:00Z',
      status: 'canceled',
    })
    expect(useSubscriptionStore.getState().plan).toBeNull()
  })

  it('keeps the developer Demo PRO outside production, never in production', () => {
    useSubscriptionStore.getState().setDemoPro(true)
    applyServerSubscription(null)
    expect(useSubscriptionStore.getState().source).toBe('demo')

    vi.stubEnv('PROD', true)
    applyServerSubscription(null)
    expect(useSubscriptionStore.getState().plan).toBeNull()
  })
})

describe('parent session follows Supabase auth', () => {
  const session = (id: string) => ({ user: { id } }) as Session

  it('ends on sign-out, a lost session or another account; resumes on refresh', () => {
    const cases: [AuthChangeEvent, Session | null, string][] = [
      ['SIGNED_OUT', null, 'end'],
      ['INITIAL_SESSION', null, 'end'],
      ['SIGNED_IN', session('someone-else'), 'end'],
      ['TOKEN_REFRESHED', session(USER), 'resume'],
      ['INITIAL_SESSION', session(USER), 'resume'],
      ['USER_UPDATED', session(USER), 'ignore'],
    ]
    for (const [event, current, expected] of cases) {
      expect(authDecision(event, current, USER)).toBe(expected)
    }
  })

  it('signs the parent out and forgets the account’s unsent changes and PRO', () => {
    useParentStore.getState().setCloudSession('a@x.uz', USER)
    useSubscriptionStore.getState().activatePlan('yearly', 'payment')
    useSyncStore.getState().enqueue({ kind: 'deleteChild', childId: 'lola' })
    useSyncStore.getState().enqueue({
      kind: 'recordReward',
      row: { p_child: 'ali', p_coins: 5, p_reason: 'task', p_ref: 'r' },
    })
    endCloudSession()
    expect(useParentStore.getState().session).toBeNull()
    expect(useSubscriptionStore.getState().plan).toBeNull()
    expect(kinds()).toEqual(['deleteChild'])
  })
})

describe('error classification', () => {
  it('sorts PostgREST failures into auth, rejected and transient', () => {
    expect(classify(401, { message: 'JWT expired', code: 'PGRST301' })).toBe('auth')
    expect(classify(400, { message: 'not_signed_in', code: '28000' })).toBe('auth')
    expect(classify(403, { message: 'new row violates row-level security', code: '42501' })).toBe(
      'rejected',
    )
    expect(classify(400, { message: 'daily_cap', code: 'P0001' })).toBe('rejected')
    expect(classify(0, { message: 'TypeError: Failed to fetch' })).toBe('transient')
    expect(classify(503, { message: 'unavailable' })).toBe('transient')
    expect(classify(429, { message: 'slow down' })).toBe('transient')
  })
})

describe('offline grace for cloud PRO', () => {
  const DAY = 24 * 60 * 60 * 1000
  const failing = {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: 'offline' } }) }),
      }),
    }),
  } as never
  const answering = (row: object | null) =>
    ({
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }),
      }),
    }) as never

  beforeEach(() => useProVerifyStore.setState({ userId: null, verifiedAt: null, since: null }))

  it('keeps PRO through failed reads for 7 days after the last confirmation, then falls back to Free', async () => {
    const row = { plan: 'yearly', source: 'payment', expires_at: null, status: 'active' }
    const t0 = Date.parse('2026-10-01T00:00:00Z')
    expect(await pullSubscription(answering(row), USER, () => t0)).toBe(true)
    expect(useProVerifyStore.getState().verifiedAt).toBe(t0)
    expect(useSubscriptionStore.getState().plan).toBe('yearly')

    expect(await pullSubscription(failing, USER, () => t0 + 6 * DAY)).toBe(false)
    expect(useSubscriptionStore.getState().plan).toBe('yearly')

    expect(await pullSubscription(failing, USER, () => t0 + VERIFY_GRACE_MS + 1)).toBe(false)
    expect(useSubscriptionStore.getState().plan).toBeNull()

    // The next successful read brings it back.
    await pullSubscription(answering(row), USER, () => t0 + 8 * DAY)
    expect(useSubscriptionStore.getState().plan).toBe('yearly')
  })

  it('counts the grace from the first cloud start when the server never answered', () => {
    const t0 = Date.parse('2026-10-01T00:00:00Z')
    useSubscriptionStore.getState().activatePlan('monthly', 'payment')
    expect(enforceVerifyGrace(USER, t0)).toBe(false)
    expect(enforceVerifyGrace(USER, t0 + VERIFY_GRACE_MS + 1)).toBe(true)
    expect(useSubscriptionStore.getState().plan).toBeNull()
  })
})

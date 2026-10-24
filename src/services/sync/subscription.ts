import type { SupabaseClient } from '@supabase/supabase-js'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useSubscriptionStore, type PlanId, type ProSource } from '@/store/subscriptionStore'

/** A `subscriptions` row as the client may read it (0005 adds `status`). */
export interface ServerSubscription {
  plan: string
  source: string
  expires_at: string | null
  status?: string | null
}

/** How often a cloud family's PRO is checked again while the app stays open. */
export const SUBSCRIPTION_REFRESH_MS = 6 * 60 * 60 * 1000
/** Offline grace: without one successful server read for this long, cloud PRO lapses. */
export const VERIFY_GRACE_MS = 7 * 24 * 60 * 60 * 1000
/**
 * How far the device clock may be off before the grace no longer trusts it:
 * a "last confirmed" time in the future, or a clock wound back past a time
 * this device already saw, ends the grace (the next server read decides).
 */
export const CLOCK_SLACK_MS = 60 * 60 * 1000

interface VerifyState {
  /** The cloud account these times belong to. */
  userId: string | null
  /** Last successful read of the `subscriptions` row (ms), or null. */
  verifiedAt: number | null
  /** When this account was first seen on this device (ms): the grace counts from here until a read succeeds. */
  since: number | null
  /** The latest device time the grace has seen (ms): a clock set back cannot stretch it. */
  lastSeen?: number | null
}

/** When the server last confirmed this device's PRO (kiddo.cloudPro). */
export const useProVerifyStore = create<VerifyState>()(
  persist((): VerifyState => ({ userId: null, verifiedAt: null, since: null }), {
    name: 'kiddo.cloudPro',
    version: 1,
  }),
)

function forUser(userId: string, now: number): VerifyState {
  const state = useProVerifyStore.getState()
  if (state.userId === userId) return state
  const fresh = { userId, verifiedAt: null, since: now }
  useProVerifyStore.setState(fresh)
  return fresh
}

/** Local PRO back to Free (kept: the developer Demo PRO outside production). */
function clearLocalPro() {
  const local = useSubscriptionStore.getState()
  if (local.source === 'demo' && !import.meta.env.PROD) return
  if (local.plan !== null || local.source !== null || local.expiresAt !== null) {
    useSubscriptionStore.setState({ plan: null, source: null, expiresAt: null })
  }
}

/**
 * Cloud PRO lives on the device only as a cache of the server's answer: if
 * the server has not confirmed it for VERIFY_GRACE_MS (offline, blocked
 * requests), the device falls back to Free until the next successful read.
 * Returns true when PRO was taken away now.
 */
export function enforceVerifyGrace(userId: string, now: number = Date.now()): boolean {
  const { verifiedAt, since, lastSeen } = forUser(userId, now)
  const last = verifiedAt ?? since ?? now
  // These times live in the browser's storage: one from the future or a clock
  // set back means they can no longer be trusted, so the grace is over.
  const clockSane =
    last <= now + CLOCK_SLACK_MS && (lastSeen == null || now >= lastSeen - CLOCK_SLACK_MS)
  useProVerifyStore.setState({ lastSeen: Math.max(lastSeen ?? now, now) })
  if (clockSane && now - last <= VERIFY_GRACE_MS) return false
  const before = useSubscriptionStore.getState().plan
  clearLocalPro()
  return before !== null && useSubscriptionStore.getState().plan === null
}

/** On cloud sign-out or when the Supabase session ends: PRO belonged to that account. */
export function forgetCloudPro(): void {
  clearLocalPro()
  useProVerifyStore.setState({ userId: null, verifiedAt: null, since: null, lastSeen: null })
}

const PLANS: readonly string[] = ['monthly', 'yearly', 'lifetime'] satisfies PlanId[]

function sourceOf(source: string): ProSource {
  return source === 'promo' ? 'promo' : source === 'admin' ? 'admin' : 'payment'
}

/**
 * In cloud mode the server's row is the truth: it may extend, shorten, end or
 * remove PRO (a refund, an admin revoking it). No row – or a row that is not
 * 'active' – means Free. Only the developer "Demo PRO" switch is left alone,
 * and only outside production builds, where that switch exists.
 */
export function applyServerSubscription(row: ServerSubscription | null): void {
  const local = useSubscriptionStore.getState()
  if (local.source === 'demo' && !import.meta.env.PROD) return
  const active = row !== null && (row.status ?? 'active') === 'active' && PLANS.includes(row.plan)
  if (!active) {
    clearLocalPro()
    return
  }
  const next = {
    plan: row.plan as PlanId,
    source: sourceOf(row.source),
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
  }
  if (
    local.plan !== next.plan ||
    local.source !== next.source ||
    local.expiresAt !== next.expiresAt
  ) {
    useSubscriptionStore.setState(next)
  }
}

/**
 * Reads this account's row and applies it. A failed read (offline, server
 * error) keeps what the device had, within the offline grace (7 days since
 * the last successful read). Returns whether the server answered.
 */
export async function pullSubscription(
  supabase: SupabaseClient,
  userId: string,
  now: () => number = Date.now,
) {
  forUser(userId, now())
  // `*` so the read works before and after 0005 (which adds `status`).
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('parent_id', userId)
    .maybeSingle()
  if (error) {
    enforceVerifyGrace(userId, now())
    return false
  }
  applyServerSubscription((data as ServerSubscription | null) ?? null)
  const at = now()
  useProVerifyStore.setState({ userId, verifiedAt: at, lastSeen: at })
  return true
}

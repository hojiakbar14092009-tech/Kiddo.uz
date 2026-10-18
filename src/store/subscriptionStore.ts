import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PlanId = 'monthly' | 'yearly' | 'lifetime'
export type ProSource = 'payment' | 'promo' | 'demo'

const DAY_MS = 24 * 60 * 60 * 1000

/** How long each plan lasts; `null` never expires. */
export const PLAN_DURATION_DAYS: Record<PlanId, number | null> = {
  monthly: 30,
  yearly: 365,
  lifetime: null,
}

interface SubscriptionState {
  plan: PlanId | null
  /** ISO date when PRO ends; `null` together with a plan means it never ends. */
  expiresAt: string | null
  source: ProSource | null
  activatePlan: (plan: PlanId, source: ProSource, now?: Date) => void
  /** Adds PRO time, e.g. from a promo code. Extends an active subscription. */
  grantDays: (days: number, source: ProSource, now?: Date) => void
  /** Developer/test switch from the parent area. */
  setDemoPro: (enabled: boolean) => void
  cancel: () => void
}

interface ProSnapshot {
  plan: PlanId | null
  expiresAt: string | null
}

export function isProActive({ plan, expiresAt }: ProSnapshot, now: number = Date.now()): boolean {
  if (!plan) return false
  return expiresAt === null || Date.parse(expiresAt) > now
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      plan: null,
      expiresAt: null,
      source: null,

      activatePlan: (plan, source, now = new Date()) => {
        const days = PLAN_DURATION_DAYS[plan]
        set({
          plan,
          source,
          expiresAt: days === null ? null : new Date(now.getTime() + days * DAY_MS).toISOString(),
        })
      },

      grantDays: (days, source, now = new Date()) => {
        const state = get()
        if (state.plan && state.expiresAt === null && isProActive(state, now.getTime())) return
        const start = isProActive(state, now.getTime())
          ? Date.parse(state.expiresAt ?? now.toISOString())
          : now.getTime()
        set({
          plan: state.plan ?? 'monthly',
          source,
          expiresAt: new Date(start + days * DAY_MS).toISOString(),
        })
      },

      setDemoPro: (enabled) =>
        set(
          enabled
            ? { plan: 'lifetime', expiresAt: null, source: 'demo' }
            : { plan: null, expiresAt: null, source: null },
        ),

      cancel: () => set({ plan: null, expiresAt: null, source: null }),
    }),
    { name: 'kiddo.subscription', version: 1 },
  ),
)

/** The single source of truth for “is this family on PRO right now?”. */
export function useIsPro(): boolean {
  return useSubscriptionStore((state) => isProActive(state))
}

export function getIsPro(): boolean {
  return isProActive(useSubscriptionStore.getState())
}

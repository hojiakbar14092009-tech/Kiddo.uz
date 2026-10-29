import { DEMO } from '@/config/demo'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useFamilyStore } from './familyStore'

export type PlanId = 'monthly' | 'yearly' | 'lifetime'
export type ProSource = 'payment' | 'promo' | 'demo' | 'admin'

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
  /** Promo codes already used on this device; each works once. */
  usedPromoCodes: string[]
  activatePlan: (plan: PlanId, source: ProSource, now?: Date) => void
  /** Adds PRO time, e.g. from a promo code. Extends an active subscription. */
  grantDays: (days: number, source: ProSource, now?: Date) => void
  /** Developer/test switch from the parent area. */
  setDemoPro: (enabled: boolean) => void
  cancel: () => void
  /** Applies a code whose days were looked up (null: not a valid code). */
  redeemPromo: (code: string, days: number | null, now?: Date) => PromoResult
}

export type PromoResult = 'ok' | 'invalid' | 'used' | 'lifetime' | 'expired'

/** One spelling for a typed code: no spaces anywhere, upper case. */
export function normalizePromo(code: string): string {
  return code.replace(/\s+/g, '').toUpperCase()
}

interface ProSnapshot {
  plan: PlanId | null
  expiresAt: string | null
  source?: ProSource | null
}

export function isProActive(
  { plan, expiresAt, source }: ProSnapshot,
  now: number = Date.now(),
): boolean {
  if (!plan) return false
  // the simulated "Demo PRO" counts only in development and in the demo build
  if (source === 'demo' && import.meta.env.PROD && !DEMO.demoMode) return false
  return expiresAt === null || Date.parse(expiresAt) > now
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      plan: null,
      expiresAt: null,
      source: null,
      usedPromoCodes: [],

      // A new plan adds to the PRO time already paid for; lifetime stays lifetime.
      // Demo PRO is not real, so a purchase simply replaces it.
      activatePlan: (plan, source, now = new Date()) => {
        const state = get()
        const real = state.source !== 'demo' && isProActive(state, now.getTime())
        if (real && state.expiresAt === null) return
        const days = PLAN_DURATION_DAYS[plan]
        const start = real && state.expiresAt ? Date.parse(state.expiresAt) : now.getTime()
        set({
          plan,
          source,
          expiresAt: days === null ? null : new Date(start + days * DAY_MS).toISOString(),
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

      redeemPromo: (code, days, now = new Date()) => {
        const key = normalizePromo(code)
        if (days === null) return 'invalid'
        const state = get()
        if (state.usedPromoCodes.includes(key)) return 'used'
        // the demo switch is a simulation, not a purchase: a code replaces it
        const simulated = state.source === 'demo'
        if (
          !simulated &&
          state.plan &&
          state.expiresAt === null &&
          isProActive(state, now.getTime())
        ) {
          return 'lifetime'
        }
        if (simulated) set({ plan: null, expiresAt: null, source: null })
        get().grantDays(days, 'promo', now)
        set((current) => ({ usedPromoCodes: [...current.usedPromoCodes, key] }))
        return 'ok'
      },
    }),
    {
      name: 'kiddo.subscription',
      version: 2,
      // v1 did not remember used promo codes.
      migrate: (persisted) => ({ usedPromoCodes: [], ...(persisted as object) }),
    },
  ),
)

/** Has the family paid for PRO (for the parent area)? */
export function useHasProSubscription(): boolean {
  return useSubscriptionStore((state) => isProActive(state))
}

/**
 * Are PRO features on for the one playing now? PRO belongs to the family’s
 * children: a guest plays the free version even when the family has PRO.
 * @deprecated Screens ask `useCanUse(feature)` / `useProTier()` from `@/domain/entitlements`.
 */
export function useIsPro(): boolean {
  const paid = useHasProSubscription()
  const child = useFamilyStore((state) => state.activeChildId !== null)
  return paid && child
}

// The capability check lives in `@/domain/entitlements`; these names stay here for old imports.
export { canUse, getIsPro, useCanUse, type ProFeature } from '@/domain/entitlements/features'

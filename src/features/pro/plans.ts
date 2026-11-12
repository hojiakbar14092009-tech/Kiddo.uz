import {
  getAppSettings,
  useAppSettingsStore,
  yearlyPrice,
  type AppSettings,
} from '@/store/appSettingsStore'
import { isSupabaseConfigured } from '@/services/supabase/config'
import type { PlanId } from '@/store/subscriptionStore'
import { FUTURE_PRO_PRICES } from './futurePrices'

export interface Plan {
  id: PlanId
  /** Price in Uzbek so‘m. */
  price: number
  /** For the yearly plan: how much cheaper than twelve monthly payments. */
  savingPercent?: number
}

/**
 * Plans on sale at the admin's monthly price; a year is always twelve months
 * less 20 %. (“Forever” is no longer sold.)
 */
export function plansFor(prices: AppSettings['prices']): Plan[] {
  const yearly = yearlyPrice(prices.monthly)
  return [
    { id: 'monthly', price: prices.monthly },
    {
      id: 'yearly',
      price: yearly,
      savingPercent: Math.max(0, Math.round((1 - yearly / (prices.monthly * 12)) * 100)),
    },
  ]
}

/** MVP (Kiddo's own server): the owner's prices, the same as server/pay.ts PLANS. */
export const MVP_PLANS: Plan[] = [
  { id: 'monthly', price: FUTURE_PRO_PRICES.monthly },
  {
    id: 'yearly',
    price: FUTURE_PRO_PRICES.yearly,
    savingPercent: Math.round(
      (1 - FUTURE_PRO_PRICES.yearly / (FUTURE_PRO_PRICES.monthly * 12)) * 100,
    ),
  },
]

/** Plans at the current prices. */
export function usePlans(): Plan[] {
  const prices = useAppSettingsStore((state) => state.prices)
  return isSupabaseConfigured ? plansFor(prices) : MVP_PLANS
}

/** Only for receipts of earlier lifetime purchases. */
const LIFETIME: Plan = { id: 'lifetime', price: 399_000 }

export function findPlan(
  id: PlanId,
  plans: readonly Plan[] = plansFor(getAppSettings().prices),
): Plan {
  const plan = plans.find((item) => item.id === id) ?? (id === 'lifetime' ? LIFETIME : undefined)
  if (!plan) throw new Error(`Unknown plan ${id}`)
  return plan
}

/** “199 000” – grouped with a non-breaking space, as prices are written in Uzbekistan. */
export function formatSum(amount: number): string {
  return String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

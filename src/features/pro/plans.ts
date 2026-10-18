import { getAppSettings, useAppSettingsStore, type AppSettings } from '@/store/appSettingsStore'
import type { PlanId } from '@/store/subscriptionStore'

export interface Plan {
  id: PlanId
  /** Price in Uzbek so‘m. */
  price: number
  /** For the yearly plan: how much cheaper than twelve monthly payments. */
  savingPercent?: number
}

/** Plans on sale, at the prices set in the admin panel. (“Forever” is no longer sold.) */
export function plansFor(prices: AppSettings['prices']): Plan[] {
  return [
    { id: 'monthly', price: prices.monthly },
    {
      id: 'yearly',
      price: prices.yearly,
      savingPercent: Math.max(0, Math.round((1 - prices.yearly / (prices.monthly * 12)) * 100)),
    },
  ]
}

/** Plans at the current prices. */
export function usePlans(): Plan[] {
  const prices = useAppSettingsStore((state) => state.prices)
  return plansFor(prices)
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

import type { PlanId } from '@/store/subscriptionStore'

export interface Plan {
  id: PlanId
  /** Price in Uzbek so‘m. */
  price: number
  /** For the yearly plan: how much cheaper than twelve monthly payments. */
  savingPercent?: number
}

const MONTHLY_PRICE = 29_000
const YEARLY_PRICE = 199_000

export const PLANS: readonly Plan[] = [
  { id: 'monthly', price: MONTHLY_PRICE },
  {
    id: 'yearly',
    price: YEARLY_PRICE,
    savingPercent: Math.round((1 - YEARLY_PRICE / (MONTHLY_PRICE * 12)) * 100),
  },
  { id: 'lifetime', price: 399_000 },
]

export function findPlan(id: PlanId): Plan {
  const plan = PLANS.find((item) => item.id === id)
  if (!plan) throw new Error(`Unknown plan ${id}`)
  return plan
}

/** “199 000” – grouped with a non-breaking space, as prices are written in Uzbekistan. */
export function formatSum(amount: number): string {
  return String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

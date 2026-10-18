import { getAppSettings } from '@/store/appSettingsStore'
import { useFamilyStore } from '@/store/familyStore'
import { useParentStore } from '@/store/parentStore'
import { usePaymentStore } from '@/store/paymentStore'
import { useProgressStore } from '@/store/progressStore'
import type { PlanId } from '@/store/subscriptionStore'

/**
 * After a PRO payment: the payment is recorded (the admin panel hears about it
 * at once) and every child in the family gets the PRO gift coins.
 * Returns how many coins each child got.
 */
export function recordProPurchase(plan: PlanId, provider: string, amount: number): number {
  const { children } = useFamilyStore.getState()
  const session = useParentStore.getState().session
  const family =
    session?.mode === 'cloud' ? session.email : children.map((child) => child.name).join(', ')
  usePaymentStore.getState().record({ plan, provider, amount, family })

  const gift = getAppSettings().proGiftCoins
  if (gift > 0) {
    const { grantCoins } = useProgressStore.getState()
    children.forEach((child) => grantCoins(child.id, gift))
  }
  return children.length > 0 ? gift : 0
}

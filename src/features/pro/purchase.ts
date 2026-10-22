import { grantReward } from '@/domain/rewards'
import { getAppSettings } from '@/store/appSettingsStore'
import { useFamilyStore } from '@/store/familyStore'
import { useParentStore } from '@/store/parentStore'
import { usePaymentStore } from '@/store/paymentStore'
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
  const payment = usePaymentStore.getState().record({ plan, provider, amount, family })

  // One gift per child per payment, recorded in each child's ledger.
  const gift = getAppSettings().proGiftCoins
  if (gift > 0) {
    children.forEach((child) =>
      grantReward({ childKey: child.id, coins: gift, reason: 'pro-gift', refId: payment.id }),
    )
  }
  return children.length > 0 ? gift : 0
}

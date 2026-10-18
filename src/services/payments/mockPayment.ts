import type { PlanId } from '@/store/subscriptionStore'

export const PAYMENT_PROVIDERS = ['click', 'payme', 'uzum'] as const
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number]

export interface PaymentRequest {
  plan: PlanId
  provider: PaymentProvider
  amount: number
}

export interface PaymentReceipt {
  transactionId: string
  provider: PaymentProvider
  plan: PlanId
  amount: number
  paidAt: string
}

const PROCESSING_MS = 1200

/**
 * A stand-in for Click / Payme / Uzum Pay. Real payments need a merchant
 * account and a server that verifies the provider’s callback before PRO is
 * granted; until that exists, this only simulates a successful payment and
 * never charges anyone.
 */
export async function payMock(
  request: PaymentRequest,
  delayMs = PROCESSING_MS,
): Promise<PaymentReceipt> {
  await new Promise((resolve) => setTimeout(resolve, delayMs))
  return {
    transactionId: `test-${request.provider}-${Date.now().toString(36)}`,
    provider: request.provider,
    plan: request.plan,
    amount: request.amount,
    paidAt: new Date().toISOString(),
  }
}

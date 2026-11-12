import { useSubscriptionStore } from '@/store/subscriptionStore'
import { api } from './api'

/** Pro as the server knows it (GET /api/me, POST /api/pay/checkout). */
export interface ServerPro {
  active: boolean
  plan: string | null
  expiresAt: number | null
}

/**
 * The device's Pro follows the account: a paid plan comes from the server only, so editing
 * the device's storage gives nothing that survives the next check. Promo and demo Pro are kept.
 */
export function applyServerPro(pro: ServerPro): void {
  const store = useSubscriptionStore.getState()
  if (pro.active && pro.expiresAt) {
    useSubscriptionStore.setState({
      plan: pro.plan === 'year' ? 'yearly' : 'monthly',
      expiresAt: new Date(pro.expiresAt).toISOString(),
      source: 'payment',
    })
  } else if (store.source === 'payment') {
    useSubscriptionStore.setState({ plan: null, expiresAt: null, source: null })
  }
}

export async function pullServerPro(): Promise<void> {
  applyServerPro((await api<{ pro: ServerPro }>('me')).pro)
}

/** A test payment on the server (MVP); the same key never pays twice (a retry, a double tap). */
export async function payOnServer(
  plan: 'monthly' | 'yearly',
  idempotencyKey: string,
): Promise<ServerPro> {
  const { pro } = await api<{ pro: ServerPro }>('pay/checkout', {
    method: 'POST',
    body: { plan: plan === 'yearly' ? 'year' : 'month', idempotencyKey },
    retries: 2,
  })
  applyServerPro(pro)
  return pro
}

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PlanId } from './subscriptionStore'

/** One PRO payment, as the admin panel lists it. */
export interface Payment {
  id: string
  plan: PlanId
  provider: string
  /** In so‘m. */
  amount: number
  /** Who paid: the children's names, or the parent's e-mail. */
  family: string
  /** ISO time. */
  at: string
}

/** Payments are kept on the device for the admin's local view (the cloud keeps them all). */
const MAX_PAYMENTS = 2000

/** Other open tabs (the admin panel) hear about payments at once. */
export const ADMIN_CHANNEL = 'kiddo-admin'

export type AdminMessage =
  | { type: 'payment'; payment: Payment }
  | { type: 'presence'; childId: string; name: string; at: number; screen: string }
  | { type: 'leave'; childId: string }

export function postAdminMessage(message: AdminMessage): void {
  if (typeof BroadcastChannel === 'undefined') return
  const channel = new BroadcastChannel(ADMIN_CHANNEL)
  channel.postMessage(message)
  channel.close()
}

interface PaymentState {
  payments: Payment[]
  record: (payment: Omit<Payment, 'id' | 'at'>, at?: Date) => Payment
}

export const usePaymentStore = create<PaymentState>()(
  persist(
    (set) => ({
      payments: [],
      record: (input, at = new Date()) => {
        const payment: Payment = {
          ...input,
          id: `pay-${at.getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
          at: at.toISOString(),
        }
        set((state) => ({ payments: [payment, ...state.payments].slice(0, MAX_PAYMENTS) }))
        postAdminMessage({ type: 'payment', payment })
        return payment
      },
    }),
    { name: 'kiddo.payments', version: 1 },
  ),
)

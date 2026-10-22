/*
 * Whether real payments can be taken. No payment provider (Click, Payme,
 * Uzum) is connected yet, so a production build never pretends to take money:
 * the PRO plans are shown, the pay button explains that online payment is
 * coming, and PRO comes from promo codes. The mock payment works only in
 * development and in test builds that ask for it (VITE_PAYMENTS_MOCK=true).
 */
export function paymentsAvailable(): boolean {
  return !import.meta.env.PROD || import.meta.env.VITE_PAYMENTS_MOCK === 'true'
}

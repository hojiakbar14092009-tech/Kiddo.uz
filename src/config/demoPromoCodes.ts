import { normalizePromo } from '@/store/subscriptionStore'

/*
 * The ten demo promo codes (Phase 20). Demo-only by design: they are public,
 * work only while the build is a demo (DEMO.demoMode, checked by the caller),
 * open PRO for some days on this device and never stand for a payment. Real
 * codes live on the server (Supabase) or sealed on the device (promo/vault.ts).
 */

export interface DemoPromoCode {
  code: string
  days: number
  /** Last moment the code can be redeemed (ISO). */
  validUntil: string
}

const UNTIL = '2027-12-31T23:59:59+05:00'

export const DEMO_PROMO_CODES: readonly DemoPromoCode[] = [
  { code: 'KIDDODEMO01', days: 7, validUntil: UNTIL },
  { code: 'KIDDODEMO02', days: 7, validUntil: UNTIL },
  { code: 'KIDDODEMO03', days: 7, validUntil: UNTIL },
  { code: 'KIDDODEMO04', days: 14, validUntil: UNTIL },
  { code: 'KIDDODEMO05', days: 14, validUntil: UNTIL },
  { code: 'KIDDODEMO06', days: 14, validUntil: UNTIL },
  { code: 'KIDDODEMO07', days: 30, validUntil: UNTIL },
  { code: 'KIDDODEMO08', days: 30, validUntil: UNTIL },
  { code: 'KIDDODEMO09', days: 30, validUntil: UNTIL },
  { code: 'KIDDODEMO10', days: 90, validUntil: UNTIL },
]

export type DemoPromoLookup = { days: number } | 'expired' | null

/** A demo code's days, 'expired' after its date, or null when it is not a demo code. */
export function lookupDemoPromo(
  code: string,
  now: Date = new Date(),
  codes: readonly DemoPromoCode[] = DEMO_PROMO_CODES,
): DemoPromoLookup {
  const key = normalizePromo(code)
  const found = codes.find((item) => item.code === key)
  if (!found) return null
  if (Date.parse(found.validUntil) < now.getTime()) return 'expired'
  return { days: found.days }
}

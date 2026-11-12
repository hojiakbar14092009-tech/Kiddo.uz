/**
 * The commercial PRO price (contract §46), live in the MVP (owner's decision, 2026-11-12): the
 * plans shown without Supabase (`MVP_PLANS`) and the server's `PLANS` (server/pay.ts, test mode).
 * The year is its own figure, not the admin's "12 months − 20 %" rule (Supabase builds only).
 */
export const FUTURE_PRO_PRICES = { monthly: 24_990, yearly: 238_990 } as const

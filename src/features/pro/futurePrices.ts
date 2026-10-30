/**
 * The planned commercial PRO price (contract §46), kept for the future billing
 * work and deliberately NOT active: nothing reads it to charge or to show a
 * price. Live prices are the admin's `app_settings` (`DEFAULT_APP_SETTINGS`),
 * and no payment provider is connected (`paymentsAvailable`). The planned year
 * is its own figure, not the live "12 months − 20 %" rule.
 */
export const FUTURE_PRO_PRICES = { monthly: 24_990, yearly: 238_990 } as const

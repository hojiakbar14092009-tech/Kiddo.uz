/** The server ledger accepts at most this many coins per PRO gift (0005 record_reward). */
export const MAX_PRO_GIFT_COINS = 1000

export function clampGift(value: number): number {
  return Number.isFinite(value) ? Math.min(MAX_PRO_GIFT_COINS, Math.max(0, Math.round(value))) : 0
}

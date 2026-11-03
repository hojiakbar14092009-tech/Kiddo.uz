/*
 * The little shop (Phase 66): pay for a toy with coins of 1, 2 and 5 (exactly
 * the price), then, with one big coin, work out the change. Money, adding and
 * taking away. Pure.
 */

export const COINS = [1, 2, 5] as const
export type Coin = (typeof COINS)[number]

export type ShopRound =
  /** Pay exactly this price with coins. */
  | { kind: 'pay'; item: string; price: number }
  /** A 5 was given for this price: how much comes back? */
  | { kind: 'change'; item: string; price: number; paid: number; options: readonly number[] }

export const SHOP_ROUNDS: readonly ShopRound[] = [
  { kind: 'pay', item: 'lollipop', price: 3 },
  { kind: 'pay', item: 'balloon', price: 6 },
  { kind: 'pay', item: 'teddy', price: 8 },
  { kind: 'change', item: 'ice-cream', price: 3, paid: 5, options: [1, 2, 3] },
  { kind: 'change', item: 'kite', price: 4, paid: 5, options: [3, 1, 2] },
]

export function paid(coins: readonly number[]): number {
  return coins.reduce((sum, coin) => sum + coin, 0)
}

export function changeOf(round: Extract<ShopRound, { kind: 'change' }>): number {
  return round.paid - round.price
}

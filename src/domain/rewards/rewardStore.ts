import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { GUEST_KEY } from '@/domain/childKey'
import { appendIdempotent, hasKey, sumLedger, type LedgerBook } from '@/domain/ledger'
import { useProgressStore } from '@/store/progressStore'
import { newId } from '@/lib/id'

/*
 * The single entry point for coins. Every coin a child gets or loses goes
 * through `grantReward` / `spendCoins`, which write one entry to the child's
 * append-only ledger, at most once per (reason, refId).
 *
 * The balance itself still lives in `progressStore` (TopBar, shop and sync
 * read it there); this module changes it through `grantCoins`, so the ledger
 * and the balance move together. The ledger history is bounded; the window of
 * idempotency keys is twice as long, so trimming never re-opens a paid event.
 */

export type RewardReason =
  | 'task'
  | 'daily-bonus'
  | 'learn'
  | 'quest'
  | 'achievement'
  | 'pro-gift'
  /** The birthday gift: 50 coins once a year (Phase 24; ref `birthday|<year>`). */
  | 'birthday'
  | 'penalty'
  | 'admin'
  | 'purchase'

export interface RewardEntry {
  id: string
  childKey: string
  /** The change actually applied to the balance; negative only for 'penalty' and 'purchase'. */
  coins: number
  reason: RewardReason
  /** What was rewarded (task result id, session id, payment id, …); unique per reason. */
  refId: string
  at: string
}

export interface GrantRewardInput {
  childKey: string
  coins: number
  reason: RewardReason
  refId: string
}

export interface SpendCoinsInput {
  childKey: string
  /** How much to spend (a positive number). */
  coins: number
  refId: string
}

export const REWARD_LIMITS = { maxEntries: 1000, maxKeys: 2000 } as const

type RewardBook = LedgerBook<RewardEntry>

interface RewardState {
  byChild: Record<string, RewardBook>
}

export const useRewardStore = create<RewardState>()(
  persist(() => ({ byChild: {} as Record<string, RewardBook> }), {
    name: 'kiddo.rewards',
    version: 1,
    // Like progress, a guest starts fresh every time the app opens.
    partialize: (state) => {
      const byChild = { ...state.byChild }
      delete byChild[GUEST_KEY]
      return { byChild }
    },
  }),
)

type Listener = (entry: RewardEntry) => void
const listeners = new Set<Listener>()

/** Called for every new ledger entry (e.g. to queue a server sync). Returns an unsubscribe. */
export function subscribeRewards(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function notify(entry: RewardEntry) {
  for (const listener of listeners) {
    try {
      listener(entry)
    } catch {
      // A failing listener (e.g. sync) must never undo or block a reward.
    }
  }
}

const keyOf = (reason: RewardReason, refId: string) => `${reason}|${refId}`

function balance(childKey: string): number {
  return useProgressStore.getState().byChild[childKey]?.coins ?? 0
}

/**
 * Applies `coins` to the balance and records it, unless this (reason, refId)
 * was recorded before. Everything runs synchronously, so two calls with the
 * same refId can never both pay.
 */
function record(childKey: string, coins: number, reason: RewardReason, refId: string) {
  const key = keyOf(reason, refId)
  if (!childKey || !refId || hasKey(useRewardStore.getState().byChild[childKey], key)) return null

  const before = balance(childKey)
  useProgressStore.getState().grantCoins(childKey, coins)
  // The balance never goes below zero, so a penalty may take less than asked.
  const applied = balance(childKey) - before

  const entry: RewardEntry = {
    id: newId(),
    childKey,
    coins: applied,
    reason,
    refId,
    at: new Date().toISOString(),
  }
  const book = appendIdempotent(
    useRewardStore.getState().byChild[childKey],
    entry,
    key,
    REWARD_LIMITS,
  )
  if (!book) return null
  useRewardStore.setState((state) => ({ byChild: { ...state.byChild, [childKey]: book } }))
  notify(entry)
  return entry
}

/**
 * Gives (or, for 'penalty', takes) coins once per (childKey, reason, refId).
 * A repeated call returns `null` and changes nothing. Amounts are rounded;
 * zero, non-finite amounts and negative amounts for any reason other than
 * 'penalty' are refused (`null`). Spending goes through `spendCoins`.
 */
export function grantReward({ childKey, coins, reason, refId }: GrantRewardInput) {
  const amount = Math.round(coins)
  if (!Number.isFinite(amount) || amount === 0) return null
  if (reason === 'purchase') return null
  if (amount < 0 && reason !== 'penalty') return null
  return record(childKey, amount, reason, refId)
}

/**
 * Spends coins once per refId (e.g. `outfit|cap`). Refuses (`null`) when the
 * balance is too small, the amount is not positive, or the refId was spent before.
 */
export function spendCoins({ childKey, coins, refId }: SpendCoinsInput): RewardEntry | null {
  const amount = Math.round(coins)
  if (!Number.isFinite(amount) || amount <= 0) return null
  if (balance(childKey) < amount) return null
  return record(childKey, -amount, 'purchase', refId)
}

/** Was this event already rewarded? */
export function wasRewarded(childKey: string, reason: RewardReason, refId: string): boolean {
  return hasKey(useRewardStore.getState().byChild[childKey], keyOf(reason, refId))
}

/** The child's ledger, newest first (bounded history). */
export function rewardHistory(childKey: string): readonly RewardEntry[] {
  return useRewardStore.getState().byChild[childKey]?.entries ?? []
}

/** Sum of the coins in the kept history (not the balance: that lives in progressStore). */
export function ledgerTotal(childKey: string): number {
  return sumLedger(useRewardStore.getState().byChild[childKey], (entry) => entry.coins)
}

/** Forgets a child's ledger (the child was removed, or a guest starts fresh). */
export function clearChildRewards(childKey: string): void {
  if (!useRewardStore.getState().byChild[childKey]) return
  useRewardStore.setState((state) => {
    const byChild = { ...state.byChild }
    delete byChild[childKey]
    return { byChild }
  })
}

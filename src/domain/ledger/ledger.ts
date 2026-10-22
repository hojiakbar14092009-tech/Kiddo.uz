/*
 * A small, generic append-only ledger with idempotency.
 *
 * Every resource the child can earn or spend (coins today; stars, crystals,
 * seeds, parts, scrolls and keys later) is a book of entries. Each entry
 * comes with an idempotency key, so the same event (a task, a session, a
 * payment) is written at most once – even across reloads and even after old
 * entries were trimmed from the history: the window of recent keys is kept
 * separately and is longer than the history itself.
 *
 * Everything here is pure: functions take a book and return a new one.
 * The newest entry and key come first.
 */

export interface LedgerBook<E> {
  /** Newest first, bounded by `maxEntries`. */
  entries: readonly E[]
  /** Idempotency keys already written, newest first, bounded by `maxKeys`. */
  keys: readonly string[]
}

export interface LedgerLimits {
  maxEntries: number
  /** Must be at least `maxEntries`, so trimming history never forgets a key it still shows. */
  maxKeys: number
}

export const EMPTY_BOOK: LedgerBook<never> = Object.freeze({
  entries: Object.freeze([]) as readonly never[],
  keys: Object.freeze([]) as readonly string[],
})

export function emptyBook<E>(): LedgerBook<E> {
  return EMPTY_BOOK
}

/** Has an entry with this key already been written (within the key window)? */
export function hasKey<E>(book: LedgerBook<E> | undefined, key: string): boolean {
  return book ? book.keys.includes(key) : false
}

/**
 * Appends `entry` under `key` unless that key was already written.
 * Returns the new book, or `null` when the key is a duplicate (nothing changes).
 */
export function appendIdempotent<E>(
  book: LedgerBook<E> | undefined,
  entry: E,
  key: string,
  limits: LedgerLimits,
): LedgerBook<E> | null {
  if (limits.maxEntries < 1 || limits.maxKeys < limits.maxEntries) {
    throw new RangeError('Ledger limits: maxKeys must be >= maxEntries >= 1')
  }
  const current = book ?? emptyBook<E>()
  if (current.keys.includes(key)) return null
  return {
    entries: [entry, ...current.entries].slice(0, limits.maxEntries),
    keys: [key, ...current.keys].slice(0, limits.maxKeys),
  }
}

/** Sum of the amounts of the entries still in the history (optionally filtered). */
export function sumLedger<E>(
  book: LedgerBook<E> | undefined,
  amount: (entry: E) => number,
  filter?: (entry: E) => boolean,
): number {
  if (!book) return 0
  let total = 0
  for (const entry of book.entries) {
    if (!filter || filter(entry)) total += amount(entry)
  }
  return total
}

/** Sums per resource, for books that hold more than one kind of thing. */
export function balancesBy<E>(
  book: LedgerBook<E> | undefined,
  resource: (entry: E) => string,
  amount: (entry: E) => number,
): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const entry of book?.entries ?? []) {
    const name = resource(entry)
    totals[name] = (totals[name] ?? 0) + amount(entry)
  }
  return totals
}

import { describe, expect, it } from 'vitest'
import { appendIdempotent, balancesBy, EMPTY_BOOK, hasKey, sumLedger, type LedgerBook } from '.'

interface Item {
  id: number
  kind: string
  amount: number
}

const LIMITS = { maxEntries: 3, maxKeys: 5 }

function fill(count: number): LedgerBook<Item> {
  let book: LedgerBook<Item> = EMPTY_BOOK
  for (let id = 1; id <= count; id++) {
    book = appendIdempotent(
      book,
      { id, kind: id % 2 ? 'star' : 'seed', amount: id },
      `k${id}`,
      LIMITS,
    )!
  }
  return book
}

describe('ledger', () => {
  it('appends newest first and does not touch the old book', () => {
    const one = appendIdempotent(undefined, { id: 1, kind: 'star', amount: 2 }, 'a', LIMITS)!
    const two = appendIdempotent(one, { id: 2, kind: 'star', amount: 3 }, 'b', LIMITS)!
    expect(two.entries.map((entry) => entry.id)).toEqual([2, 1])
    expect(two.keys).toEqual(['b', 'a'])
    expect(one.entries).toHaveLength(1)
  })

  it('refuses a key it has already written', () => {
    const book = appendIdempotent(EMPTY_BOOK, { id: 1, kind: 'star', amount: 2 }, 'a', LIMITS)!
    expect(appendIdempotent(book, { id: 2, kind: 'star', amount: 9 }, 'a', LIMITS)).toBeNull()
    expect(hasKey(book, 'a')).toBe(true)
    expect(hasKey(book, 'b')).toBe(false)
    expect(hasKey(undefined, 'a')).toBe(false)
  })

  it('keeps refusing keys whose entries were trimmed from the history', () => {
    const book = fill(5)
    expect(book.entries.map((entry) => entry.id)).toEqual([5, 4, 3])
    expect(book.keys).toHaveLength(5)
    expect(appendIdempotent(book, { id: 9, kind: 'star', amount: 1 }, 'k1', LIMITS)).toBeNull()
  })

  it('forgets only keys older than the key window', () => {
    const book = fill(6)
    expect(book.keys).toHaveLength(5)
    expect(hasKey(book, 'k1')).toBe(false)
    expect(hasKey(book, 'k2')).toBe(true)
  })

  it('rejects limits where the key window is shorter than the history', () => {
    expect(() => appendIdempotent(EMPTY_BOOK, 1, 'a', { maxEntries: 5, maxKeys: 2 })).toThrow(
      RangeError,
    )
  })

  it('sums amounts, with a filter and per resource', () => {
    const book = fill(3)
    expect(sumLedger(book, (entry) => entry.amount)).toBe(6)
    expect(
      sumLedger(
        book,
        (entry) => entry.amount,
        (entry) => entry.kind === 'star',
      ),
    ).toBe(4)
    expect(sumLedger(undefined, () => 1)).toBe(0)
    expect(
      balancesBy(
        book,
        (entry) => entry.kind,
        (entry) => entry.amount,
      ),
    ).toEqual({
      star: 4,
      seed: 2,
    })
  })
})

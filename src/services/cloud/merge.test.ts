import { describe, expect, it } from 'vitest'
import { mergeSaved, mergeState } from './merge'

describe('merging a device with the account (first sign-in, two devices)', () => {
  it('joins the children of both and keeps this device’s copy of a child both have', () => {
    const device = {
      children: [
        { id: 'a', name: 'Aziz', stars: 9 },
        { id: 'b', name: 'Lola' },
      ],
      activeChildId: 'b',
    }
    const account = {
      children: [
        { id: 'a', name: 'Aziz', stars: 3 },
        { id: 'c', name: 'Vali' },
      ],
      activeChildId: 'c',
    }
    const merged = mergeState(device, account)
    expect(merged.children).toEqual([
      { id: 'a', name: 'Aziz', stars: 9 },
      { id: 'c', name: 'Vali' },
      { id: 'b', name: 'Lola' },
    ])
    expect(merged.activeChildId).toBe('b')
  })

  it('joins per-child progress (byChild) without dropping either side', () => {
    const merged = mergeState(
      { byChild: { a: { coins: 10 } } },
      { byChild: { a: { coins: 4 }, c: { coins: 7 } } },
    )
    expect(merged.byChild).toEqual({ a: { coins: 10 }, c: { coins: 7 } })
  })

  it('joins activity events by id, in time order', () => {
    const merged = mergeState(
      { events: [{ id: '2', at: '2026-01-02' }] },
      {
        events: [
          { id: '1', at: '2026-01-01' },
          { id: '2', at: '2026-01-02' },
        ],
      },
    )
    expect(merged.events).toEqual([
      { id: '1', at: '2026-01-01' },
      { id: '2', at: '2026-01-02' },
    ])
  })

  it('keeps whichever side exists and the newer saved version', () => {
    expect(mergeSaved(null, { state: { x: 1 }, version: 2 })).toEqual({
      state: { x: 1 },
      version: 2,
    })
    expect(mergeSaved({ state: { x: 1 }, version: 3 }, { state: { y: 1 }, version: 2 })).toEqual({
      state: { y: 1, x: 1 },
      version: 3,
    })
  })
})

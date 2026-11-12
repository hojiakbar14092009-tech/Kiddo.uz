import { beforeEach, describe, expect, it } from 'vitest'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { persistedStore } from './startCloudSync'

const makeStore = () =>
  create<{ coins: number; add: () => void }>()(
    persist((set) => ({ coins: 0, add: () => set((state) => ({ coins: state.coins + 1 })) }), {
      name: 'kiddo.test-sync',
      version: 2,
    }),
  )

describe('persistedStore', () => {
  beforeEach(() => localStorage.clear())

  it('reads what the device saved and hears every change', () => {
    const store = makeStore()
    const synced = persistedStore(store)
    let heard = 0
    const stop = synced.subscribe(() => (heard += 1))
    store.getState().add()
    expect(heard).toBe(1)
    expect(synced.read()).toEqual({ state: { coins: 1 }, version: 2 })
    stop()
  })

  it("writing the account's copy updates the live store at once", () => {
    const store = makeStore()
    persistedStore(store).write({ state: { coins: 7 }, version: 2 })
    expect(store.getState().coins).toBe(7)
    expect(JSON.parse(localStorage.getItem('kiddo.test-sync')!).state.coins).toBe(7)
  })

  it('a broken saved copy reads as nothing, not a crash', () => {
    localStorage.setItem('kiddo.test-sync', '{broken')
    expect(persistedStore(makeStore()).read()).toBeNull()
  })
})

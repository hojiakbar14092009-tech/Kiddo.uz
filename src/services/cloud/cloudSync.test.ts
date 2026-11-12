import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CloudSync, SYNCED, type SyncedStore, type SyncKey } from './cloudSync'
import type { Saved } from './merge'

function fakeStores(initial: Partial<Record<SyncKey, Saved>>) {
  const data: Partial<Record<SyncKey, Saved>> = { ...initial }
  const listeners = new Map<SyncKey, Set<() => void>>()
  const stores = Object.fromEntries(
    (Object.keys(SYNCED) as SyncKey[]).map((key) => {
      listeners.set(key, new Set())
      const store: SyncedStore = {
        read: () => data[key] ?? null,
        write: (saved) => {
          data[key] = saved
          for (const listener of listeners.get(key)!) listener()
        },
        subscribe: (listener) => {
          listeners.get(key)!.add(listener)
          return () => listeners.get(key)!.delete(listener)
        },
      }
      return [key, store]
    }),
  ) as Record<SyncKey, SyncedStore>
  const change = (key: SyncKey, saved: Saved) => stores[key].write(saved) // like a child earning coins
  return { stores, data, change }
}

type Reply = { status: number; body: unknown } | 'offline'

function mockServer(replies: Record<string, Reply[]>) {
  const calls: { method: string; body: unknown }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: RequestInit) => {
      const method = init.method ?? 'GET'
      calls.push({ method, body: init.body ? JSON.parse(String(init.body)) : undefined })
      const reply = replies[method]?.shift() ?? { status: 200, body: { revs: {} } }
      if (reply === 'offline') throw new TypeError('Failed to fetch')
      return new Response(JSON.stringify(reply.body), {
        status: reply.status,
        headers: { 'content-type': 'application/json' },
      })
    }),
  )
  return calls
}

const family = (ids: string[]): Saved => ({
  state: { children: ids.map((id) => ({ id })) },
  version: 3,
})

describe('cloud sync (batched, offline queue, conflicts)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0) // no backoff wait in tests
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('first sign-in: the device’s progress goes to an empty account, nothing is lost', async () => {
    const { stores } = fakeStores({
      family: family(['a']),
      progress: { state: { byChild: { a: { coins: 5 } } } },
    })
    const calls = mockServer({
      GET: [{ status: 200, body: { keys: {} } }],
      PUT: [{ status: 200, body: { revs: { family: 1, progress: 1 } } }],
    })
    const sync = new CloudSync('u1', stores)
    await sync.start()
    await vi.advanceTimersByTimeAsync(16_000)
    expect(calls.map((c) => c.method)).toEqual(['GET', 'PUT'])
    expect(calls[1]!.body).toEqual({
      changes: {
        family: { baseRev: 0, data: family(['a']) },
        progress: { baseRev: 0, data: { state: { byChild: { a: { coins: 5 } } } } },
      },
    })
    expect(JSON.parse(localStorage.getItem('kiddo.cloud')!).dirty).toEqual([])
    sync.stop()
  })

  it('first sign-in on a second device: joins its children with the account’s', async () => {
    const { stores, data } = fakeStores({ family: family(['b']) })
    const calls = mockServer({
      GET: [{ status: 200, body: { keys: { family: { rev: 4, data: family(['a']) } } } }],
      PUT: [{ status: 200, body: { revs: { family: 5 } } }],
    })
    const sync = new CloudSync('u1', stores)
    await sync.start()
    expect(data.family?.state.children).toEqual([{ id: 'a' }, { id: 'b' }])
    await vi.advanceTimersByTimeAsync(16_000)
    expect(calls[1]!.body).toEqual({
      changes: { family: { baseRev: 4, data: family(['a', 'b']) } },
    })
    sync.stop()
  })

  it('many quick changes are one request', async () => {
    const { stores, change } = fakeStores({})
    const calls = mockServer({
      GET: [{ status: 200, body: { keys: {} } }],
      PUT: [{ status: 200, body: { revs: { progress: 1, rewards: 1 } } }],
    })
    const sync = new CloudSync('u1', stores)
    await sync.start()
    for (let coins = 1; coins <= 10; coins += 1) {
      change('progress', { state: { byChild: { a: { coins } } } })
      change('rewards', { state: { byChild: { a: { stars: coins } } } })
      await vi.advanceTimersByTimeAsync(300)
    }
    await vi.advanceTimersByTimeAsync(16_000)
    const puts = calls.filter((c) => c.method === 'PUT')
    expect(puts).toHaveLength(1)
    expect(puts[0]!.body).toMatchObject({
      changes: { progress: { data: { state: { byChild: { a: { coins: 10 } } } } } },
    })
    sync.stop()
  })

  it('offline: keeps the changes on the device and sends them when the network is back', async () => {
    const { stores, change } = fakeStores({})
    const calls = mockServer({
      GET: [{ status: 200, body: { keys: {} } }],
      PUT: ['offline', 'offline', 'offline', { status: 200, body: { revs: { progress: 1 } } }],
    })
    const sync = new CloudSync('u1', stores)
    await sync.start()
    change('progress', { state: { byChild: { a: { coins: 1 } } } })
    await vi.advanceTimersByTimeAsync(16_000)
    expect(JSON.parse(localStorage.getItem('kiddo.cloud')!).dirty).toEqual(['progress'])
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(100)
    expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(4)
    expect(JSON.parse(localStorage.getItem('kiddo.cloud')!).dirty).toEqual([])
    sync.stop()
  })

  it('another device wrote first (409): merges its copy in and sends again on its revision', async () => {
    const { stores, data, change } = fakeStores({})
    const calls = mockServer({
      GET: [{ status: 200, body: { keys: {} } }],
      PUT: [
        {
          status: 409,
          body: { revs: {}, conflicts: { family: { rev: 2, data: family(['other']) } } },
        },
        { status: 200, body: { revs: { family: 3 } } },
      ],
    })
    const sync = new CloudSync('u1', stores)
    await sync.start()
    change('family', family(['mine']))
    await vi.advanceTimersByTimeAsync(16_000)
    expect(data.family?.state.children).toEqual([{ id: 'other' }, { id: 'mine' }])
    expect(calls.filter((c) => c.method === 'PUT')[1]!.body).toEqual({
      changes: { family: { baseRev: 2, data: family(['other', 'mine']) } },
    })
    expect(JSON.parse(localStorage.getItem('kiddo.cloud')!).revs.family).toBe(3)
    sync.stop()
  })
})

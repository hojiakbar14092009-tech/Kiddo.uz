import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFamilyStore } from '@/store/familyStore'
import { deleteNameVoice, loadNameVoice, recordingFormat, saveNameVoice } from './nameVoice'

/*
 * The child's name in a parent's voice stays on this device: IndexedDB only, no request
 * leaves the app, nothing of it is part of the profile that the cloud sync uploads, and it
 * goes with the profile.
 */

/** Just enough IndexedDB for one object store (jsdom has none). */
function fakeIndexedDB() {
  const data = new Map<IDBValidKey, unknown>()
  const request = <T>(result: () => T) => {
    const req = {} as { result: T; onsuccess?: () => void; onerror?: () => void }
    queueMicrotask(() => {
      req.result = result()
      req.onsuccess?.()
    })
    return req
  }
  const store = {
    put: (value: unknown, key: IDBValidKey) => request(() => data.set(key, value) && key),
    get: (key: IDBValidKey) => request(() => data.get(key)),
    delete: (key: IDBValidKey) => request(() => data.delete(key) && undefined),
  }
  const db = {
    createObjectStore: () => store,
    transaction: () => ({ objectStore: () => store }),
  }
  return {
    data,
    open: () => {
      const req = {} as {
        result: typeof db
        onupgradeneeded?: () => void
        onsuccess?: () => void
      }
      queueMicrotask(() => {
        req.result = db
        req.onupgradeneeded?.()
        req.onsuccess?.()
      })
      return req
    },
  }
}

let idb: ReturnType<typeof fakeIndexedDB>
const fetchSpy = vi.fn()

beforeEach(() => {
  idb = fakeIndexedDB()
  vi.stubGlobal('indexedDB', idb)
  vi.stubGlobal('fetch', fetchSpy)
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchSpy.mockReset()
})

describe('the name in the parent’s voice', () => {
  it('is kept on this device and read back from there', async () => {
    const recording = new Blob(['name'], { type: 'audio/webm;codecs=opus' })
    await saveNameVoice('ali', recording)
    expect(idb.data.get('ali')).toBe(recording)
    expect(await loadNameVoice('ali')).toBe(recording)
    expect(await loadNameVoice('vali')).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('is never part of the profile, so the cloud sync cannot upload it', async () => {
    await saveNameVoice('ali', new Blob(['name']))
    const profile = useFamilyStore.getState().addChild({
      name: 'Ali',
      birthDate: '2020-01-01',
      gender: 'boy',
      mascot: 'boy',
    } as never)
    expect(JSON.stringify(profile)).not.toMatch(/blob|recording|nameVoice/i)
    // the module itself talks to nothing but IndexedDB
    const source = readFileSync(resolve('src/features/attention/nameVoice.ts'), 'utf8')
    expect(source).not.toMatch(/fetch\(|supabase|XMLHttpRequest|sendBeacon/)
  })

  it('goes with the profile', async () => {
    const child = useFamilyStore.getState().addChild({
      name: 'Malika',
      birthDate: '2020-01-01',
      gender: 'girl',
      mascot: 'girl',
    } as never)
    await saveNameVoice(child.id, new Blob(['name']))
    useFamilyStore.getState().removeChild(child.id)
    await vi.waitFor(() => expect(idb.data.has(child.id)).toBe(false))
  })

  it('a missing store is no error: no name, nothing to delete', async () => {
    vi.stubGlobal('indexedDB', undefined)
    expect(await loadNameVoice('ali')).toBeNull()
    await expect(deleteNameVoice('ali')).resolves.toBeUndefined()
  })

  it('tells the player the file type', () => {
    expect(recordingFormat(new Blob([], { type: 'audio/webm;codecs=opus' }))).toBe('webm')
    expect(recordingFormat(new Blob([], { type: 'audio/mp4' }))).toBe('mp4')
  })
})

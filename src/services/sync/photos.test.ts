import type { SupabaseClient } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFamilyStore } from '@/store/familyStore'
import { useSettingsStore } from '@/store/settingsStore'
import type { ChildProfile } from '@/store/familyStore'
import {
  downloadPhoto,
  jpegBytes,
  photoChanges,
  photoPath,
  removeAllPhotos,
  RETRY_MS,
  syncAllPhotos,
  trackPhotos,
  uploadPhoto,
} from './photos'

/* Phase 44: children's photos in the parent's private cloud, only when turned on. */

const JPEG = `data:image/jpeg;base64,${btoa(String.fromCharCode(0xff, 0xd8, 0xff, 0xe0, 1, 2))}`
const kid = (id: string, photo?: string) => ({ id, photo }) as unknown as ChildProfile

describe('cloud photos', () => {
  it('only a JPEG data URL becomes bytes', () => {
    expect(jpegBytes(JPEG)?.slice(0, 3)).toEqual(new Uint8Array([0xff, 0xd8, 0xff]))
    expect(jpegBytes('data:image/png;base64,AAAA')).toBeNull()
    expect(jpegBytes('https://example.com/a.jpg')).toBeNull()
  })

  it('a photo lives at <parent>/<child>.jpg', () => {
    expect(photoPath('u1', 'c1')).toBe('u1/c1.jpg')
  })

  it('finds new, changed and removed photos, and the photos of removed children', () => {
    const before = [kid('a', 'p1'), kid('b', 'p2'), kid('c'), kid('d', 'p4')]
    const after = [kid('a', 'p1'), kid('b', 'p2b'), kid('c', 'p3'), kid('e')]
    expect(photoChanges(before, after)).toEqual({
      upload: [
        { id: 'b', photo: 'p2b' },
        { id: 'c', photo: 'p3' },
      ],
      remove: ['d'],
    })
    expect(photoChanges([kid('a', 'p1')], [kid('a')]).remove).toEqual(['a'])
  })

  it('uploads to the private bucket in place, and brings back only a real JPEG', async () => {
    const upload = vi.fn(async () => ({ error: null }))
    let file = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 1])])
    const download = vi.fn(async () => ({ data: file, error: null }))
    const from = vi.fn(() => ({ upload, download }))
    const supabase = { storage: { from } } as unknown as SupabaseClient
    expect(await uploadPhoto(supabase, 'u1', 'c1', JPEG)).toBe(true)
    expect(from).toHaveBeenCalledWith('child-photos')
    expect(upload).toHaveBeenCalledWith(
      'u1/c1.jpg',
      expect.any(Blob),
      expect.objectContaining({ upsert: true, contentType: 'image/jpeg' }),
    )
    expect(await uploadPhoto(supabase, 'u1', 'c1', 'data:image/png;base64,AAAA')).toBe(false)
    expect(await downloadPhoto(supabase, 'u1', 'c1')).toMatch(/^data:image\/jpeg;base64,/)
    file = new Blob([new Uint8Array([0x3c, 0x68, 0x74])])
    expect(await downloadPhoto(supabase, 'u1', 'c1')).toBeNull()
  })
})

describe('keeping cloud photos in step', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useFamilyStore.setState({ children: [], activeChildId: null })
    useSettingsStore.setState({ photoRemovals: [] })
  })
  afterEach(() => vi.useRealTimers())

  function storage(uploadResults: boolean[], removeOk = true) {
    const upload = vi.fn(async () => ({ error: uploadResults.shift() ? null : { message: 'rls' } }))
    const remove = vi.fn(async () => ({ error: removeOk ? null : { message: 'offline' } }))
    const list = vi.fn(async () => ({
      data: [{ name: 'a.jpg' }, { name: 'gone.jpg' }],
      error: null,
    }))
    const download = vi.fn(async () => ({ data: null, error: { message: 'none' } }))
    const supabase = { storage: { from: () => ({ upload, remove, list, download }) } }
    return { supabase: supabase as unknown as SupabaseClient, upload, remove, list }
  }

  it('a new child’s photo is sent again until its profile is in the cloud', async () => {
    const { supabase, upload } = storage([false, false, true])
    const stop = trackPhotos(supabase, 'u1')
    useFamilyStore.setState({ children: [kid('a', JPEG)] })
    await vi.advanceTimersByTimeAsync(0)
    expect(upload).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(RETRY_MS[0])
    expect(upload).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(RETRY_MS[1])
    expect(upload).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(RETRY_MS[2])
    expect(upload).toHaveBeenCalledTimes(3)
    stop()
  })

  it('a removal that fails is remembered and done at the next sign-in', async () => {
    const failing = storage([], false)
    const stop = trackPhotos(failing.supabase, 'u1')
    useFamilyStore.setState({ children: [kid('a', JPEG)] })
    useFamilyStore.setState({ children: [] })
    await vi.advanceTimersByTimeAsync(0)
    expect(useSettingsStore.getState().photoRemovals).toEqual(['u1/a'])
    stop()
    // another account signing in first does not take this account's removal
    const other = storage([])
    expect(await syncAllPhotos(other.supabase, 'u2')).toBe(0)
    expect(other.remove).not.toHaveBeenCalled()
    expect(useSettingsStore.getState().photoRemovals).toEqual(['u1/a'])
    const working = storage([])
    expect(await syncAllPhotos(working.supabase, 'u1')).toBe(0)
    expect(working.remove).toHaveBeenCalledWith(['u1/a.jpg'])
    expect(useSettingsStore.getState().photoRemovals).toEqual([])
  })

  it('at sign-in every photo is sent (failures counted); turning off empties the whole folder', async () => {
    useFamilyStore.setState({ children: [kid('a', JPEG), kid('b', JPEG)] })
    const { supabase, remove } = storage([true, false])
    expect(await syncAllPhotos(supabase, 'u1')).toBe(1)
    expect(await removeAllPhotos(supabase, 'u1')).toBe(true)
    expect(remove).toHaveBeenLastCalledWith(['u1/a.jpg', 'u1/gone.jpg'])
  })
})

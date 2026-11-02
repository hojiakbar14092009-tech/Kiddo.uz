import type { SupabaseClient } from '@supabase/supabase-js'
import type { ChildProfile } from '@/store/familyStore'
import { useFamilyStore } from '@/store/familyStore'
import { useSettingsStore } from '@/store/settingsStore'

/*
 * Children's photos in the parent's cloud account (Phase 44), only when the parent turns it on
 * (settings `cloudPhotos`). A private bucket: `child-photos/<parent id>/<child id>.jpg`, which
 * only that parent can read or write (migration 0018). The photo is the small 256 × 256 JPEG
 * made on the device (features/profiles/photo.ts), never the original.
 */

export const PHOTO_BUCKET = 'child-photos'

export const photoPath = (userId: string, childId: string) => `${userId}/${childId}.jpg`

/** A `data:image/jpeg;base64,…` URL as bytes (null when it is not a JPEG data URL). */
export function jpegBytes(dataUrl: string): Uint8Array | null {
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl)
  if (!match) return null
  try {
    const text = atob(match[1]!)
    const bytes = new Uint8Array(text.length)
    for (let i = 0; i < text.length; i += 1) bytes[i] = text.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

async function blobToDataUrl(blob: Blob): Promise<string | null> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  // only a real JPEG comes back into a profile
  if (!(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)) return null
  let text = ''
  for (let i = 0; i < bytes.length; i += 1) text += String.fromCharCode(bytes[i]!)
  return `data:image/jpeg;base64,${btoa(text)}`
}

export async function uploadPhoto(
  supabase: SupabaseClient,
  userId: string,
  childId: string,
  dataUrl: string,
): Promise<boolean> {
  const bytes = jpegBytes(dataUrl)
  if (!bytes) return false
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(photoPath(userId, childId), new Blob([bytes as BlobPart], { type: 'image/jpeg' }), {
      upsert: true,
      contentType: 'image/jpeg',
      cacheControl: '0',
    })
  return !error
}

export async function removePhotos(
  supabase: SupabaseClient,
  userId: string,
  childIds: readonly string[],
): Promise<boolean> {
  if (childIds.length === 0) return true
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .remove(childIds.map((id) => photoPath(userId, id)))
  return !error
}

export async function downloadPhoto(
  supabase: SupabaseClient,
  userId: string,
  childId: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .download(photoPath(userId, childId))
  if (error || !data) return null
  return blobToDataUrl(data)
}

/** Photo changes between two family lists: uploads (new or changed) and removals. */
export function photoChanges(
  previous: readonly ChildProfile[],
  next: readonly ChildProfile[],
): { upload: { id: string; photo: string }[]; remove: string[] } {
  const before = new Map(previous.map((child) => [child.id, child.photo]))
  const upload: { id: string; photo: string }[] = []
  const remove: string[] = []
  for (const child of next) {
    const old = before.get(child.id)
    if (child.photo && child.photo !== old) upload.push({ id: child.id, photo: child.photo })
    else if (!child.photo && old) remove.push(child.id)
    before.delete(child.id)
  }
  // a child removed: its photo goes first (after the profile is gone the parent cannot reach it)
  for (const [id, photo] of before) if (photo !== undefined) remove.push(id)
  return { upload, remove }
}

/** Waits before trying a failed upload again: the new child's profile must reach the cloud first. */
export const RETRY_MS = [3_000, 15_000, 60_000] as const

/** Removals still to do, as `<parent id>/<child id>`: each belongs to its own account. */
const removals = () => useSettingsStore.getState().photoRemovals
const setRemovals = (keys: string[]) => useSettingsStore.getState().setPhotoRemovals(keys)
const removalKey = (userId: string, childId: string) => `${userId}/${childId}`
/** This account's removals still to do (child ids). */
const removalsOf = (userId: string) =>
  removals().flatMap((key) => (key.startsWith(`${userId}/`) ? [key.slice(userId.length + 1)] : []))

/** Removes photos now, or remembers them to be removed at the next sign-in. */
async function removeOrRemember(supabase: SupabaseClient, userId: string, ids: string[]) {
  if (ids.length === 0) return
  const done = await removePhotos(supabase, userId, ids).catch(() => false)
  const keys = ids.map((id) => removalKey(userId, id))
  setRemovals(done ? removals().filter((key) => !keys.includes(key)) : [...removals(), ...keys])
}

/**
 * Keeps the cloud copy of the photos in step while the parent keeps photos in the cloud: a new
 * or changed photo goes up (tried again a few times: a new child's profile reaches the cloud a
 * moment later, and only then may its photo go there), a removed one is removed (or remembered).
 * A photo that just came down from the cloud is not sent back. Returns a stop function.
 */
export function trackPhotos(supabase: SupabaseClient, userId: string): () => void {
  const timers = new Set<ReturnType<typeof setTimeout>>()
  let stopped = false
  const send = (id: string, photo: string, attempt: number) => {
    void uploadPhoto(supabase, userId, id, photo)
      .catch(() => false)
      .then((done) => {
        if (done || stopped || attempt >= RETRY_MS.length) return
        const timer = setTimeout(() => {
          timers.delete(timer)
          // only if it is still this child's photo
          const now = useFamilyStore.getState().children.find((child) => child.id === id)
          if (now?.photo === photo) send(id, photo, attempt + 1)
        }, RETRY_MS[attempt])
        timers.add(timer)
      })
  }
  const stop = useFamilyStore.subscribe((next, previous) => {
    if (next.children === previous.children) return
    const { upload, remove } = photoChanges(previous.children, next.children)
    for (const { id, photo } of upload) {
      if (fromCloud.get(id) === photo) fromCloud.delete(id)
      else send(id, photo, 0)
    }
    void removeOrRemember(supabase, userId, remove)
  })
  return () => {
    stopped = true
    stop()
    for (const timer of timers) clearTimeout(timer)
  }
}

/** Photos just brought down from the cloud (not to be sent straight back). */
const fromCloud = new Map<string, string>()

/**
 * At sign-in (and when cloud photos are turned on): photos still to be removed are removed,
 * every photo here goes up (one that failed before is sent now), and photos the cloud has fill
 * the profiles here that have none. Returns how many photos could not be sent.
 */
export async function syncAllPhotos(supabase: SupabaseClient, userId: string): Promise<number> {
  await removeOrRemember(supabase, userId, removalsOf(userId))
  let failed = 0
  for (const child of useFamilyStore.getState().children) {
    if (child.photo) {
      if (!(await uploadPhoto(supabase, userId, child.id, child.photo).catch(() => false))) {
        failed += 1
      }
    } else {
      const photo = await downloadPhoto(supabase, userId, child.id).catch(() => null)
      if (photo) {
        fromCloud.set(child.id, photo)
        useFamilyStore.getState().updateChild(child.id, { photo })
      }
    }
  }
  return failed
}

/**
 * Turning cloud photos off: everything in the parent's photo folder is removed (a removed
 * child's photo too); the photos stay on this device. False when the folder could not be emptied.
 */
export async function removeAllPhotos(supabase: SupabaseClient, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage.from(PHOTO_BUCKET).list(userId, { limit: 100 })
    if (error) return false
    const names = (data ?? []).map((item) => `${userId}/${item.name}`)
    if (names.length > 0) {
      const removed = await supabase.storage.from(PHOTO_BUCKET).remove(names)
      if (removed.error) return false
    }
    setRemovals(removals().filter((key) => !key.startsWith(`${userId}/`)))
    return true
  } catch {
    return false
  }
}

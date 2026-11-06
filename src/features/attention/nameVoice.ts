/*
 * The child's name in a parent's own voice (the attention helper calls the child by it:
 * "[Ali] … qayerdasan? Davom etamiz!"). Recorded once in the profile, kept ONLY on this
 * device in IndexedDB: never uploaded, never part of the cloud sync or a backup, and
 * deleted with the profile (familyStore.removeChild).
 */

const DB = 'kiddo-name-voices'
const STORE = 'names'

/** The longest recording kept: a name takes two or three seconds. */
export const NAME_MAX_MS = 3_000

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'))
      return
    }
    const request = indexedDB.open(DB, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function run<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const request = work(db.transaction(STORE, mode).objectStore(STORE))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      }),
  )
}

export const saveNameVoice = (childId: string, recording: Blob) =>
  run('readwrite', (store) => store.put(recording, childId)).then(() => undefined)

/** The child's recorded name, or null (none recorded, or no IndexedDB here). */
export const loadNameVoice = (childId: string): Promise<Blob | null> =>
  run<Blob | undefined>('readonly', (store) => store.get(childId) as IDBRequest<Blob | undefined>)
    .then((blob) => blob ?? null)
    .catch(() => null)

export const deleteNameVoice = (childId: string): Promise<void> =>
  run('readwrite', (store) => store.delete(childId))
    .then(() => undefined)
    .catch(() => undefined)

/** The player's file type for a recording ('webm' in Chrome, 'mp4' in Safari). */
export function recordingFormat(blob: Blob): string {
  const type = blob.type.split(';')[0] ?? ''
  if (type.includes('mp4') || type.includes('aac')) return 'mp4'
  if (type.includes('ogg')) return 'ogg'
  if (type.includes('wav')) return 'wav'
  return 'webm'
}

/** Uploaded ad videos on this device, in IndexedDB (too big for local storage). */

const DB = 'kiddo-ads'
const STORE = 'videos'

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

export const saveAdVideo = (id: string, file: Blob) =>
  run('readwrite', (store) => store.put(file, id))

export const loadAdVideo = (id: string) =>
  run<Blob | undefined>('readonly', (store) => store.get(id) as IDBRequest<Blob | undefined>)

export const deleteAdVideo = (id: string) => run('readwrite', (store) => store.delete(id))

/** Reads a video's length in seconds from its metadata. */
export function videoDuration(src: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => resolve(video.duration)
    video.onerror = () => reject(new Error('video'))
    video.src = src
  })
}

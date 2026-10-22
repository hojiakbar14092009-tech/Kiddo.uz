/*
 * The child's gallery of saved Studio pictures. Pictures are PNG blobs in
 * IndexedDB (localStorage is too small for images), one list per child key.
 * A child keeps at most MAX_WORKS pictures (and MAX_BYTES of them): saving
 * one more removes the oldest, and the caller tells the child so.
 * Storage errors are never hidden: a failed write is a failed save (no
 * reward), a failed read is an error with a retry. Only where the browser has
 * no IndexedDB at all (tests) the gallery lives in memory.
 */

export const GALLERY_LIMITS = { maxWorks: 30, maxBytes: 25 * 1024 * 1024 } as const

export interface WorkMeta {
  id: string
  childKey: string
  createdAt: number
  bytes: number
}

export interface Work extends WorkMeta {
  image: Blob
}

export interface GalleryBackend {
  list(childKey: string): Promise<Work[]>
  put(work: Work): Promise<void>
  remove(id: string): Promise<void>
}

/**
 * Which existing works must go so that `incoming` fits: the oldest first,
 * until both the count and the size limit hold. Pure, so it is tested alone.
 */
export function planEviction(
  existing: readonly WorkMeta[],
  incoming: Pick<WorkMeta, 'bytes'>,
  limits: { maxWorks: number; maxBytes: number } = GALLERY_LIMITS,
): string[] {
  const oldestFirst = [...existing].sort((a, b) => a.createdAt - b.createdAt)
  let count = oldestFirst.length + 1
  let bytes = oldestFirst.reduce((sum, work) => sum + work.bytes, 0) + incoming.bytes
  const evict: string[] = []
  for (const work of oldestFirst) {
    if (count <= limits.maxWorks && bytes <= limits.maxBytes) break
    evict.push(work.id)
    count -= 1
    bytes -= work.bytes
  }
  return evict
}

export interface SaveResult {
  work: Work
  /** How many old pictures were removed to make room. */
  removed: number
}

export function createGallery(backend: GalleryBackend, now: () => number = Date.now) {
  return {
    /** Newest first. Rejects when the storage cannot be read (the page shows a retry). */
    async list(childKey: string): Promise<Work[]> {
      const works = await backend.list(childKey)
      return works.sort((a, b) => b.createdAt - a.createdAt)
    },
    /**
     * Writes the new work first; only once it is stored are the oldest works
     * removed to keep the limits. A failed write rejects and removes nothing.
     */
    async save(childKey: string, id: string, image: Blob): Promise<SaveResult> {
      const existing = await backend.list(childKey)
      const evict = planEviction(existing, { bytes: image.size })
      const work: Work = { id, childKey, createdAt: now(), bytes: image.size, image }
      await backend.put(work)
      let removed = 0
      for (const old of evict) {
        try {
          await backend.remove(old)
          removed += 1
        } catch {
          // the new work is safe; the next save tries the old one again
        }
      }
      return { work, removed }
    },
    remove(id: string): Promise<void> {
      return backend.remove(id)
    },
    /** Deletes every picture of a removed child (rejects if any is left). */
    async removeChild(childKey: string): Promise<void> {
      for (const work of await backend.list(childKey)) await backend.remove(work.id)
    },
  }
}

export type Gallery = ReturnType<typeof createGallery>

export function memoryBackend(): GalleryBackend {
  const works = new Map<string, Work>()
  return {
    list: async (childKey) => [...works.values()].filter((work) => work.childKey === childKey),
    put: async (work) => {
      works.set(work.id, work)
    },
    remove: async (id) => {
      works.delete(id)
    },
  }
}

const DB_NAME = 'kiddo-studio'
const STORE = 'works'

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export function indexedDbBackend(factory: IDBFactory): GalleryBackend {
  let opening: Promise<IDBDatabase> | null = null
  const db = () => {
    opening ??= new Promise<IDBDatabase>((resolve, reject) => {
      const open = factory.open(DB_NAME, 1)
      open.onupgradeneeded = () => {
        const store = open.result.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('childKey', 'childKey')
      }
      open.onsuccess = () => resolve(open.result)
      open.onerror = () => {
        opening = null
        reject(open.error)
      }
    })
    return opening
  }
  const store = async (mode: IDBTransactionMode) =>
    (await db()).transaction(STORE, mode).objectStore(STORE)

  return {
    list: async (childKey) =>
      request((await store('readonly')).index('childKey').getAll(childKey)) as Promise<Work[]>,
    put: async (work) => {
      await request((await store('readwrite')).put(work))
    },
    remove: async (id) => {
      await request((await store('readwrite')).delete(id))
    },
  }
}

let shared: Gallery | null = null

/** The app's gallery (IndexedDB when the browser has it). */
export function studioGallery(): Gallery {
  shared ??= createGallery(
    // no silent fallback: a picture that cannot be stored is reported as not saved
    typeof indexedDB === 'undefined' ? memoryBackend() : indexedDbBackend(indexedDB),
  )
  return shared
}

import { api, ApiError } from './api'
import { mergeSaved, type Saved } from './merge'

/**
 * A signed-in family's progress, kept in the account (Turso via /api/sync). The child never waits
 * for it: every change is saved on the device first (zustand persist), and the cloud copy follows.
 *
 * - Batched: changes within DEBOUNCE_MS (15 s) go in ONE request (one database transaction), so a burst of
 *   coins and answers is one write, not dozens. At most MAX_WAIT_MS (2 min) between a change and its send; everything on tab close.
 * - Offline queue: what is still unsent (`dirty`) and the last revisions are saved on the device,
 *   so a closed tab or a lost network loses nothing; sent again on `online` / the next app start.
 * - Idempotent: each write carries the revision it was based on; a repeat or a stale write is
 *   refused by the server and merged here (merge.ts) instead of overwriting the other device.
 */
export const SYNCED = {
  family: 'kiddo.family',
  progress: 'kiddo.progress',
  learn: 'kiddo.learn',
  rewards: 'kiddo.rewards',
  universe: 'kiddo.universe',
  activity: 'kiddo.activity',
} as const
export type SyncKey = keyof typeof SYNCED

/** How the engine reaches one saved store (real: localStorage + the zustand store; tests: fakes). */
export interface SyncedStore {
  read(): Saved | null
  /** replaces the device copy (and the live store) with this one */
  write(saved: Saved): void
  subscribe(listener: () => void): () => void
}

const LEDGER = 'kiddo.cloud'
// Vercel Hobby: 1M function calls a month. A playing child sends at most one batch every 15 s – 2 min
// (the device already holds every change; the cloud copy may lag a little).
const DEBOUNCE_MS = 15_000
const MAX_WAIT_MS = 120_000
const RETRY_MS = 60_000

interface Ledger {
  userId: string
  revs: Partial<Record<SyncKey, number>>
  dirty: SyncKey[]
}

function readLedger(userId: string): Ledger {
  try {
    const saved = JSON.parse(localStorage.getItem(LEDGER) ?? 'null') as Ledger | null
    // another account on this device starts from the merge, never from someone else's revisions
    if (saved && saved.userId === userId) return saved
  } catch {
    // a broken ledger: start again (the first pull merges, nothing is lost)
  }
  return { userId, revs: {}, dirty: [] }
}

export class CloudSync {
  private ledger: Ledger
  private timer: ReturnType<typeof setTimeout> | null = null
  private firstDirtyAt = 0
  private applying = false
  private sending: Promise<void> | null = null
  private stops: (() => void)[] = []
  private readonly stores: Record<SyncKey, SyncedStore>

  constructor(userId: string, stores: Record<SyncKey, SyncedStore>) {
    this.ledger = readLedger(userId)
    this.stores = stores
  }

  private save() {
    try {
      localStorage.setItem(LEDGER, JSON.stringify(this.ledger))
    } catch {
      // storage full: the in-memory queue still sends while the app is open
    }
  }

  /** Pull the account's copy, merge it in, then follow every change. */
  async start(): Promise<void> {
    for (const key of Object.keys(this.stores) as SyncKey[]) {
      this.stops.push(this.stores[key].subscribe(() => this.markDirty(key)))
    }
    const onOnline = () => void this.flush()
    const onHide = () => {
      if (document.visibilityState === 'hidden') void this.flush(true)
    }
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onHide)
    this.stops.push(() => window.removeEventListener('online', onOnline))
    this.stops.push(() => document.removeEventListener('visibilitychange', onHide))
    await this.pull()
    if (this.ledger.dirty.length) this.schedule()
  }

  stop(): void {
    for (const stop of this.stops.splice(0)) stop()
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }

  private async pull() {
    let keys: Record<string, { rev: number; data: Saved }>
    try {
      ;({ keys } = await api<{ keys: Record<string, { rev: number; data: Saved }> }>('sync'))
    } catch {
      return // offline: the device copy is the truth until the network is back
    }
    for (const key of Object.keys(this.stores) as SyncKey[]) {
      const server = keys[key]
      const known = this.ledger.revs[key]
      const local = this.stores[key].read()
      if (!server) {
        // the account has nothing yet: this device's progress becomes the account's (first sign-in)
        if (local && !this.ledger.dirty.includes(key)) this.ledger.dirty.push(key)
        continue
      }
      if (server.rev === known) continue
      // a first sign-in (no revision yet) or unsent changes: merge; otherwise the account's copy is newer
      const merged = known === undefined || this.ledger.dirty.includes(key) ? mergeSaved(local, server.data) : server.data
      this.ledger.revs[key] = server.rev
      if (merged) this.apply(key, merged)
      if (known === undefined && local && !this.ledger.dirty.includes(key)) this.ledger.dirty.push(key)
    }
    this.save()
  }

  private apply(key: SyncKey, saved: Saved) {
    this.applying = true
    try {
      this.stores[key].write(saved)
    } finally {
      this.applying = false
    }
  }

  private markDirty(key: SyncKey) {
    if (this.applying) return
    if (!this.ledger.dirty.includes(key)) {
      this.ledger.dirty.push(key)
      this.save()
    }
    this.schedule()
  }

  private schedule(delay = DEBOUNCE_MS) {
    const now = Date.now()
    if (!this.firstDirtyAt) this.firstDirtyAt = now
    const wait = Math.max(0, Math.min(delay, this.firstDirtyAt + MAX_WAIT_MS - now))
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => void this.flush(), wait)
  }

  /** Send everything unsent in one request. Safe to call any time (one send at a time). */
  flush(keepalive = false): Promise<void> {
    this.sending ??= this.send(keepalive).finally(() => {
      this.sending = null
    })
    return this.sending
  }

  private async send(keepalive: boolean, round = 0): Promise<void> {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    this.firstDirtyAt = 0
    const keys = [...this.ledger.dirty]
    if (keys.length === 0) return
    const changes: Record<string, { baseRev: number; data: Saved | null }> = {}
    for (const key of keys) changes[key] = { baseRev: this.ledger.revs[key] ?? 0, data: this.stores[key].read() }
    const done = (revs: Record<string, number>) => {
      for (const [key, rev] of Object.entries(revs)) {
        this.ledger.revs[key as SyncKey] = rev
        // a key changed again while this request was on its way stays dirty
        if (JSON.stringify(this.stores[key as SyncKey].read()) === JSON.stringify(changes[key]?.data)) {
          this.ledger.dirty = this.ledger.dirty.filter((item) => item !== key)
        }
      }
    }
    try {
      const { revs } = await api<{ revs: Record<string, number> }>('sync', { method: 'PUT', body: { changes }, retries: 2, keepalive })
      done(revs)
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && round < 2) {
        const body = error.body as { revs: Record<string, number>; conflicts: Record<string, { rev: number; data: Saved }> }
        done(body.revs ?? {})
        for (const [key, server] of Object.entries(body.conflicts ?? {})) {
          const merged = mergeSaved(this.stores[key as SyncKey].read(), server.data)
          this.ledger.revs[key as SyncKey] = server.rev
          if (merged) this.apply(key as SyncKey, merged)
        }
        this.save()
        return this.send(keepalive, round + 1)
      }
      if (error instanceof ApiError && error.status === 401) {
        this.stop() // signed out elsewhere: the device keeps everything, the queue waits for the next sign-in
        return
      }
      // offline or the server is down: keep the queue, try again later
      if (!this.timer) this.timer = setTimeout(() => void this.flush(), RETRY_MS)
    } finally {
      this.save()
    }
  }
}

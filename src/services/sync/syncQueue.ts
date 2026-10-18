import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChildRow, ChildStateRow, ResultRow } from './rows'

export type SyncOperation =
  | { kind: 'upsertChild'; row: ChildRow }
  | { kind: 'deleteChild'; childId: string }
  | { kind: 'upsertChildState'; row: ChildStateRow }
  | { kind: 'upsertResult'; row: ResultRow }

export interface QueuedOperation {
  id: string
  operation: SyncOperation
  attempts: number
  /** Not retried before this time (ms) – grows after every failure. */
  notBefore: number
}

/** The writes the queue needs; implemented with Supabase, faked in tests. */
export interface SyncClient {
  upsert: (table: string, row: object, conflictColumn: string) => Promise<void>
  remove: (table: string, column: string, value: string) => Promise<void>
}

const BASE_RETRY_MS = 5_000
const MAX_RETRY_MS = 5 * 60_000
/**
 * After this many failures an operation is dropped, so one row the server will
 * never accept cannot block every later change. The data stays on the device.
 */
export const MAX_ATTEMPTS = 8

export function retryDelay(attempts: number): number {
  return Math.min(MAX_RETRY_MS, BASE_RETRY_MS * 2 ** Math.max(0, attempts - 1))
}

function childOf(operation: SyncOperation): string {
  switch (operation.kind) {
    case 'upsertChild':
      return operation.row.id
    case 'deleteChild':
      return operation.childId
    case 'upsertChildState':
      return operation.row.child_id
    case 'upsertResult':
      return operation.row.child_id
  }
}

/**
 * Adds an operation, dropping pending ones it makes pointless. A newer copy of
 * a profile, state or result takes the place of the waiting one – in place, so
 * a child row always stays ahead of that child’s results. Deleting a child
 * cancels everything still waiting for that child.
 */
export function coalesce(
  queue: readonly QueuedOperation[],
  next: QueuedOperation,
): QueuedOperation[] {
  const { operation } = next
  const child = childOf(operation)
  if (operation.kind === 'deleteChild') {
    return [...queue.filter((item) => childOf(item.operation) !== child), next]
  }
  const index = queue.findIndex(
    (item) => childOf(item.operation) === child && sameTarget(item.operation, operation),
  )
  if (index === -1) return [...queue, next]
  return queue.map((item, position) => (position === index ? next : item))
}

function sameTarget(a: SyncOperation, b: SyncOperation): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'upsertResult' && b.kind === 'upsertResult') return a.row.id === b.row.id
  return true
}

async function send(client: SyncClient, operation: SyncOperation) {
  switch (operation.kind) {
    case 'upsertChild':
      return client.upsert('children', operation.row, 'id')
    case 'deleteChild':
      return client.remove('children', 'id', operation.childId)
    case 'upsertChildState':
      return client.upsert('child_state', operation.row, 'child_id')
    case 'upsertResult':
      return client.upsert('task_results', operation.row, 'id')
  }
}

interface SyncState {
  queue: QueuedOperation[]
  /** The cloud account whose full snapshot has already been queued once. */
  snapshotFor: string | null
  enqueue: (operation: SyncOperation) => void
  setSnapshotFor: (userId: string | null) => void
  /** On sign-out: forget everything meant for that account. */
  clear: () => void
}

let counter = 0
function operationId(): string {
  counter += 1
  return `${Date.now().toString(36)}-${counter}`
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      queue: [],
      snapshotFor: null,
      enqueue: (operation) =>
        set((state) => ({
          queue: coalesce(state.queue, { id: operationId(), operation, attempts: 0, notBefore: 0 }),
        })),
      setSnapshotFor: (snapshotFor) => set({ snapshotFor }),
      // Deletions are kept: they are safe for any account and must not be forgotten.
      clear: () =>
        set((state) => ({
          queue: state.queue.filter((item) => item.operation.kind === 'deleteChild'),
          snapshotFor: null,
        })),
    }),
    { name: 'kiddo.sync', version: 1 },
  ),
)

let flushing = false

/**
 * Sends waiting operations in order. Stops at the first failure so a result is
 * never sent before its child profile; that operation is retried later with
 * a growing delay. Safe to call often – only one flush runs at a time.
 */
export async function flushQueue(client: SyncClient, now: () => number = Date.now) {
  if (flushing) return { sent: 0, failed: false }
  flushing = true
  let sent = 0
  let failed = false
  try {
    for (;;) {
      const [head] = useSyncStore.getState().queue
      if (!head || head.notBefore > now()) break
      try {
        await send(client, head.operation)
        useSyncStore.setState((state) => ({
          queue: state.queue.filter((item) => item.id !== head.id),
        }))
        sent += 1
      } catch {
        failed = true
        const attempts = head.attempts + 1
        useSyncStore.setState((state) => ({
          queue:
            attempts >= MAX_ATTEMPTS
              ? state.queue.filter((item) => item.id !== head.id)
              : state.queue.map((item) =>
                  item.id === head.id
                    ? { ...item, attempts, notBefore: now() + retryDelay(attempts) }
                    : item,
                ),
        }))
        if (attempts < MAX_ATTEMPTS) break
      }
    }
  } finally {
    flushing = false
  }
  return { sent, failed }
}

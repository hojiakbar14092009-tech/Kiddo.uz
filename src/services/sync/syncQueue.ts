import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  BuildingLevelRow,
  ChildRow,
  ChildStateRow,
  EventRow,
  LearnRow,
  ResourceRow,
  ResultRow,
  RewardRow,
} from './rows'

export type SyncOperation =
  | { kind: 'upsertChild'; row: ChildRow }
  | { kind: 'deleteChild'; childId: string }
  | { kind: 'upsertChildState'; row: ChildStateRow }
  | { kind: 'upsertResult'; row: ResultRow }
  | { kind: 'upsertEvent'; row: EventRow }
  | { kind: 'recordReward'; row: RewardRow }
  | { kind: 'recordResource'; row: ResourceRow }
  | { kind: 'recordBuildingLevel'; row: BuildingLevelRow }
  | { kind: 'upsertLearn'; row: LearnRow }

export interface QueuedOperation {
  id: string
  operation: SyncOperation
  attempts: number
  /** Not retried before this time (ms) – grows after every failure. */
  notBefore: number
}

/** An operation the server would not take; kept so the parent area can show it. */
export interface DeadLetter {
  id: string
  operation: SyncOperation
  attempts: number
  /** The server's (or network's) last error message. */
  error: string
  /** ISO time it was given up on. */
  at: string
}

/**
 * Why a write failed, decided by the client implementation:
 * - `auth`: the session is missing or expired – nothing is wrong with the data,
 *   so the queue pauses and no attempt is counted;
 * - `rejected`: the server refused this operation (RLS, check, cap) and will
 *   refuse it again – it goes to the dead-letter list at once;
 * - `transient`: offline, timeout, 5xx – retried with a growing delay.
 */
export type SyncErrorKind = 'auth' | 'rejected' | 'transient'

export class SyncError extends Error {
  readonly kind: SyncErrorKind
  constructor(message: string, kind: SyncErrorKind) {
    super(message)
    this.name = 'SyncError'
    this.kind = kind
  }
}

function errorKind(error: unknown): SyncErrorKind {
  return error instanceof SyncError ? error.kind : 'transient'
}

/** The writes the queue needs; implemented with Supabase, faked in tests. */
export interface SyncClient {
  upsert: (table: string, row: object, conflictColumn: string) => Promise<void>
  remove: (table: string, column: string, value: string) => Promise<void>
  rpc: (fn: string, args: object) => Promise<void>
}

const BASE_RETRY_MS = 5_000
const MAX_RETRY_MS = 5 * 60_000
/** The dead-letter list is for people to read; it never grows without limit. */
export const MAX_DEAD_LETTERS = 100

/**
 * After this many failures an operation moves to the dead-letter list, so one
 * row the server will never accept cannot block every later change. The data
 * stays on the device and the failure stays visible.
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
    case 'upsertResult':
    case 'upsertEvent':
    case 'upsertLearn':
      return operation.row.child_id
    case 'recordReward':
    case 'recordResource':
    case 'recordBuildingLevel':
      return operation.row.p_child
  }
}

/**
 * Adds an operation, dropping pending ones it makes pointless. A newer copy of
 * a profile, state, learning data or result takes the place of the waiting
 * one – in place, so a child row always stays ahead of that child’s results.
 * Deleting a child cancels everything still waiting for that child.
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
  if (a.kind === 'upsertEvent' && b.kind === 'upsertEvent') return a.row.id === b.row.id
  if (a.kind === 'recordReward' && b.kind === 'recordReward') {
    return a.row.p_reason === b.row.p_reason && a.row.p_ref === b.row.p_ref
  }
  if (a.kind === 'recordResource' && b.kind === 'recordResource') {
    return (
      a.row.p_resource === b.row.p_resource &&
      a.row.p_reason === b.row.p_reason &&
      a.row.p_ref === b.row.p_ref
    )
  }
  if (a.kind === 'recordBuildingLevel' && b.kind === 'recordBuildingLevel') {
    return a.row.p_building === b.row.p_building && a.row.p_level === b.row.p_level
  }
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
    case 'upsertEvent':
      return client.upsert('child_events', operation.row, 'id')
    case 'recordReward':
      // Idempotent on the server by (child, reason, ref): a retry is harmless.
      return client.rpc('record_reward', operation.row)
    case 'recordResource':
      // Idempotent on the server by (child, resource, reason, ref).
      return client.rpc('record_resource', operation.row)
    case 'recordBuildingLevel':
      // Checked on the server against the upgrade's payment, queued after it.
      return client.rpc('record_building_level', operation.row)
    case 'upsertLearn':
      return client.upsert('child_learn', operation.row, 'child_id')
  }
}

interface SyncState {
  queue: QueuedOperation[]
  /** Operations the server refused or that failed too often (newest first). */
  deadLetter: DeadLetter[]
  /** Set while the cloud session is missing or expired; nothing is sent. */
  paused: 'auth' | null
  /** The cloud account whose full snapshot has already been queued once. */
  snapshotFor: string | null
  enqueue: (operation: SyncOperation) => void
  setSnapshotFor: (userId: string | null) => void
  /** The session works again (signed in, token refreshed): sending may go on. */
  resume: () => void
  /** Puts a dead letter back at the end of the queue with fresh attempts. */
  retryDeadLetter: (id: string) => void
  discardDeadLetter: (id: string) => void
  /** On sign-out: forget everything meant for that account. */
  clear: () => void
}

let counter = 0
function operationId(): string {
  counter += 1
  return `${Date.now().toString(36)}-${counter}`
}

function bury(state: SyncState, item: QueuedOperation, error: string, now: number) {
  const letter: DeadLetter = {
    id: item.id,
    operation: item.operation,
    attempts: item.attempts,
    error,
    at: new Date(now).toISOString(),
  }
  return {
    queue: state.queue.filter((queued) => queued.id !== item.id),
    deadLetter: [letter, ...state.deadLetter].slice(0, MAX_DEAD_LETTERS),
  }
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      queue: [],
      deadLetter: [],
      paused: null,
      snapshotFor: null,
      enqueue: (operation) =>
        set((state) => {
          const next = { id: operationId(), operation, attempts: 0, notBefore: 0 }
          return {
            queue: coalesce(state.queue, next),
            // A deleted child's failed writes are moot now.
            deadLetter:
              operation.kind === 'deleteChild'
                ? state.deadLetter.filter(
                    (letter) => childOf(letter.operation) !== operation.childId,
                  )
                : state.deadLetter,
          }
        }),
      setSnapshotFor: (snapshotFor) => set({ snapshotFor }),
      resume: () => set({ paused: null }),
      retryDeadLetter: (id) =>
        set((state) => {
          const letter = state.deadLetter.find((item) => item.id === id)
          if (!letter) return state
          return {
            deadLetter: state.deadLetter.filter((item) => item.id !== id),
            queue: coalesce(state.queue, {
              id: operationId(),
              operation: letter.operation,
              attempts: 0,
              notBefore: 0,
            }),
          }
        }),
      discardDeadLetter: (id) =>
        set((state) => ({ deadLetter: state.deadLetter.filter((item) => item.id !== id) })),
      // Deletions are kept: they are safe for any account and must not be forgotten.
      clear: () =>
        set((state) => ({
          queue: state.queue.filter((item) => item.operation.kind === 'deleteChild'),
          deadLetter: [],
          paused: null,
          snapshotFor: null,
        })),
    }),
    {
      name: 'kiddo.sync',
      version: 3,
      partialize: (state) => ({
        queue: state.queue,
        deadLetter: state.deadLetter,
        snapshotFor: state.snapshotFor,
      }),
      // v1 could hold client-written payments (the server owns them now), and
      // had no learning data: queue the snapshot once more (upserts are idempotent).
      // v2 had no universe: queue the snapshot once more so resources earned
      // before (device mode, before signing in) reach the server ledger.
      migrate: (persisted, version) => {
        const old = (persisted ?? {}) as Partial<SyncState>
        if (version >= 3) return old as SyncState
        if (version === 2) return { ...old, snapshotFor: null } as SyncState
        return {
          ...old,
          queue: (old.queue ?? []).filter(
            (item) => (item.operation.kind as string) !== 'upsertPayment',
          ),
          deadLetter: [],
          snapshotFor: null,
        } as unknown as SyncState
      },
    },
  ),
)

let flushing = false

/**
 * Sends waiting operations in order. Stops at the first failure so a result is
 * never sent before its child profile; that operation is retried later with
 * a growing delay. An auth failure pauses the whole queue without counting an
 * attempt; a refusal moves the operation to the dead-letter list. Safe to
 * call often – only one flush runs at a time.
 */
export async function flushQueue(client: SyncClient, now: () => number = Date.now) {
  if (flushing) return { sent: 0, failed: false }
  flushing = true
  let sent = 0
  let failed = false
  try {
    for (;;) {
      const state = useSyncStore.getState()
      if (state.paused) break
      const [head] = state.queue
      if (!head || head.notBefore > now()) break
      try {
        await send(client, head.operation)
        useSyncStore.setState((current) => ({
          queue: current.queue.filter((item) => item.id !== head.id),
        }))
        sent += 1
      } catch (error) {
        failed = true
        const kind = errorKind(error)
        const message = error instanceof Error ? error.message : String(error)
        if (kind === 'auth') {
          useSyncStore.setState({ paused: 'auth' })
          break
        }
        const attempts = head.attempts + 1
        if (kind === 'rejected' || attempts >= MAX_ATTEMPTS) {
          useSyncStore.setState((current) => bury(current, { ...head, attempts }, message, now()))
          continue
        }
        useSyncStore.setState((current) => ({
          queue: current.queue.map((item) =>
            item.id === head.id
              ? { ...item, attempts, notBefore: now() + retryDelay(attempts) }
              : item,
          ),
        }))
        break
      }
    }
  } finally {
    flushing = false
  }
  return { sent, failed }
}

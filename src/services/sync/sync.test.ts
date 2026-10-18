import { beforeEach, describe, expect, it } from 'vitest'
import { EMPTY_PROGRESS, type ChildProgress, type TaskResult } from '@/store/progressStore'
import type { ChildProfile } from '@/store/familyStore'
import { childRow, resultRow } from './rows'
import {
  coalesce,
  MAX_ATTEMPTS,
  flushQueue,
  retryDelay,
  useSyncStore,
  type QueuedOperation,
  type SyncClient,
  type SyncOperation,
} from './syncQueue'
import { childChanges, progressChanges, snapshot } from './trackChanges'

const ALI: ChildProfile = {
  id: 'ali',
  name: 'Ali',
  age: 5,
  gender: 'boy',
  mascot: 'boy',
  dailyLimitMinutes: 30,
  createdAt: '2026-10-01T00:00:00.000Z',
}

function result(id: string): TaskResult {
  return {
    id,
    type: 'trace',
    language: 'uz',
    letterIds: ['a'],
    mistakes: 0,
    mistakeDetails: [],
    coins: 5,
    stars: 3,
    stickerId: null,
    day: '2026-10-18',
    finishedAt: '2026-10-18T10:00:00.000Z',
  }
}

function queued(operation: SyncOperation, id = Math.random().toString()): QueuedOperation {
  return { id, operation, attempts: 0, notBefore: 0 }
}

class FakeClient implements SyncClient {
  calls: string[] = []
  failNext = 0
  async upsert(table: string, row: object) {
    if (this.failNext > 0) {
      this.failNext -= 1
      throw new Error('offline')
    }
    this.calls.push(
      `upsert ${table} ${(row as { id?: string; child_id?: string }).id ?? (row as { child_id: string }).child_id}`,
    )
  }
  async remove(table: string, _column: string, value: string) {
    this.calls.push(`delete ${table} ${value}`)
  }
}

describe('coalesce', () => {
  it('replaces a waiting profile in place, so it stays ahead of its results', () => {
    const queue = [
      queued({ kind: 'upsertChild', row: childRow(ALI) }, 'child'),
      queued({ kind: 'upsertResult', row: resultRow('ali', result('r1')) }, 'r1'),
    ]
    const renamed = queued(
      { kind: 'upsertChild', row: childRow({ ...ALI, name: 'Alisher' }) },
      'new',
    )
    const next = coalesce(queue, renamed)
    expect(next.map((item) => item.id)).toEqual(['new', 'r1'])
  })

  it('drops everything waiting for a child that is deleted', () => {
    const queue = [
      queued({ kind: 'upsertChild', row: childRow(ALI) }),
      queued({ kind: 'upsertResult', row: resultRow('ali', result('r1')) }),
    ]
    const next = coalesce(queue, queued({ kind: 'deleteChild', childId: 'ali' }))
    expect(next.map((item) => item.operation.kind)).toEqual(['deleteChild'])
  })
})

describe('flushQueue', () => {
  beforeEach(() => useSyncStore.getState().clear())

  it('sends in order and empties the queue', async () => {
    const client = new FakeClient()
    snapshot([ALI], { ali: { ...EMPTY_PROGRESS, results: [result('r2'), result('r1')] } }).forEach(
      useSyncStore.getState().enqueue,
    )
    await flushQueue(client)
    expect(client.calls).toEqual([
      'upsert children ali',
      'upsert child_state ali',
      'upsert task_results r1',
      'upsert task_results r2',
    ])
    expect(useSyncStore.getState().queue).toHaveLength(0)
  })

  it('stops at a failure and retries later with a growing delay', async () => {
    const client = new FakeClient()
    client.failNext = 1
    useSyncStore.getState().enqueue({ kind: 'upsertChild', row: childRow(ALI) })
    useSyncStore.getState().enqueue({ kind: 'deleteChild', childId: 'other' })

    const first = await flushQueue(client, () => 1_000)
    expect(first).toEqual({ sent: 0, failed: true })
    expect(useSyncStore.getState().queue[0]).toMatchObject({
      attempts: 1,
      notBefore: 1_000 + retryDelay(1),
    })

    expect(await flushQueue(client, () => 2_000)).toEqual({ sent: 0, failed: false })
    expect(await flushQueue(client, () => 1_000 + retryDelay(1))).toEqual({
      sent: 2,
      failed: false,
    })
    expect(retryDelay(10)).toBe(5 * 60_000)
  })
})

describe('change tracking', () => {
  it('notices new, edited and removed profiles', () => {
    const lola: ChildProfile = { ...ALI, id: 'lola', name: 'Lola' }
    const edited = { ...ALI, age: 6 }
    const operations = childChanges([ALI, lola], [edited])
    expect(operations.map((operation) => operation.kind)).toEqual(['upsertChild', 'deleteChild'])
  })

  it('never syncs the guest and sends only new results', () => {
    const before: Record<string, ChildProgress> = {
      ali: { ...EMPTY_PROGRESS, results: [result('r1')] },
    }
    const after: Record<string, ChildProgress> = {
      ali: { ...EMPTY_PROGRESS, coins: 5, results: [result('r2'), result('r1')] },
      guest: { ...EMPTY_PROGRESS, coins: 9 },
    }
    const operations = progressChanges(before, after, new Set(['ali']))
    expect(operations.map((operation) => operation.kind)).toEqual([
      'upsertChildState',
      'upsertResult',
    ])
    expect(operations[1]).toMatchObject({ row: { id: 'r2' } })
  })
})

describe('queue robustness', () => {
  beforeEach(() => useSyncStore.setState({ queue: [], snapshotFor: null }))

  it('drops an operation the server keeps refusing, so later ones still go out', async () => {
    const client = new FakeClient()
    useSyncStore.getState().enqueue({ kind: 'upsertChild', row: childRow(ALI) })
    useSyncStore.getState().enqueue({ kind: 'deleteChild', childId: 'other' })
    client.failNext = MAX_ATTEMPTS
    let time = 0
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      time += retryDelay(MAX_ATTEMPTS)
      await flushQueue(client, () => time)
    }
    expect(client.calls).toEqual(['delete children other'])
    expect(useSyncStore.getState().queue).toHaveLength(0)
  })

  it('keeps pending deletions when a parent signs out', () => {
    const store = useSyncStore.getState()
    store.enqueue({ kind: 'upsertChild', row: childRow(ALI) })
    store.enqueue({ kind: 'deleteChild', childId: 'lola' })
    store.clear()
    expect(useSyncStore.getState().queue.map((item) => item.operation.kind)).toEqual([
      'deleteChild',
    ])
  })
})

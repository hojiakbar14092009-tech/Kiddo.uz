import { beforeEach, describe, expect, it } from 'vitest'
import { EMPTY_PROGRESS, type ChildProgress, type TaskResult } from '@/store/progressStore'
import type { ChildProfile } from '@/store/familyStore'
import { childRow, resultRow } from './rows'
import {
  coalesce,
  MAX_ATTEMPTS,
  SyncError,
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
  birthDate: '2021-03-10',
  celebratedLevel: 5,
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
  failWith: () => Error = () => new Error('offline')
  private maybeFail() {
    if (this.failNext > 0) {
      this.failNext -= 1
      throw this.failWith()
    }
  }
  async rpc(fn: string, args: object) {
    this.maybeFail()
    this.calls.push(`rpc ${fn} ${(args as { p_ref: string }).p_ref}`)
  }
  async upsert(table: string, row: object) {
    this.maybeFail()
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
    const edited = { ...ALI, birthDate: '2020-03-10' }
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
  beforeEach(() =>
    useSyncStore.setState({ queue: [], deadLetter: [], paused: null, snapshotFor: null }),
  )

  it('moves an operation the server keeps refusing to the dead-letter list, so later ones still go out', async () => {
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
    const { queue, deadLetter } = useSyncStore.getState()
    expect(queue).toHaveLength(0)
    expect(deadLetter).toHaveLength(1)
    expect(deadLetter[0]).toMatchObject({
      attempts: MAX_ATTEMPTS,
      error: 'offline',
      operation: { kind: 'upsertChild' },
    })
  })

  it('dead-letters a refused operation at once instead of retrying it', async () => {
    const client = new FakeClient()
    client.failNext = 1
    client.failWith = () => new SyncError('daily_cap', 'rejected')
    const store = useSyncStore.getState()
    store.enqueue({
      kind: 'recordReward',
      row: { p_child: 'ali', p_coins: 50, p_reason: 'task', p_ref: 'r1' },
    })
    store.enqueue({ kind: 'deleteChild', childId: 'other' })
    expect(await flushQueue(client, () => 0)).toEqual({ sent: 1, failed: true })
    expect(useSyncStore.getState().deadLetter.map((item) => item.error)).toEqual(['daily_cap'])

    // A parent can send it again from the list.
    const [letter] = useSyncStore.getState().deadLetter
    useSyncStore.getState().retryDeadLetter(letter!.id)
    await flushQueue(client, () => 0)
    expect(client.calls).toEqual(['delete children other', 'rpc record_reward r1'])
    expect(useSyncStore.getState().deadLetter).toHaveLength(0)
  })

  it('pauses on an auth error without counting an attempt, and goes on after resume', async () => {
    const client = new FakeClient()
    client.failNext = 1
    client.failWith = () => new SyncError('JWT expired', 'auth')
    useSyncStore.getState().enqueue({ kind: 'upsertChild', row: childRow(ALI) })
    expect(await flushQueue(client, () => 0)).toEqual({ sent: 0, failed: true })
    expect(useSyncStore.getState()).toMatchObject({ paused: 'auth' })
    expect(useSyncStore.getState().queue[0]).toMatchObject({ attempts: 0, notBefore: 0 })

    // Paused: nothing is tried, however often a flush is asked for.
    for (let i = 0; i < MAX_ATTEMPTS + 2; i += 1) await flushQueue(client, () => 0)
    expect(client.calls).toEqual([])

    useSyncStore.getState().resume()
    expect(await flushQueue(client, () => 0)).toEqual({ sent: 1, failed: false })
    expect(client.calls).toEqual(['upsert children ali'])
  })

  it('keeps pending deletions when a parent signs out, and forgets the rest', () => {
    const store = useSyncStore.getState()
    store.enqueue({ kind: 'upsertChild', row: childRow(ALI) })
    store.enqueue({ kind: 'deleteChild', childId: 'lola' })
    useSyncStore.setState({
      paused: 'auth',
      deadLetter: [
        {
          id: 'x',
          operation: { kind: 'upsertChild', row: childRow(ALI) },
          attempts: 8,
          error: 'e',
          at: '2026-10-23T00:00:00.000Z',
        },
      ],
    })
    store.clear()
    const after = useSyncStore.getState()
    expect(after.queue.map((item) => item.operation.kind)).toEqual(['deleteChild'])
    expect(after.deadLetter).toEqual([])
    expect(after.paused).toBeNull()
  })

  it('coalesces reward entries by reason and ref, and learning data per child', () => {
    const store = useSyncStore.getState()
    const reward = { p_child: 'ali', p_coins: 5, p_reason: 'task' as const, p_ref: 'r1' }
    store.enqueue({ kind: 'recordReward', row: reward })
    store.enqueue({ kind: 'recordReward', row: reward })
    store.enqueue({ kind: 'recordReward', row: { ...reward, p_reason: 'learn' as const } })
    store.enqueue({ kind: 'upsertLearn', row: { child_id: 'ali', data: { v: 1 } as never } })
    store.enqueue({ kind: 'upsertLearn', row: { child_id: 'ali', data: { v: 2 } as never } })
    const kinds = useSyncStore.getState().queue.map((item) => item.operation)
    expect(kinds).toHaveLength(3)
    expect(kinds[2]).toMatchObject({ kind: 'upsertLearn', row: { data: { v: 2 } } })
  })

  it('sends the snapshot once more after the universe arrived (v2 → v3)', async () => {
    const migrate = useSyncStore.persist.getOptions().migrate!
    const next = (await migrate({ queue: [], deadLetter: [], snapshotFor: 'user-1' }, 2)) as {
      snapshotFor: string | null
    }
    expect(next.snapshotFor).toBeNull()
  })

  it('drops client-written payments from a queue saved by an older version', async () => {
    const migrate = useSyncStore.persist.getOptions().migrate!
    const old = {
      queue: [
        queued({ kind: 'upsertPayment', row: { id: 'p1' } } as never, 'p'),
        queued({ kind: 'deleteChild', childId: 'lola' }, 'd'),
      ],
      snapshotFor: 'user-1',
    }
    const next = (await migrate(old, 1)) as { queue: QueuedOperation[]; snapshotFor: string | null }
    expect(next.queue.map((item) => item.id)).toEqual(['d'])
    // Queued again once, now with learning data.
    expect(next.snapshotFor).toBeNull()
  })
})

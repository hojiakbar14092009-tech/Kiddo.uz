import { subscribeRewards } from '@/domain/rewards'
import { useLearnStore } from '@/features/learn/learnStore'
import { useActivityStore } from '@/store/activityStore'
import { useFamilyStore } from '@/store/familyStore'
import { useProgressStore } from '@/store/progressStore'
import { eventRow, learnRow, rewardRow } from './rows'
import { useSyncStore, type SyncOperation } from './syncQueue'
import { childChanges, progressChanges, snapshot } from './trackChanges'

/** Learning data changes after every answer; it is sent once things calm down. */
export const LEARN_DEBOUNCE_MS = 10_000

function familyIds(): Set<string> {
  return new Set(useFamilyStore.getState().children.map((child) => child.id))
}

function learnOperations(childIds: Iterable<string>): SyncOperation[] {
  const { byChild } = useLearnStore.getState()
  const family = familyIds()
  const operations: SyncOperation[] = []
  for (const childId of childIds) {
    const data = byChild[childId]
    if (data && family.has(childId))
      operations.push({ kind: 'upsertLearn', row: learnRow(childId, data) })
  }
  return operations
}

/**
 * Turns local changes into queued operations for the signed-in cloud account
 * `userId`. `onChange(urgent)` asks for a flush (urgent: right now). Payments
 * are deliberately not watched: in cloud mode they come from the server only.
 * Returns a stop function.
 */
export function trackCloudChanges(
  userId: string,
  onChange: (urgent: boolean) => void,
  learnDebounceMs: number = LEARN_DEBOUNCE_MS,
): () => void {
  const enqueueAll = (operations: SyncOperation[], urgent = false) => {
    if (operations.length === 0) return
    const { enqueue } = useSyncStore.getState()
    operations.forEach(enqueue)
    onChange(urgent)
  }

  const sync = useSyncStore.getState()
  if (sync.snapshotFor !== userId) {
    const { children } = useFamilyStore.getState()
    enqueueAll([
      ...snapshot(children, useProgressStore.getState().byChild),
      ...learnOperations(children.map((child) => child.id)),
    ])
    sync.setSnapshotFor(userId)
  }

  const stopFamily = useFamilyStore.subscribe((next, previous) =>
    enqueueAll(childChanges(previous.children, next.children)),
  )
  const stopProgress = useProgressStore.subscribe((next, previous) =>
    enqueueAll(progressChanges(previous.byChild, next.byChild, familyIds())),
  )
  // A child leaving the app is sent at once, while the page can still send.
  const stopActivity = useActivityStore.subscribe((next, previous) => {
    const known = new Set(previous.events.map((event) => event.id))
    const fresh = next.events.filter((event) => !known.has(event.id))
    enqueueAll(
      fresh.map((event) => ({ kind: 'upsertEvent', row: eventRow(event) })),
      true,
    )
  })
  // Every coin change goes to the server's ledger, which checks and caps it.
  // Admin grants and PRO gifts are not the parent's to write: the admin's
  // account and the payment server record those (record_reward refuses them).
  const stopRewards = subscribeRewards((entry) => {
    if (entry.reason === 'admin' || entry.reason === 'pro-gift' || entry.coins === 0) return
    if (!familyIds().has(entry.childKey)) return
    enqueueAll([{ kind: 'recordReward', row: rewardRow(entry) }])
  })
  // Learning data: remember which children changed, send each once per quiet spell.
  const dirty = new Set<string>()
  let learnTimer: ReturnType<typeof setTimeout> | undefined
  const stopLearn = useLearnStore.subscribe((next, previous) => {
    for (const [childId, data] of Object.entries(next.byChild)) {
      if (previous.byChild[childId] !== data) dirty.add(childId)
    }
    if (dirty.size === 0) return
    clearTimeout(learnTimer)
    learnTimer = setTimeout(() => {
      const ids = [...dirty]
      dirty.clear()
      enqueueAll(learnOperations(ids))
    }, learnDebounceMs)
  })

  return () => {
    stopFamily()
    stopProgress()
    stopActivity()
    stopRewards()
    stopLearn()
    // Not queued on stop: stopping usually means signing out, and nothing may
    // be queued for an account after that. The next snapshot or change sends it.
    clearTimeout(learnTimer)
  }
}

import type { ChildProfile } from '@/store/familyStore'
import { GUEST_KEY, type ChildProgress } from '@/store/progressStore'
import { childRow, childStateRow, resultRow } from './rows'
import type { SyncOperation } from './syncQueue'

/** What changed in the child profiles since the last look, as sync operations. */
export function childChanges(
  previous: readonly ChildProfile[],
  next: readonly ChildProfile[],
): SyncOperation[] {
  const before = new Map(previous.map((child) => [child.id, child]))
  const operations: SyncOperation[] = []
  for (const child of next) {
    if (before.get(child.id) !== child)
      operations.push({ kind: 'upsertChild', row: childRow(child) })
    before.delete(child.id)
  }
  for (const removed of before.keys()) operations.push({ kind: 'deleteChild', childId: removed })
  return operations
}

/** What changed in the children’s progress (the guest is never synced). */
export function progressChanges(
  previous: Readonly<Record<string, ChildProgress>>,
  next: Readonly<Record<string, ChildProgress>>,
  childIds: ReadonlySet<string>,
): SyncOperation[] {
  const operations: SyncOperation[] = []
  for (const [childId, progress] of Object.entries(next)) {
    if (childId === GUEST_KEY || !childIds.has(childId)) continue
    const old = previous[childId]
    if (old === progress) continue
    operations.push({ kind: 'upsertChildState', row: childStateRow(childId, progress) })
    const known = new Set(old?.results.map((result) => result.id))
    for (const result of [...progress.results].reverse()) {
      if (!known.has(result.id))
        operations.push({ kind: 'upsertResult', row: resultRow(childId, result) })
    }
  }
  return operations
}

/** Everything a family has on this device, for the first sync of a cloud account. */
export function snapshot(
  children: readonly ChildProfile[],
  byChild: Readonly<Record<string, ChildProgress>>,
): SyncOperation[] {
  return [
    ...childChanges([], children),
    ...progressChanges({}, byChild, new Set(children.map((child) => child.id))),
  ]
}

import { useEffect } from 'react'
import { universeChild } from '@/domain/universe'
import { subscribeDomainEvents } from '@/domain/universe/progression'
import { toast } from '@/components/ui/toast'
import i18n from '@/i18n'
import { useFamilyStore } from '@/store/familyStore'

/**
 * Counts finished activities towards activity homework (Phase 23), app-wide:
 * every `activity.completed` domain event of a child is offered to their open
 * homework once (the run id makes it idempotent). A finished homework gets a
 * short, kind toast; nothing here pays or unlocks anything.
 */
export function HomeworkBridge() {
  useEffect(() => {
    // runs finished while this tab was closed or in another tab: counted now (by run id, once)
    reconcileHomework()
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea && event.storageArea !== window.localStorage) return
      if (event.key === 'kiddo.universe') reconcileHomework()
    }
    window.addEventListener('storage', onStorage)
    const stop = subscribeDomainEvents((event) => {
      if (event.type !== 'activity.completed') return
      const finished = useFamilyStore
        .getState()
        .recordHomeworkRun(event.childKey, event.activityId, event.activity)
      if (finished.length > 0) toast(i18n.t('home.homeworkDone'), 'success')
    })
    return () => {
      stop()
      window.removeEventListener('storage', onStorage)
    }
  }, [])
  return null
}

/** Offers every child's runs since their oldest open activity homework to that homework (idempotent). */
function reconcileHomework() {
  const { children, recordHomeworkRun } = useFamilyStore.getState()
  for (const child of children) {
    const open = (child.homeworks ?? []).filter(
      (homework) => homework.kind === 'activity' && !homework.completedAt,
    )
    if (open.length === 0) continue
    const since = open.reduce(
      (min, homework) => (homework.assignedAt < min ? homework.assignedAt : min),
      open[0]!.assignedAt,
    )
    const runs = [...(universeChild(child.id).recent ?? [])]
      .filter((run) => run.at >= since)
      .sort((a, b) => a.at.localeCompare(b.at))
    for (const run of runs) recordHomeworkRun(child.id, run.id, run.activity, run.at)
  }
}

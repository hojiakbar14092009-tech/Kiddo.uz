import { useEffect, useState } from 'react'
import { toast } from '@/components/ui/toast'
import i18n from '@/i18n'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useFamilyStore } from '@/store/familyStore'
import { useParentStore } from '@/store/parentStore'
import { isAdminPreview } from '@/app/preview/adminPreview'
import { useSettingsStore } from '@/store/settingsStore'
import { watchCloudSession } from './cloudSession'
import {
  enforceVerifyGrace,
  forgetCloudPro,
  pullSubscription,
  SUBSCRIPTION_REFRESH_MS,
} from './subscription'
import { flushQueue, useSyncStore, type SyncClient } from './syncQueue'
import { childChanges } from './trackChanges'
import { trackCloudChanges } from './trackCloud'

/** Accounts whose children were already brought from the cloud in this app session. */
const restoredFor = new Set<string>()

const FLUSH_EVERY_MS = 60_000
const FLUSH_AFTER_CHANGE_MS = 2_000
async function loadSupabase(): Promise<{
  supabase: SupabaseClient
  client: SyncClient
} | null> {
  // the admin's sandbox tab never syncs (Phase 51)
  if (isAdminPreview()) return null
  // Loaded on demand, so families without a cloud account never download Supabase.
  const [{ getSupabase }, { supabaseSyncClient }] = await Promise.all([
    import('@/services/supabase/client'),
    import('./supabaseSyncClient'),
  ])
  const supabase = getSupabase()
  return supabase ? { supabase, client: supabaseSyncClient(supabase) } : null
}

/**
 * Keeps a cloud copy of profiles and progress while a parent is signed in
 * with a Supabase account, and takes PRO from the server. Works offline-first:
 * changes wait in a persisted queue and are sent when the device is online.
 */
export function SyncManager() {
  const userId = useParentStore((state) =>
    state.session?.mode === 'cloud' ? state.session.userId : null,
  )
  const cloudPhotos = useSettingsStore(
    (state) => userId !== null && state.cloudPhotosFor.includes(userId),
  )
  // children just brought from the cloud: their photos are fetched too
  const [restoredCount, setRestoredCount] = useState(0)

  // Signed out, profile deletions are still remembered, so a child removed
  // in demo mode is also removed from the cloud at the next sign-in. A delete
  // can never touch another family's rows (RLS), so this is always safe.
  useEffect(() => {
    if (userId) return undefined
    return useFamilyStore.subscribe((next, previous) => {
      const { enqueue } = useSyncStore.getState()
      const removed = childChanges(previous.children, next.children).filter(
        (operation) => operation.kind === 'deleteChild',
      )
      removed.forEach(enqueue)
      // a removed child's cloud photo (if any) is removed when that account signs in again: the
      // account this device last sent its family to
      const account = useSyncStore.getState().snapshotFor
      const { photoRemovals, setPhotoRemovals } = useSettingsStore.getState()
      const gone = removed.flatMap((operation) =>
        operation.kind === 'deleteChild' && account ? [`${account}/${operation.childId}`] : [],
      )
      if (gone.length > 0) setPhotoRemovals([...photoRemovals, ...gone])
    })
  }, [userId])

  // Leaving a cloud account (sign-out here, or the session ended): its PRO
  // was the server's, not this device's.
  useEffect(
    () =>
      useParentStore.subscribe((next, previous) => {
        if (previous.session?.mode === 'cloud' && next.session?.mode !== 'cloud') {
          forgetCloudPro()
        }
      }),
    [],
  )

  useEffect(() => {
    if (!userId) return undefined
    let alive = true
    let client: SyncClient | null = null
    let supabase: SupabaseClient | null = null
    let soon: ReturnType<typeof setTimeout> | undefined
    let stopAuth = () => undefined as void

    const flush = () => {
      if (client && navigator.onLine !== false) void flushQueue(client)
    }
    const onChange = (urgent: boolean) => {
      clearTimeout(soon)
      if (urgent) flush()
      else soon = setTimeout(flush, FLUSH_AFTER_CHANGE_MS)
    }
    // Without Supabase loaded yet, at least the offline grace is checked.
    const refreshPro = () => {
      if (supabase) void pullSubscription(supabase, userId)
      else enforceVerifyGrace(userId)
    }
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      refreshPro()
      flush()
    }

    enforceVerifyGrace(userId)
    const stopTracking = trackCloudChanges(userId, onChange)
    const flushTimer = setInterval(flush, FLUSH_EVERY_MS)
    const proTimer = setInterval(refreshPro, SUBSCRIPTION_REFRESH_MS)
    window.addEventListener('online', flush)
    document.addEventListener('visibilitychange', onVisible)

    void loadSupabase().then((loaded) => {
      if (!loaded || !alive) return
      supabase = loaded.supabase
      client = loaded.client
      // The parent area's session follows the real Supabase session.
      stopAuth = watchCloudSession(loaded.supabase, userId, flush)
      refreshPro()
      // the other half of two-way sync: the account's children this device lacks (Phase 44)
      if (restoredFor.has(userId)) flush()
      else {
        restoredFor.add(userId)
        // after the first send: removals made on this device reach the cloud first
        const sending = navigator.onLine !== false ? flushQueue(loaded.client) : Promise.resolve()
        void sending
          .catch(() => undefined)
          .then(() => import('./restore'))
          .then(({ restoreFromCloud }) =>
            restoreFromCloud(
              loaded.supabase,
              // signed out or another account meanwhile: nothing of this one comes down
              () =>
                alive &&
                useParentStore.getState().session?.mode === 'cloud' &&
                (useParentStore.getState().session as { userId: string }).userId === userId,
            ),
          )
          .then((count) => {
            if (count === null) restoredFor.delete(userId)
            else if (count > 0 && alive) {
              toast(i18n.t('parent.sync.restored', { count }), 'success')
              setRestoredCount((value) => value + count)
              flush()
            }
          })
          .catch(() => restoredFor.delete(userId))
      }
    })

    return () => {
      alive = false
      stopTracking()
      stopAuth()
      clearInterval(flushTimer)
      clearInterval(proTimer)
      clearTimeout(soon)
      window.removeEventListener('online', flush)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [userId])

  // children's photos in the cloud, only when the parent keeps them there (Phase 44)
  useEffect(() => {
    if (!userId || !cloudPhotos) return undefined
    let alive = true
    let stop = () => undefined as void
    void loadSupabase().then((loaded) => {
      if (!loaded || !alive) return
      void import('./photos').then(({ syncAllPhotos, trackPhotos }) => {
        if (!alive) return
        stop = trackPhotos(loaded.supabase, userId)
        void syncAllPhotos(loaded.supabase, userId).catch(() => undefined)
      })
    })
    return () => {
      alive = false
      stop()
    }
  }, [userId, cloudPhotos, restoredCount])

  return null
}

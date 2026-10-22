import { useEffect } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useFamilyStore } from '@/store/familyStore'
import { useParentStore } from '@/store/parentStore'
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

const FLUSH_EVERY_MS = 60_000
const FLUSH_AFTER_CHANGE_MS = 2_000
async function loadSupabase(): Promise<{
  supabase: SupabaseClient
  client: SyncClient
} | null> {
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

  // Signed out, profile deletions are still remembered, so a child removed
  // in demo mode is also removed from the cloud at the next sign-in. A delete
  // can never touch another family's rows (RLS), so this is always safe.
  useEffect(() => {
    if (userId) return undefined
    return useFamilyStore.subscribe((next, previous) => {
      const { enqueue } = useSyncStore.getState()
      childChanges(previous.children, next.children)
        .filter((operation) => operation.kind === 'deleteChild')
        .forEach(enqueue)
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
      flush()
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

  return null
}

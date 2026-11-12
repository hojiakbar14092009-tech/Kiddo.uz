import { useEffect } from 'react'
import { isAdminPreview } from '@/app/preview/adminPreview'
import { isSupabaseConfigured } from '@/services/supabase/config'
import { useParentStore } from '@/store/parentStore'

/**
 * While a parent is signed in to a Kiddo account (Turso, /api), the family's progress follows it.
 * Never next to the old Supabase sync (SyncManager), never in the admin's sandbox tab; the engine
 * and the stores it reads load only after a sign-in (the app shell stays small).
 */
export function CloudSyncBridge() {
  const userId = useParentStore((state) => (state.session?.mode === 'cloud' ? state.session.userId : null))
  useEffect(() => {
    if (!userId || isSupabaseConfigured || isAdminPreview()) return undefined
    let stop: (() => void) | null = null
    let cancelled = false
    void import('./startCloudSync').then(({ startCloudSync }) => {
      if (!cancelled) stop = startCloudSync(userId)
    })
    return () => {
      cancelled = true
      stop?.()
    }
  }, [userId])
  return null
}

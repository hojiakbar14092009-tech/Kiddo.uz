import { useEffect } from 'react'
import { useFamilyStore } from '@/store/familyStore'
import { useParentStore } from '@/store/parentStore'
import { useProgressStore } from '@/store/progressStore'
import { useActivityStore } from '@/store/activityStore'
import { eventRow, paymentRow } from './rows'
import { usePaymentStore } from '@/store/paymentStore'
import { useSubscriptionStore, type PlanId } from '@/store/subscriptionStore'
import { flushQueue, useSyncStore, type SyncClient } from './syncQueue'
import { childChanges, progressChanges, snapshot } from './trackChanges'

const FLUSH_EVERY_MS = 60_000
const FLUSH_AFTER_CHANGE_MS = 2_000

async function loadClient(): Promise<SyncClient | null> {
  // Loaded on demand, so families without a cloud account never download Supabase.
  const [{ getSupabase }, { supabaseSyncClient }] = await Promise.all([
    import('@/services/supabase/client'),
    import('./supabaseSyncClient'),
  ])
  const supabase = getSupabase()
  return supabase ? supabaseSyncClient(supabase) : null
}

/** Applies the family's PRO from the `subscriptions` table, when it ends later than ours. */
async function pullSubscription() {
  const { getSupabase } = await import('@/services/supabase/client')
  const supabase = getSupabase()
  if (!supabase) return
  const { data } = await supabase
    .from('subscriptions')
    .select('plan, source, expires_at')
    .maybeSingle()
  if (!data) return
  const local = useSubscriptionStore.getState()
  const remoteEnd = data.expires_at ? Date.parse(String(data.expires_at)) : Infinity
  const localEnd = !local.plan ? 0 : local.expiresAt ? Date.parse(local.expiresAt) : Infinity
  if (remoteEnd > localEnd || (remoteEnd === Infinity && localEnd !== Infinity)) {
    useSubscriptionStore.setState({
      plan: data.plan as PlanId,
      source: data.source === 'promo' ? 'promo' : data.source === 'admin' ? 'admin' : 'payment',
      expiresAt: data.expires_at ? String(data.expires_at) : null,
    })
  }
}

/**
 * Keeps a cloud copy of profiles and progress while a parent is signed in
 * with a Supabase account. Works offline-first: changes wait in a persisted
 * queue and are sent when the device is online.
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

  useEffect(() => {
    if (!userId) return undefined
    let client: SyncClient | null = null
    let soon: ReturnType<typeof setTimeout> | undefined
    const flush = () => {
      if (client && navigator.onLine !== false) void flushQueue(client)
    }
    const flushSoon = () => {
      clearTimeout(soon)
      soon = setTimeout(flush, FLUSH_AFTER_CHANGE_MS)
    }
    const enqueueAll = (operations: ReturnType<typeof snapshot>) => {
      if (operations.length === 0) return
      const { enqueue } = useSyncStore.getState()
      operations.forEach(enqueue)
      flushSoon()
    }

    const sync = useSyncStore.getState()
    if (sync.snapshotFor !== userId) {
      enqueueAll(snapshot(useFamilyStore.getState().children, useProgressStore.getState().byChild))
      sync.setSnapshotFor(userId)
    }

    const stopFamily = useFamilyStore.subscribe((next, previous) =>
      enqueueAll(childChanges(previous.children, next.children)),
    )
    const stopProgress = useProgressStore.subscribe((next, previous) =>
      enqueueAll(
        progressChanges(
          previous.byChild,
          next.byChild,
          new Set(useFamilyStore.getState().children.map((child) => child.id)),
        ),
      ),
    )
    // A child leaving the app is sent at once, while the page can still send.
    const stopActivity = useActivityStore.subscribe((next, previous) => {
      const known = new Set(previous.events.map((event) => event.id))
      const fresh = next.events.filter((event) => !known.has(event.id))
      if (fresh.length === 0) return
      const { enqueue } = useSyncStore.getState()
      fresh.forEach((event) => enqueue({ kind: 'upsertEvent', row: eventRow(event) }))
      flush()
    })
    const stopPayments = usePaymentStore.subscribe((next, previous) => {
      const known = new Set(previous.payments.map((payment) => payment.id))
      const fresh = next.payments.filter((payment) => !known.has(payment.id))
      if (fresh.length === 0) return
      const { enqueue } = useSyncStore.getState()
      fresh.forEach((payment) => enqueue({ kind: 'upsertPayment', row: paymentRow(payment) }))
      flush()
    })
    // PRO given or changed by the admin (or a real payment server) comes back here.
    void pullSubscription()
    const timer = setInterval(flush, FLUSH_EVERY_MS)
    window.addEventListener('online', flush)
    void loadClient().then((loaded) => {
      client = loaded
      flush()
    })

    return () => {
      stopFamily()
      stopProgress()
      stopActivity()
      stopPayments()
      clearInterval(timer)
      clearTimeout(soon)
      window.removeEventListener('online', flush)
    }
  }, [userId])

  return null
}

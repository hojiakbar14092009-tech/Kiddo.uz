import type { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js'
import { useParentStore } from '@/store/parentStore'
import { forgetCloudPro } from './subscription'
import { useSyncStore } from './syncQueue'

/**
 * Ends the parent's cloud session on this device, the same way the parent's
 * own "sign out" does: unsent changes belong to that account and must never
 * reach the next one (pending child deletions are kept, see `clear`), and
 * the account's PRO is not this device's.
 */
export function endCloudSession(): void {
  useSyncStore.getState().clear()
  // PRO came from that account's server row; without the account it is gone.
  forgetCloudPro()
  useParentStore.getState().signOut()
}

/**
 * What a Supabase auth event means for the parent signed in as `userId`:
 * `end` – the real session is gone (signed out elsewhere, refresh token
 * revoked, another account took over); `resume` – the session is valid
 * again, a paused queue may continue; `ignore` – nothing to do.
 */
export function authDecision(
  event: AuthChangeEvent,
  session: Session | null,
  userId: string,
): 'end' | 'resume' | 'ignore' {
  if (event === 'SIGNED_OUT') return 'end'
  if (!session) return event === 'INITIAL_SESSION' ? 'end' : 'ignore'
  if (session.user.id !== userId) return 'end'
  if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    return 'resume'
  }
  return 'ignore'
}

/** Ties the parent area's cloud session to the real Supabase auth state. Returns a stop function. */
export function watchCloudSession(
  supabase: SupabaseClient,
  userId: string,
  onResume: () => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    const decision = authDecision(event, session, userId)
    if (decision === 'end') endCloudSession()
    else if (decision === 'resume') {
      if (useSyncStore.getState().paused) useSyncStore.getState().resume()
      // Not inside the callback: supabase-js holds its auth lock there, and a
      // request made from it would wait for that lock forever.
      setTimeout(onResume, 0)
    }
  })
  return () => data.subscription.unsubscribe()
}

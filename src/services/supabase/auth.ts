import { getSupabase } from './client'
import { consentMetadata } from './consent'

export type AuthResult =
  | { ok: true; email: string; userId: string }
  | {
      ok: false
      reason:
        | 'not-configured'
        | 'invalid-credentials'
        | 'confirm-email'
        | 'network'
        | 'link-expired'
        | 'other-browser'
        | 'cancelled'
    }

/** Where Google and the e-mail link bring the parent back (Phase 44). */
export const AUTH_RETURN_PATH = '/parent/auth'

function returnUrl(): string {
  return `${window.location.origin}${AUTH_RETURN_PATH}`
}

function failure(message: string): AuthResult {
  const text = message.toLowerCase()
  if (text.includes('invalid login') || text.includes('invalid credentials')) {
    return { ok: false, reason: 'invalid-credentials' }
  }
  if (text.includes('confirm')) return { ok: false, reason: 'confirm-email' }
  return { ok: false, reason: 'network' }
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'not-configured' }
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) return failure(error?.message ?? '')
    return { ok: true, email: data.user.email ?? email, userId: data.user.id }
  } catch {
    return { ok: false, reason: 'network' }
  }
}

export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'not-configured' }
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // the confirmation link comes back to /parent/auth; the consent goes with the account
      options: { emailRedirectTo: returnUrl(), data: consentMetadata() },
    })
    if (error || !data.user) return failure(error?.message ?? '')
    // With e-mail confirmation on, Supabase returns a user but no session yet.
    if (!data.session) return { ok: false, reason: 'confirm-email' }
    return { ok: true, email: data.user.email ?? email, userId: data.user.id }
  } catch {
    return { ok: false, reason: 'network' }
  }
}

export async function signOutCloud(): Promise<void> {
  await getSupabase()?.auth.signOut()
}

/**
 * Google sign-in (Phase 44): the browser leaves for Google and comes back to /parent/auth.
 * Resolves only when it could not start.
 */
export async function signInWithGoogle(): Promise<Extract<AuthResult, { ok: false }> | null> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'not-configured' }
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: returnUrl() },
    })
    return error ? { ok: false, reason: 'network' } : null
  } catch {
    return { ok: false, reason: 'network' }
  }
}

/** A sign-in link by e-mail (no password); opened in this browser, it signs the parent in. */
export async function sendSignInLink(
  email: string,
): Promise<{ ok: true } | Extract<AuthResult, { ok: false }>> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'not-configured' }
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: returnUrl(), shouldCreateUser: true, data: consentMetadata() },
    })
    return error ? { ok: false, reason: 'network' } : { ok: true }
  } catch {
    return { ok: false, reason: 'network' }
  }
}

/**
 * Back from Google or the e-mail link: exchanges the one-time code for a session. The code only
 * works in the browser that asked for it ('other-browser'), and only once or for a short while
 * ('link-expired').
 */
export async function completeSignIn(search: string): Promise<AuthResult> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'not-configured' }
  const params = new URLSearchParams(search)
  const code = params.get('code')
  const error = params.get('error')
  // the parent closed Google's window or said no
  if (error === 'access_denied') return { ok: false, reason: 'cancelled' }
  if (error || params.get('error_description')) return { ok: false, reason: 'link-expired' }
  try {
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (error || !data.user) {
        const text = (error?.message ?? '').toLowerCase()
        return {
          ok: false,
          reason: text.includes('verifier') ? 'other-browser' : 'link-expired',
        }
      }
      return { ok: true, email: data.user.email ?? '', userId: data.user.id }
    }
    const { data } = await supabase.auth.getSession()
    const user = data.session?.user
    return user
      ? { ok: true, email: user.email ?? '', userId: user.id }
      : { ok: false, reason: 'link-expired' }
  } catch {
    return { ok: false, reason: 'network' }
  }
}

/**
 * Deletes the parent's cloud account and everything in it (Phase 44): the `delete-account`
 * function removes the children's cloud photos, then the account (every row goes with it).
 * `true` only when the server said it is done.
 */
export async function deleteCloudAccount(): Promise<boolean> {
  try {
    const { callEdgeFunction } = await import('@/services/audio/edgeFunctions')
    const reply = await callEdgeFunction('delete-account', { confirm: 'DELETE' })
    return reply?.status === 200
  } catch {
    return false
  }
}

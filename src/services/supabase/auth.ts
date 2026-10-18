import { getSupabase } from './client'

export type AuthResult =
  | { ok: true; email: string; userId: string }
  | { ok: false; reason: 'not-configured' | 'invalid-credentials' | 'confirm-email' | 'network' }

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
    const { data, error } = await supabase.auth.signUp({ email, password })
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

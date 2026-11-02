import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isAdminPreview } from '@/app/preview/adminPreview'
import { isSupabaseConfigured, SUPABASE_ANON_KEY as anonKey, SUPABASE_URL as url } from './config'

export { isSupabaseConfigured }

let client: SupabaseClient | null = null

/**
 * The shared Supabase client, or `null` when no keys are configured or in the
 * admin's sandbox tab (Phase 51: it never reaches the server as a child).
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured || isAdminPreview()) return null
  client ??= createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'kiddo.auth',
      // Google and the e-mail link come back with a one-time `code` (/parent/auth exchanges it)
      flowType: 'pkce',
      detectSessionInUrl: false,
    },
  })
  return client
}

let adminClient: SupabaseClient | null = null

/**
 * The admin panel's own client (Phase 52). Its sign-in lives in this browser
 * tab only (sessionStorage, its own key): closing the tab ends it, and the
 * child app and the parent's cloud sync on the same device never run as the
 * admin. `null` like `getSupabase()` without keys or in the sandbox tab.
 */
export function getAdminSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured || isAdminPreview()) return null
  adminClient ??= createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'kiddo.admin.auth',
      storage: window.sessionStorage,
      detectSessionInUrl: false,
    },
  })
  return adminClient
}

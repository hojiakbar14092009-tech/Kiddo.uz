import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

/** True when the build has Supabase keys; otherwise the app runs in offline demo mode. */
export const isSupabaseConfigured = url.length > 0 && anonKey.length > 0

let client: SupabaseClient | null = null

/** The shared Supabase client, or `null` when no keys are configured. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null
  client ??= createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'kiddo.auth' },
  })
  return client
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isSupabaseConfigured, SUPABASE_ANON_KEY as anonKey, SUPABASE_URL as url } from './config'

export { isSupabaseConfigured }

let client: SupabaseClient | null = null

/** The shared Supabase client, or `null` when no keys are configured. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null
  client ??= createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'kiddo.auth' },
  })
  return client
}

/** Supabase keys from the build; without them the app runs in offline demo mode. */
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

/** True when the build has Supabase keys. Importing this does not load the Supabase library. */
export const isSupabaseConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0

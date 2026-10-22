/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL, e.g. https://xyz.supabase.co. Optional: without it the parent area runs in demo mode. */
  readonly VITE_SUPABASE_URL?: string
  /** Test builds only: allow the mock payment in a production build. */
  readonly VITE_PAYMENTS_MOCK?: string
  /** Supabase anon (public) key. Row Level Security protects the data. */
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

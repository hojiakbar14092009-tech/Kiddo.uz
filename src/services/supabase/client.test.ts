import { describe, expect, it, vi } from 'vitest'

const createClient = vi.fn((_url: string, _key: string, options: unknown) => ({ options }))
vi.mock('@supabase/supabase-js', () => ({ createClient }))
vi.mock('./config', () => ({
  isSupabaseConfigured: true,
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
}))

/*
 * Phase 52: the admin's sign-in must not stay on the device. The admin panel
 * has its own client whose session lives in this tab only, apart from the
 * parent's session that the child app and cloud sync use.
 */
describe('Supabase clients', () => {
  it('keeps the admin session in this tab only, under its own key', async () => {
    const { getAdminSupabase, getSupabase } = await import('./client')
    const admin = getAdminSupabase() as unknown as {
      options: { auth: { storageKey: string; storage: Storage } }
    }
    const parent = getSupabase() as unknown as { options: { auth: { storageKey: string } } }
    expect(admin).not.toBe(parent)
    expect(admin.options.auth.storageKey).toBe('kiddo.admin.auth')
    expect(admin.options.auth.storage).toBe(window.sessionStorage)
    expect(parent.options.auth.storageKey).toBe('kiddo.auth')
    expect(getAdminSupabase()).toBe(admin)
  })
})

import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CONSENT_VERSION, ensureConsent, rememberConsent } from './consent'

/* Phase 44: consent given before an account exists is kept with the account, or asked again. */

function cloud(row: { version: string } | null, failRead = false) {
  const upsert = vi.fn(async () => ({ error: null }))
  const maybeSingle = vi.fn(async () =>
    failRead ? { data: null, error: { message: 'offline' } } : { data: row, error: null },
  )
  const supabase = { from: () => ({ select: () => ({ maybeSingle }), upsert }) }
  return { supabase: supabase as unknown as SupabaseClient, upsert }
}

describe('the parent’s consent', () => {
  beforeEach(() => localStorage.clear())

  it('on record for this version: nothing to do', async () => {
    const { supabase, upsert } = cloud({ version: CONSENT_VERSION })
    expect(await ensureConsent(supabase, null)).toBe('ok')
    expect(upsert).not.toHaveBeenCalled()
  })

  it('given on this device before (another tab, the trip to Google): saved now, once', async () => {
    rememberConsent(1000)
    const { supabase, upsert } = cloud(null)
    expect(await ensureConsent(supabase, null, 2000)).toBe('ok')
    expect(upsert).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('kiddo.consent.pending')).toBeNull()
  })

  it('carried by the account (a sign-up confirmed elsewhere): saved now', async () => {
    const { supabase, upsert } = cloud(null)
    expect(
      await ensureConsent(supabase, { user_metadata: { consent_version: CONSENT_VERSION } }),
    ).toBe('ok')
    expect(upsert).toHaveBeenCalled()
  })

  it('none, an old one, or one given long ago: the parent is asked', async () => {
    expect(await ensureConsent(cloud(null).supabase, null)).toBe('needed')
    expect(await ensureConsent(cloud({ version: '2020-01' }).supabase, null)).toBe('needed')
    rememberConsent(0)
    expect(await ensureConsent(cloud(null).supabase, null, 8 * 24 * 60 * 60 * 1000)).toBe('needed')
  })

  it('the cloud cannot be read: not blocked', async () => {
    expect(await ensureConsent(cloud(null, true).supabase, null)).toBe('unknown')
  })
})

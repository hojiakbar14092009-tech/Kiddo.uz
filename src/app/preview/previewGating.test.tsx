import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetAdminPreviewForTests } from './adminPreview'

/*
 * Phase 51: in the admin's sandbox tab nothing reaches the server, even in a
 * build with a cloud backend (mocked here) and a signed-in parent.
 */

const rpc = vi.fn(async () => ({ data: null, error: null }))
const from = vi.fn(() => ({ upsert: rpc, select: rpc, delete: rpc }))
const createClient = vi.fn(() => ({
  rpc,
  from,
  auth: {
    getSession: async () => ({ data: { session: { access_token: 'token' } } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
  },
}))

vi.mock('@supabase/supabase-js', () => ({ createClient }))
vi.mock('@/services/supabase/config', () => ({
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
  isSupabaseConfigured: true,
}))

const fetchSpy = vi.fn(async () => new Response('{}', { status: 200 }))

describe('admin preview keeps the server off (Phase 51)', () => {
  beforeEach(() => {
    resetAdminPreviewForTests(true)
    vi.stubGlobal('fetch', fetchSpy)
    fetchSpy.mockClear()
    rpc.mockClear()
    from.mockClear()
    createClient.mockClear()
  })

  afterEach(() => {
    resetAdminPreviewForTests()
    vi.unstubAllGlobals()
  })

  it('there is no Supabase client', async () => {
    const { getSupabase } = await import('@/services/supabase/client')
    expect(getSupabase()).toBeNull()
    expect(createClient).not.toHaveBeenCalled()
  })

  it('analytics are not sent, neither in batches nor on leaving', async () => {
    const { track } = await import('@/domain/analytics')
    const { sendOnLeave, supabaseAnalyticsSender } =
      await import('@/services/analytics/sendAnalytics')
    track('activity_opened', { screen: '/tasks/match' })
    expect(await supabaseAnalyticsSender()).toBeNull()
    expect(sendOnLeave('https://example.supabase.co', 'anon')).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()

    // outside the sandbox the same call does send (the gate is what stopped it)
    resetAdminPreviewForTests(false)
    expect(sendOnLeave('https://example.supabase.co', 'anon')).toBe(true)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('cloud sync never starts, even with a cloud parent session', async () => {
    const { useParentStore } = await import('@/store/parentStore')
    const { SyncManager } = await import('@/services/sync/SyncManager')
    useParentStore.setState({ session: { mode: 'cloud', email: 'p@example.com', userId: 'u1' } })
    const view = render(<SyncManager />)
    await new Promise((resolve) => setTimeout(resolve, 20))
    view.unmount()
    useParentStore.setState({ session: null })
    expect(createClient).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
    expect(from).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('Edge Functions (voices, tutor) and the AI tutor are off', async () => {
    const { callEdgeFunction } = await import('@/services/audio/edgeFunctions')
    const { aiAvailability, saveAiConsent } = await import('@/domain/tutor/aiClient')
    expect(await callEdgeFunction('tutor-reply', {})).toBeNull()
    expect(aiAvailability('kid')).toBe('no-server')
    await expect(saveAiConsent('kid', true)).rejects.toThrow()
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('the sandbox tab does not announce a playing child or a payment to the admin panel', async () => {
    const posted = vi.fn()
    vi.stubGlobal(
      'BroadcastChannel',
      class {
        postMessage = posted
        close() {}
      },
    )
    const { postAdminMessage } = await import('@/store/paymentStore')
    postAdminMessage({ type: 'leave', childId: 'admin-preview' })
    expect(posted).not.toHaveBeenCalled()
    resetAdminPreviewForTests(false)
    postAdminMessage({ type: 'leave', childId: 'kid' })
    expect(posted).toHaveBeenCalledTimes(1)
  })
})

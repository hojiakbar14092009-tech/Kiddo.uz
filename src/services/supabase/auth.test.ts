import { beforeEach, describe, expect, it, vi } from 'vitest'

/* Phase 44: Google and the e-mail link come back with a one-time code. */

const exchangeCodeForSession = vi.fn()
const getSession = vi.fn()
const signInWithOAuth = vi.fn()
const signInWithOtp = vi.fn()

vi.mock('./client', () => ({
  isSupabaseConfigured: true,
  getSupabase: () => ({
    auth: { exchangeCodeForSession, getSession, signInWithOAuth, signInWithOtp },
  }),
}))

const { completeSignIn, sendSignInLink, signInWithGoogle, AUTH_RETURN_PATH } =
  await import('./auth')
const { CONSENT_VERSION } = await import('./consent')

describe('signing in with Google or an e-mail link', () => {
  beforeEach(() => vi.clearAllMocks())

  it('both come back to /parent/auth on this site', async () => {
    signInWithOAuth.mockResolvedValue({ error: null })
    signInWithOtp.mockResolvedValue({ error: null })
    expect(await signInWithGoogle()).toBeNull()
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${AUTH_RETURN_PATH}` },
    })
    expect(await sendSignInLink('ona@example.com')).toEqual({ ok: true })
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'ona@example.com',
      options: {
        emailRedirectTo: `${window.location.origin}${AUTH_RETURN_PATH}`,
        shouldCreateUser: true,
        // a new account carries the consent given on the sign-in page
        data: { consent_version: CONSENT_VERSION },
      },
    })
  })

  it('exchanges the code for the session', async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { user: { id: 'u1', email: 'ona@example.com' } },
      error: null,
    })
    expect(await completeSignIn('?code=abc')).toEqual({
      ok: true,
      email: 'ona@example.com',
      userId: 'u1',
    })
    expect(exchangeCodeForSession).toHaveBeenCalledWith('abc')
  })

  it('says why it failed: another browser, an old link, or an error from the provider', async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { user: null },
      error: { message: 'invalid request: both auth code and code verifier should be non-empty' },
    })
    expect(await completeSignIn('?code=abc')).toEqual({ ok: false, reason: 'other-browser' })
    exchangeCodeForSession.mockResolvedValue({
      data: { user: null },
      error: { message: 'invalid flow state, flow state has expired' },
    })
    expect(await completeSignIn('?code=abc')).toEqual({ ok: false, reason: 'link-expired' })
    expect(await completeSignIn('?error=access_denied&error_description=x')).toEqual({
      ok: false,
      reason: 'cancelled',
    })
    expect(await completeSignIn('?error=server_error')).toEqual({
      ok: false,
      reason: 'link-expired',
    })
    getSession.mockResolvedValue({ data: { session: null } })
    expect(await completeSignIn('')).toEqual({ ok: false, reason: 'link-expired' })
  })
})

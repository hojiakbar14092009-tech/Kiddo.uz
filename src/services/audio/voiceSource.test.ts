import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useParentStore } from '@/store/parentStore'
import { resetEdgeFunctionsForTests } from './edgeFunctions'
import { clearVoiceUrls, EXPIRY_MARGIN_MS, resolveClips, voiceMode } from './voiceSource'

const config = vi.hoisted(() => ({
  SUPABASE_URL: 'https://kiddo.example.co',
  SUPABASE_ANON_KEY: 'anon-from-env',
  isSupabaseConfigured: true,
}))
vi.mock('@/services/supabase/config', () => config)

const auth = vi.hoisted(() => ({ token: 'user-token' as string | null }))
vi.mock('@/services/supabase/client', () => ({
  getSupabase: () => ({
    auth: {
      getSession: async () => ({
        data: { session: auth.token ? { access_token: auth.token } : null },
      }),
    },
  }),
}))

const pullSubscription = vi.hoisted(() => vi.fn(async () => true))
vi.mock('@/services/sync/subscription', () => ({ pullSubscription }))

const KEY_A = '000cef41'
const KEY_B = '001114e5'

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status })
}

function signedFor(keys: string[], expiresIn = 300) {
  return reply(200, {
    urls: Object.fromEntries(keys.map((key) => [key, `https://cdn.example/${key}.mp3?token=t`])),
    expiresIn,
  })
}

describe('voiceSource', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    clearVoiceUrls()
    resetEdgeFunctionsForTests()
    auth.token = 'user-token'
    config.isSupabaseConfigured = true
    vi.stubEnv('VITE_VOICE_PRIVATE', 'true')
    useParentStore.setState({ session: { mode: 'cloud', email: 'p@x.uz', userId: 'u1' } })
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    pullSubscription.mockClear()
    useParentStore.setState({ session: null })
  })

  describe('mode', () => {
    it('is private only in cloud mode with the build flag', () => {
      expect(voiceMode()).toBe('private')
    })

    it('is public without the flag', () => {
      vi.stubEnv('VITE_VOICE_PRIVATE', '')
      expect(voiceMode()).toBe('public')
      vi.stubEnv('VITE_VOICE_PRIVATE', 'yes')
      expect(voiceMode()).toBe('public')
    })

    it('is public in demo mode, signed out, or without Supabase', () => {
      useParentStore.setState({ session: { mode: 'demo' } })
      expect(voiceMode()).toBe('public')
      useParentStore.setState({ session: null })
      expect(voiceMode()).toBe('public')
      useParentStore.setState({ session: { mode: 'cloud', email: 'p@x.uz', userId: 'u1' } })
      config.isSupabaseConfigured = false
      expect(voiceMode()).toBe('public')
    })
  })

  it('gives the build paths in public mode without any request', async () => {
    vi.stubEnv('VITE_VOICE_PRIVATE', 'false')
    const result = await resolveClips('uz', [KEY_A])
    expect(result).toEqual({ status: 'ok', urls: { [KEY_A]: `/audio/voice/uz/${KEY_A}.mp3` } })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('asks voice-url once for all keys of a request, as the signed-in user', async () => {
    fetchMock.mockResolvedValueOnce(signedFor([`uz/${KEY_A}`, `uz/${KEY_B}`]))
    const result = await resolveClips('uz', [KEY_A, KEY_B, KEY_A])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://kiddo.example.co/functions/v1/voice-url')
    expect(init.method).toBe('POST')
    expect(init.cache).toBe('no-store')
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer user-token',
      apikey: 'anon-from-env',
    })
    expect(JSON.parse(String(init.body))).toEqual({ keys: [`uz/${KEY_A}`, `uz/${KEY_B}`] })
    expect(result).toEqual({
      status: 'ok',
      urls: {
        [KEY_A]: `https://cdn.example/uz/${KEY_A}.mp3?token=t`,
        [KEY_B]: `https://cdn.example/uz/${KEY_B}.mp3?token=t`,
      },
    })
  })

  it('splits more than 20 keys into calls of 20', async () => {
    const keys = Array.from({ length: 25 }, (_, index) => index.toString(16).padStart(8, '0'))
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) =>
      signedFor((JSON.parse(String(init.body)) as { keys: string[] }).keys),
    )
    const result = await resolveClips('en', keys)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const sizes = fetchMock.mock.calls.map(
      ([, init]) =>
        (JSON.parse(String((init as RequestInit).body)) as { keys: string[] }).keys.length,
    )
    expect(sizes).toEqual([20, 5])
    expect(result.status === 'ok' && Object.keys(result.urls)).toHaveLength(25)
  })

  it('reuses a signed URL until 30 s before it expires', async () => {
    let now = 1_000_000
    const clock = () => now
    fetchMock.mockResolvedValueOnce(signedFor([`ru/${KEY_A}`], 300))
    fetchMock.mockResolvedValueOnce(
      reply(200, { urls: { [`ru/${KEY_A}`]: 'https://cdn.example/fresh.mp3' }, expiresIn: 300 }),
    )

    await resolveClips('ru', [KEY_A], clock)
    now += 300_000 - EXPIRY_MARGIN_MS - 1
    expect(await resolveClips('ru', [KEY_A], clock)).toEqual({
      status: 'ok',
      urls: { [KEY_A]: `https://cdn.example/ru/${KEY_A}.mp3?token=t` },
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    now += 2
    expect(await resolveClips('ru', [KEY_A], clock)).toEqual({
      status: 'ok',
      urls: { [KEY_A]: 'https://cdn.example/fresh.mp3' },
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('leaves out keys the server has no clip for', async () => {
    fetchMock.mockResolvedValueOnce(signedFor([`uz/${KEY_A}`]))
    expect(await resolveClips('uz', [KEY_A, KEY_B])).toEqual({
      status: 'ok',
      urls: { [KEY_A]: `https://cdn.example/uz/${KEY_A}.mp3?token=t` },
    })
  })

  it('turns 403 not_pro into locked and checks the subscription again', async () => {
    fetchMock.mockImplementation(async () => reply(403, { error: 'not_pro' }))
    expect(await resolveClips('uz', [KEY_A])).toEqual({ status: 'locked' })
    await vi.waitFor(() => expect(pullSubscription).toHaveBeenCalledTimes(1))
    // at most once a minute
    expect(await resolveClips('uz', [KEY_A])).toEqual({ status: 'locked' })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(pullSubscription).toHaveBeenCalledTimes(1)
  })

  it('turns other failures into error', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    expect(await resolveClips('uz', [KEY_A])).toEqual({ status: 'error' })
    fetchMock.mockResolvedValueOnce(reply(429, { error: 'rate_limited' }))
    expect(await resolveClips('uz', [KEY_A])).toEqual({ status: 'error' })
    fetchMock.mockResolvedValueOnce(reply(401, { error: 'not_signed_in' }))
    expect(await resolveClips('uz', [KEY_A])).toEqual({ status: 'error' })
    fetchMock.mockResolvedValueOnce(reply(500, 'oops'))
    expect(await resolveClips('uz', [KEY_A])).toEqual({ status: 'error' })
    expect(pullSubscription).not.toHaveBeenCalled()
  })

  it('is an error without a session, and sends nothing', async () => {
    auth.token = null
    expect(await resolveClips('uz', [KEY_A])).toEqual({ status: 'error' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('never writes signed URLs to localStorage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    fetchMock.mockResolvedValueOnce(signedFor([`uz/${KEY_A}`]))
    await resolveClips('uz', [KEY_A])
    expect(setItem).not.toHaveBeenCalled()
    expect(JSON.stringify({ ...localStorage })).not.toContain('cdn.example')
  })

  it('forgets signed URLs when the parent session changes', async () => {
    fetchMock.mockImplementation(async () => signedFor([`uz/${KEY_A}`]))
    await resolveClips('uz', [KEY_A])
    useParentStore.setState({ session: { mode: 'cloud', email: 'q@x.uz', userId: 'u2' } })
    await resolveClips('uz', [KEY_A])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

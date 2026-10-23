import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useParentStore } from '@/store/parentStore'
import { resetEdgeFunctionsForTests } from './edgeFunctions'
import { clearRemoteTts, requestTts } from './remoteTts'

vi.mock('@/services/supabase/config', () => ({
  SUPABASE_URL: 'https://kiddo.example.co',
  SUPABASE_ANON_KEY: 'anon-from-env',
  isSupabaseConfigured: true,
}))
vi.mock('@/services/supabase/client', () => ({
  getSupabase: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 'user-token' } } }) },
  }),
}))
const pullSubscription = vi.hoisted(() => vi.fn(async () => true))
vi.mock('@/services/sync/subscription', () => ({ pullSubscription }))

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })

describe('remoteTts', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    clearRemoteTts()
    resetEdgeFunctionsForTests()
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    useParentStore.setState({ session: null })
  })

  it('posts language + text to the tts function and caches the URL for the session', async () => {
    fetchMock.mockImplementation(async () =>
      reply(200, { url: 'https://cdn.example/tts.mp3?token=t', expiresIn: 300, cached: false }),
    )
    expect(await requestTts('ru', ' Привет! ')).toEqual({
      status: 'ok',
      url: 'https://cdn.example/tts.mp3?token=t',
    })
    expect(await requestTts('ru', 'Привет!')).toEqual({
      status: 'ok',
      url: 'https://cdn.example/tts.mp3?token=t',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://kiddo.example.co/functions/v1/tts')
    expect(JSON.parse(String(init.body))).toEqual({ language: 'ru', text: 'Привет!' })
    expect(init.headers).toMatchObject({ Authorization: 'Bearer user-token' })
  })

  it('treats 503 unavailable as missing and does not ask again for that language', async () => {
    fetchMock.mockImplementation(async () => reply(503, { error: 'unavailable' }))
    expect(await requestTts('uz', 'Salom!')).toEqual({ status: 'missing' })
    expect(await requestTts('uz', 'Boshqa gap.')).toEqual({ status: 'missing' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('turns not_pro into locked and other failures into error', async () => {
    useParentStore.setState({ session: { mode: 'cloud', email: 'p@x.uz', userId: 'u1' } })
    fetchMock.mockResolvedValueOnce(reply(403, { error: 'not_pro' }))
    expect(await requestTts('en', 'Hello!')).toEqual({ status: 'locked' })
    await vi.waitFor(() => expect(pullSubscription).toHaveBeenCalled())
    fetchMock.mockResolvedValueOnce(reply(429, { error: 'rate_limited' }))
    expect(await requestTts('en', 'Hello!')).toEqual({ status: 'error' })
    fetchMock.mockRejectedValueOnce(new TypeError('offline'))
    expect(await requestTts('en', 'Hello!')).toEqual({ status: 'error' })
  })

  it('does not send empty or too long texts', async () => {
    expect(await requestTts('en', '  ')).toEqual({ status: 'missing' })
    expect(await requestTts('en', 'a'.repeat(201))).toEqual({ status: 'missing' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

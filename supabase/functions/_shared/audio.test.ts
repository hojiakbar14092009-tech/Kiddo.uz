import { describe, expect, it, vi } from 'vitest'
import { type AudioDeps, handleTts, handleVoiceUrl, SIGNED_URL_SECONDS } from './handlers.ts'
import {
  bearerToken,
  corsHeaders,
  envInt,
  MAX_BODY_BYTES,
  parseAllowedOrigins,
  readJsonBody,
} from './http.ts'
import {
  azureProvider,
  selectTts,
  ttsHash,
  ttsPath,
  type TtsProvider,
  voiceMatchesLanguage,
  xmlEscape,
} from './tts.ts'
import { isPlainSentence, parseTtsRequest, parseVoiceKeys } from './validate.ts'

const ORIGIN = 'https://kiddo-uz.vercel.app'
const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1In0.signature-part'

function env(values: Record<string, string>) {
  return (name: string) => values[name]
}

function post(
  path: string,
  body: unknown,
  init: { token?: string | null; origin?: string } = {},
): Request {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Origin: init.origin ?? ORIGIN,
  }
  if (init.token !== null) headers.Authorization = `Bearer ${init.token ?? TOKEN}`
  return new Request(`https://x.supabase.co/functions/v1/${path}`, {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function fakeProvider(id = 'azure'): TtsProvider & { calls: number } {
  const provider = {
    id,
    calls: 0,
    async synthesize() {
      provider.calls += 1
      return new Uint8Array([0xff, 0xfb, 0x90])
    },
  }
  return provider
}

function makeDeps(overrides: Partial<AudioDeps> = {}) {
  const stored = new Map<string, Uint8Array>(
    ['uz/000cef41.mp3', 'ru/0000beef.mp3'].map((p) => [p, new Uint8Array([1])]),
  )
  const cache = new Map<string, { path: string; voice: string }>()
  const deps: AudioDeps & { stored: typeof stored; cache: typeof cache; rateCalls: unknown[][] } = {
    stored,
    cache,
    rateCalls: [],
    env: env({ ALLOWED_ORIGINS: `${ORIGIN},http://localhost:5173` }),
    userIdFromToken: vi.fn(async (token: string) => (token === TOKEN ? 'user-1' : null)),
    isPro: vi.fn(async () => true),
    async rateOk(...args) {
      deps.rateCalls.push(args)
      return true
    },
    dailyCount: vi.fn(async () => 0),
    async signUrls(paths) {
      const out: Record<string, string> = {}
      for (const p of paths) if (stored.has(p)) out[p] = `https://signed/${p}?token=t`
      return out
    },
    async findTts(language, hash) {
      return cache.get(`${language}/${hash}`) ?? null
    },
    async storeAudio(path, bytes) {
      stored.set(path, bytes)
    },
    async rememberTts(language, hash, path, voice) {
      cache.set(`${language}/${hash}`, { path, voice })
    },
    ...overrides,
  }
  return deps
}

describe('validation', () => {
  it('accepts 1–20 well-formed keys and drops duplicates', () => {
    expect(parseVoiceKeys({ keys: ['uz/000cef41', 'en/abcdef01', 'uz/000cef41'] })).toEqual([
      'uz/000cef41',
      'en/abcdef01',
    ])
    expect(
      parseVoiceKeys({
        keys: Array.from({ length: 20 }, (_, i) => `ru/${String(i).padStart(8, '0')}`),
      }),
    ).toHaveLength(20)
  })

  it.each([
    [{ keys: [] }],
    [{ keys: Array.from({ length: 21 }, (_, i) => `ru/${String(i).padStart(8, '0')}`) }],
    [{ keys: ['kk/000cef41'] }],
    [{ keys: ['uz/000CEF41'] }],
    [{ keys: ['uz/000cef4'] }],
    [{ keys: ['uz/000cef41.mp3'] }],
    [{ keys: ['../uz/000cef41'] }],
    [{ keys: ['tts/uz/000cef41'] }],
    [{ keys: [42] }],
    [{ keys: 'uz/000cef41' }],
    [['uz/000cef41']],
    [null],
  ])('rejects bad keys %j', (body) => {
    expect(parseVoiceKeys(body)).toBeNull()
  })

  it('normalises TTS text and allows only uz/ru/en and 1–200 characters', () => {
    expect(parseTtsRequest({ language: 'uz', text: '  Salom,\n  dunyo!  ' })).toEqual({
      language: 'uz',
      text: 'Salom, dunyo!',
    })
    expect(parseTtsRequest({ language: 'en', text: 'a'.repeat(200) })?.text).toHaveLength(200)
    expect(parseTtsRequest({ language: 'en', text: 'a'.repeat(201) })).toBeNull()
    expect(parseTtsRequest({ language: 'en', text: '   ' })).toBeNull()
    expect(parseTtsRequest({ language: 'kk', text: 'Salem' })).toBeNull()
    expect(parseTtsRequest({ language: 'UZ', text: 'Salom' })).toBeNull()
    expect(parseTtsRequest({ language: 'uz', text: 'a\u0000b' })).toBeNull()
    expect(parseTtsRequest({ language: 'uz', text: 5 })).toBeNull()
    expect(parseTtsRequest('uz')).toBeNull()
  })

  it('allows letters, digits, punctuation and spaces in TTS text, nothing else', () => {
    for (const text of [
      'Qaysi biri o‘rdak?',
      'Yangi soʻz: olma.',
      'Какая буква «Б»?',
      '2 + 3 = 5',
      'Café, naïve – “yes”!',
    ]) {
      expect([text, isPlainSentence(text)]).toEqual([text, true])
    }
    for (const text of [
      'a\u0000b',
      'Salom 😀',
      'a $ b',
      'ali@x.uz',
      'see http://x',
      'a<b>',
      'a\tb',
    ]) {
      expect([text, isPlainSentence(text)]).toEqual([text, false])
    }
  })
})

describe('http helpers', () => {
  it('parses allowed origins strictly', () => {
    expect(
      parseAllowedOrigins(
        ' https://Kiddo-uz.vercel.app/ , *, http://localhost:5173,ftp://x, https://kiddo-uz.vercel.app',
      ),
    ).toEqual(['https://kiddo-uz.vercel.app', 'http://localhost:5173'])
    expect(parseAllowedOrigins(undefined)).toEqual([])
  })

  it('echoes only an allowed origin', () => {
    expect(corsHeaders(ORIGIN, [ORIGIN])['Access-Control-Allow-Origin']).toBe(ORIGIN)
    expect(
      corsHeaders('https://evil.example', [ORIGIN])['Access-Control-Allow-Origin'],
    ).toBeUndefined()
    expect(corsHeaders(null, [ORIGIN])['Access-Control-Allow-Origin']).toBeUndefined()
  })

  it('reads the body with a byte cap, even without Content-Length', async () => {
    const streamed = (parts: string[]) =>
      new Request('https://x', {
        method: 'POST',
        body: new ReadableStream({
          start(controller) {
            for (const part of parts) controller.enqueue(new TextEncoder().encode(part))
            controller.close()
          },
        }),
        // @ts-expect-error Node needs duplex for a stream body; the DOM type lacks it
        duplex: 'half',
      })
    const small = streamed(['{"keys":', '["uz/000cef41"]}'])
    expect(small.headers.get('Content-Length')).toBeNull()
    expect(await readJsonBody(small)).toEqual({ keys: ['uz/000cef41'] })
    const big = streamed(['{"pad":"', 'x'.repeat(MAX_BODY_BYTES), '"}'])
    expect(await readJsonBody(big)).toBeUndefined()
    expect(await readJsonBody(streamed(['{"a":1}']), 3)).toBeUndefined()
    expect(await readJsonBody(new Request('https://x', { method: 'POST' }))).toBeUndefined()
  })

  it('reads a bearer token and bounded env ints', () => {
    const request = new Request('https://x', { headers: { Authorization: `Bearer ${TOKEN}` } })
    expect(bearerToken(request)).toBe(TOKEN)
    expect(
      bearerToken(new Request('https://x', { headers: { Authorization: 'Basic abc' } })),
    ).toBeNull()
    expect(envInt(undefined, 5, 1, 10)).toBe(5)
    expect(envInt('x', 5, 1, 10)).toBe(5)
    expect(envInt('99', 5, 1, 10)).toBe(10)
  })
})

describe('voice-url', () => {
  it('returns signed URLs for stored clips only', async () => {
    const deps = makeDeps()
    const response = await handleVoiceUrl(
      post('voice-url', { keys: ['uz/000cef41', 'en/12345678', 'ru/0000beef'] }),
      deps,
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({
      urls: {
        'uz/000cef41': 'https://signed/uz/000cef41.mp3?token=t',
        'ru/0000beef': 'https://signed/ru/0000beef.mp3?token=t',
      },
      expiresIn: SIGNED_URL_SECONDS,
    })
    expect(deps.rateCalls).toEqual([
      ['user-1', 'auth', 300, 60],
      ['user-1', 'voice', 120, 60],
    ])
  })

  it('answers the preflight with CORS headers and nothing else', async () => {
    const response = await handleVoiceUrl(
      new Request('https://x/functions/v1/voice-url', {
        method: 'OPTIONS',
        headers: { Origin: ORIGIN },
      }),
      makeDeps(),
    )
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('apikey')
  })

  it('maps every failure to the contract error', async () => {
    const keys = { keys: ['uz/000cef41'] }
    const cases: [Request, Partial<AudioDeps>, number, string][] = [
      [post('voice-url', keys, { token: null }), {}, 401, 'not_signed_in'],
      [post('voice-url', keys, { token: 'x'.repeat(40) }), {}, 401, 'not_signed_in'],
      [post('voice-url', { keys: ['uz/nothex!!'] }), {}, 400, 'bad_request'],
      [post('voice-url', '{not json'), {}, 400, 'bad_request'],
      [post('voice-url', { keys: ['uz/000cef41'], pad: 'x'.repeat(5000) }), {}, 400, 'bad_request'],
      [post('voice-url', keys), { isPro: async () => false }, 403, 'not_pro'],
      [post('voice-url', keys), { rateOk: async () => false }, 429, 'rate_limited'],
      [
        post('voice-url', keys),
        { isPro: async () => Promise.reject(new Error('db down')) },
        500,
        'server_error',
      ],
    ]
    for (const [request, overrides, status, error] of cases) {
      const response = await handleVoiceUrl(
        request,
        makeDeps({ ...overrides, log: () => undefined }),
      )
      expect([response.status, await response.json()]).toEqual([status, { error }])
    }
    const get = await handleVoiceUrl(new Request('https://x/functions/v1/voice-url'), makeDeps())
    expect(get.status).toBe(405)
  })

  it('counts a non-PRO request only in the generous auth limit', async () => {
    const deps = makeDeps({ isPro: async () => false })
    await handleVoiceUrl(post('voice-url', { keys: ['uz/000cef41'] }), deps)
    expect(deps.rateCalls).toEqual([['user-1', 'auth', 300, 60]])
  })

  it('refuses a signed-in caller over the auth limit before the PRO lookup', async () => {
    const isPro = vi.fn(async () => true)
    const deps = makeDeps({
      isPro,
      rateOk: async (_user, kind) => kind !== 'auth',
      env: env({ ALLOWED_ORIGINS: ORIGIN, AUTH_RATE_LIMIT: '5', AUTH_RATE_WINDOW_S: '30' }),
    })
    const response = await handleVoiceUrl(post('voice-url', { keys: ['uz/000cef41'] }), deps)
    expect([response.status, await response.json()]).toEqual([429, { error: 'rate_limited' }])
    expect(isPro).not.toHaveBeenCalled()
    const counted = makeDeps({ env: env({ AUTH_RATE_LIMIT: '5', AUTH_RATE_WINDOW_S: '30' }) })
    await handleVoiceUrl(post('voice-url', { keys: ['uz/000cef41'] }), counted)
    expect(counted.rateCalls[0]).toEqual(['user-1', 'auth', 5, 30])
  })
})

describe('tts', () => {
  const azureEnv = {
    ALLOWED_ORIGINS: ORIGIN,
    TTS_PROVIDER: 'azure',
    TTS_API_KEY: 'k',
    TTS_REGION: 'westeurope',
    TTS_VOICE_UZ: 'uz-UZ-MadinaNeural',
    TTS_VOICE_RU: 'ru-RU-SvetlanaNeural',
  }

  it('selects a provider only with a voice of the same language', () => {
    expect(selectTts(env(azureEnv), 'uz')?.voice).toBe('uz-UZ-MadinaNeural')
    expect(selectTts(env(azureEnv), 'en')).toBeNull()
    expect(selectTts(env({ ...azureEnv, TTS_VOICE_UZ: 'ru-RU-SvetlanaNeural' }), 'uz')).toBeNull()
    expect(selectTts(env({ ...azureEnv, TTS_VOICE_UZ: 'kk-KZ-AigulNeural' }), 'uz')).toBeNull()
    expect(
      selectTts(env({ ...azureEnv, TTS_VOICE_UZ: 'en-US-AvaMultilingualNeural' }), 'uz'),
    ).toBeNull()
    expect(selectTts(env({ ...azureEnv, TTS_PROVIDER: 'none' }), 'uz')).toBeNull()
    expect(selectTts(env({ ...azureEnv, TTS_PROVIDER: 'google' }), 'uz')).toBeNull()
    expect(selectTts(env({ ...azureEnv, TTS_API_KEY: '' }), 'uz')).toBeNull()
    expect(selectTts(env({ ...azureEnv, TTS_REGION: 'west europe' }), 'uz')).toBeNull()
    expect(selectTts(env({}), 'uz')).toBeNull()
    expect(voiceMatchesLanguage('uz-UZ-SardorNeural', 'uz')).toBe(true)
    expect(voiceMatchesLanguage('uz-UZ-SardorNeural', 'ru')).toBe(false)
  })

  it('hashes language + text with sha256 and builds the cache path', async () => {
    const hash = await ttsHash('uz', 'Salom')
    // sha256 of the UTF-8 bytes of "uzSalom"
    expect(hash).toBe('0d56ae0286f74eb0a2c80caefd4cc25eb8707fbf3ac7968bcd58110486ece4d4')
    expect(hash).not.toBe(await ttsHash('ru', 'Salom'))
    expect(ttsPath('uz', hash)).toBe(`tts/uz/${hash}.mp3`)
  })

  it('answers 503 without a real voice for the language, before counting the request', async () => {
    const deps = makeDeps({ env: env({ ...azureEnv, TTS_VOICE_UZ: '' }) })
    const response = await handleTts(post('tts', { language: 'uz', text: 'Salom' }), deps)
    expect([response.status, await response.json()]).toEqual([503, { error: 'unavailable' }])
    expect(deps.rateCalls).toEqual([['user-1', 'auth', 300, 60]])
    const none = await handleTts(post('tts', { language: 'en', text: 'Hi' }), makeDeps())
    expect(none.status).toBe(503)
  })

  it('generates once, then serves from the cache', async () => {
    const provider = fakeProvider()
    const deps = makeDeps({ chooseTts: () => ({ provider, voice: 'uz-UZ-MadinaNeural' }) })
    const first = await handleTts(post('tts', { language: 'uz', text: 'Salom' }), deps)
    const firstBody = (await first.json()) as { url: string; cached: boolean; expiresIn: number }
    expect(first.status).toBe(200)
    expect(firstBody.cached).toBe(false)
    expect(firstBody.expiresIn).toBe(300)
    const hash = await ttsHash('uz', 'Salom')
    expect(firstBody.url).toBe(`https://signed/tts/uz/${hash}.mp3?token=t`)
    expect(deps.cache.get(`uz/${hash}`)).toEqual({
      path: `tts/uz/${hash}.mp3`,
      voice: 'azure:uz-UZ-MadinaNeural',
    })

    const second = await handleTts(post('tts', { language: 'uz', text: '  Salom ' }), deps)
    expect(((await second.json()) as { cached: boolean }).cached).toBe(true)
    expect(provider.calls).toBe(1)
    expect(deps.rateCalls.filter((call) => call[1] === 'tts')).toEqual([
      ['user-1', 'tts', 30, 3600],
      ['user-1', 'tts', 30, 3600],
    ])
  })

  it('stops at the global daily cap before the per-user count and the provider', async () => {
    const provider = fakeProvider()
    const deps = makeDeps({
      chooseTts: () => ({ provider, voice: 'uz-UZ-MadinaNeural' }),
      dailyCount: vi.fn(async () => 2000),
    })
    const response = await handleTts(post('tts', { language: 'uz', text: 'Salom' }), deps)
    expect([response.status, await response.json()]).toEqual([429, { error: 'rate_limited' }])
    expect(deps.dailyCount).toHaveBeenCalledWith('tts')
    expect(deps.rateCalls.some((call) => call[1] === 'tts')).toBe(false)
    expect(provider.calls).toBe(0)

    const raised = makeDeps({
      chooseTts: () => ({ provider, voice: 'uz-UZ-MadinaNeural' }),
      dailyCount: vi.fn(async () => 2000),
      env: env({ ALLOWED_ORIGINS: ORIGIN, TTS_DAILY_CAP: '2001' }),
    })
    expect((await handleTts(post('tts', { language: 'uz', text: 'Salom' }), raised)).status).toBe(
      200,
    )
  })

  it('accepts generic sentences only', async () => {
    const provider = fakeProvider()
    for (const text of ['ali@example.com yoz', 'https://x.uz ga kir', 'Salom 😀', 'a $ b']) {
      const deps = makeDeps({ chooseTts: () => ({ provider, voice: 'uz-UZ-MadinaNeural' }) })
      const response = await handleTts(post('tts', { language: 'uz', text }), deps)
      expect([text, response.status]).toEqual([text, 400])
    }
    expect(provider.calls).toBe(0)
  })

  it('makes the clip again when the voice changed or the object is gone', async () => {
    const provider = fakeProvider()
    const deps = makeDeps({ chooseTts: () => ({ provider, voice: 'uz-UZ-SardorNeural' }) })
    const hash = await ttsHash('uz', 'Salom')
    deps.cache.set(`uz/${hash}`, { path: `tts/uz/${hash}.mp3`, voice: 'azure:uz-UZ-MadinaNeural' })
    deps.stored.set(`tts/uz/${hash}.mp3`, new Uint8Array([1]))
    const changed = await handleTts(post('tts', { language: 'uz', text: 'Salom' }), deps)
    expect(((await changed.json()) as { cached: boolean }).cached).toBe(false)

    deps.stored.delete(`tts/uz/${hash}.mp3`)
    const gone = await handleTts(post('tts', { language: 'uz', text: 'Salom' }), deps)
    expect(((await gone.json()) as { cached: boolean }).cached).toBe(false)
    expect(provider.calls).toBe(2)
  })

  it('maps auth, PRO, input, rate and provider failures', async () => {
    const choose = () => ({ provider: fakeProvider(), voice: 'uz-UZ-MadinaNeural' })
    const broken: TtsProvider = { id: 'azure', synthesize: () => Promise.reject(new Error('boom')) }
    const cases: [Request, Partial<AudioDeps>, number, string][] = [
      [post('tts', { language: 'uz', text: 'Salom' }, { token: null }), {}, 401, 'not_signed_in'],
      [
        post('tts', { language: 'uz', text: 'Salom' }),
        { isPro: async () => false },
        403,
        'not_pro',
      ],
      [post('tts', { language: 'tr', text: 'Merhaba' }), {}, 400, 'bad_request'],
      [post('tts', { language: 'uz', text: 'a'.repeat(201) }), {}, 400, 'bad_request'],
      [
        post('tts', { language: 'uz', text: 'Salom' }),
        { rateOk: async () => false },
        429,
        'rate_limited',
      ],
      [
        post('tts', { language: 'uz', text: 'Salom' }),
        { chooseTts: () => ({ provider: broken, voice: 'uz-UZ-MadinaNeural' }) },
        500,
        'server_error',
      ],
    ]
    for (const [request, overrides, status, error] of cases) {
      const response = await handleTts(
        request,
        makeDeps({ chooseTts: choose, log: () => undefined, ...overrides }),
      )
      expect([response.status, await response.json()]).toEqual([status, { error }])
    }
  })
})

describe('azure provider', () => {
  it('sends escaped SSML with the voice locale and returns the MP3 bytes', async () => {
    const fetchImpl = vi.fn(async () => new Response(new Uint8Array([0xff, 0xfb]), { status: 200 }))
    const provider = azureProvider({ key: 'secret', region: 'westeurope', fetchImpl })
    const bytes = await provider.synthesize('A & <b>', 'uz', 'uz-UZ-MadinaNeural')
    expect(Array.from(bytes)).toEqual([0xff, 0xfb])
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://westeurope.tts.speech.microsoft.com/cognitiveservices/v1')
    expect(init.body).toContain('xml:lang="uz-UZ"')
    expect(init.body).toContain('<voice name="uz-UZ-MadinaNeural">A &amp; &lt;b&gt;</voice>')
    expect((init.headers as Record<string, string>)['Ocp-Apim-Subscription-Key']).toBe('secret')
  })

  it('refuses a voice of another language and provider errors', async () => {
    const fetchImpl = vi.fn(async () => new Response('no', { status: 401 }))
    const provider = azureProvider({ key: 'k', region: 'westeurope', fetchImpl })
    await expect(provider.synthesize('Salom', 'uz', 'ru-RU-SvetlanaNeural')).rejects.toThrow(
      'voice_language_mismatch',
    )
    expect(fetchImpl).not.toHaveBeenCalled()
    await expect(provider.synthesize('Salom', 'uz', 'uz-UZ-MadinaNeural')).rejects.toThrow(
      'azure_tts_401',
    )
    expect(xmlEscape(`"'`)).toBe('&quot;&apos;')
  })
})

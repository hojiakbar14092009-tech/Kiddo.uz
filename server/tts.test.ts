import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { call, freshDb } from './testHelpers.js'
import { useSynthForTests } from './tts.js'

const ALLOWED = 'Ve harfi shunday yoziladi.' // a sentence the app says (scripts/voices/phrases.json)
const path = (text: string, extra = '') =>
  `tts?lang=uz&role=narrator&v=0&text=${encodeURIComponent(text)}${extra}`

let synthCalls: { text: string; voice: string }[] = []

beforeEach(async () => {
  await freshDb()
  synthCalls = []
  useSynthForTests(async (text, voice) => {
    synthCalls.push({ text, voice })
    return new Uint8Array([0xff, 0xf3, 1, 2])
  })
})
afterEach(() => useSynthForTests(null))

describe('GET /api/tts', () => {
  it('speaks an app sentence as a cacheable mp3 for every user', async () => {
    const response = await call('GET', path(ALLOWED), { origin: null })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('audio/mpeg')
    expect(response.headers.get('cache-control')).toContain('s-maxage=31536000')
    expect(response.headers.get('cache-control')).toContain('immutable')
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([0xff, 0xf3, 1, 2]))
    expect(synthCalls).toEqual([{ text: ALLOWED, voice: 'uz-UZ-MadinaNeural' }])
  })

  it('synthesizes a sentence once per warm instance (the CDN keeps it for everyone else)', async () => {
    await call('GET', path(ALLOWED), { origin: null })
    const again = await call('GET', path(ALLOWED), { origin: null })
    expect(again.status).toBe(200)
    expect(synthCalls).toHaveLength(1)
  })

  it('refuses any text the app does not say (403), without synthesis', async () => {
    const response = await call('GET', path('Buy cheap pills now'), { origin: null })
    expect(response.status).toBe(403)
    expect(synthCalls).toEqual([])
  })

  it('refuses a text whose 32-bit phrase key collides with an app sentence', async () => {
    // found offline in seconds: phraseKey('uz', this) equals the key of an allowed sentence
    const response = await call('GET', path('Buy pills 27sh7'), { origin: null })
    expect(response.status).toBe(403)
    expect(synthCalls).toEqual([])
  })

  it('refuses unknown query parameters (each would be one more CDN entry)', async () => {
    expect((await call('GET', path(ALLOWED, '&x=1'), { origin: null })).status).toBe(400)
    expect(synthCalls).toEqual([])
  })

  it('refuses a child name or any free text, even a short one', async () => {
    expect((await call('GET', path('Ali'), { origin: null })).status).toBe(403)
    expect(synthCalls).toEqual([])
  })

  it.each([
    ['an unknown language', `tts?lang=de&role=narrator&v=0&text=${encodeURIComponent(ALLOWED)}`],
    ['an unknown role', `tts?lang=uz&role=robot&v=0&text=${encodeURIComponent(ALLOWED)}`],
    [
      'a future version (cache fan-out)',
      `tts?lang=uz&role=narrator&v=7&text=${encodeURIComponent(ALLOWED)}`,
    ],
    ['no version', `tts?lang=uz&role=narrator&text=${encodeURIComponent(ALLOWED)}`],
    ['no text', 'tts?lang=uz&role=narrator&v=0'],
  ])('answers 400 for %s', async (_name, route) => {
    expect((await call('GET', route, { origin: null })).status).toBe(400)
    expect(synthCalls).toEqual([])
  })

  it('limits one caller (429) before the voice service is called again', async () => {
    const statuses: number[] = []
    for (let i = 0; i < 31; i += 1)
      statuses.push((await call('GET', path(ALLOWED), { origin: null })).status)
    expect(statuses.slice(0, 30).every((status) => status === 200)).toBe(true)
    expect(statuses[30]).toBe(429)
  })

  it('says 503 (never cached) when no voice service is set up', async () => {
    useSynthForTests(null)
    delete process.env.AZURE_SPEECH_KEY
    const response = await call('GET', path(ALLOWED), { origin: null })
    expect(response.status).toBe(503)
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('writes oʻ and gʻ with one apostrophe before an Uzbek sentence is spoken', async () => {
    const text = "To'g'ri!"
    const { ttsText } = await import('./tts.js')
    expect(ttsText('uz', text)).toBe('Toʻgʻri!')
    expect(ttsText('uz', 'sheʼr')).toBe('sheʼr')
    expect(ttsText('ru', "To'g'ri")).toBe("To'g'ri")
  })
})

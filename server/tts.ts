import voiceConfig from '../src/services/audio/voiceConfig.json' with { type: 'json' }
import { normalizePhrase } from '../src/services/audio/phrases.js'
import { clientIp, HttpError } from './http.js'
import { memoryLimit } from './rateLimit.js'

/*
 * GET /api/tts?lang=uz&role=narrator&v=0&text=… — the live voice for a sentence the app says
 * that has no recorded clip. Only the app's own sentences (scripts/voices/phrases.json, the list
 * the recorder uses) are spoken: never free text, never a child's name (it stays on the device,
 * docs/architecture/audio-security.md). The URL is the cache key (text + language + voice role +
 * the role's version in voiceConfig.json), so Vercel's CDN keeps each answer for every user.
 */

type Language = 'uz' | 'ru' | 'en'
type Role = keyof typeof voiceConfig
type Synth = (
  text: string,
  voice: string,
  language: Language,
  rate: string,
  pitch: string,
) => Promise<Uint8Array>

const LANGUAGES = new Set<string>(['uz', 'ru', 'en'])
const MAX_CHARS = 200
// `path` is the dispatcher's own (vercel.json rewrites /api/tts to /api?path=tts)
const QUERY = new Set(['lang', 'role', 'v', 'text', 'path'])
const PER_MINUTE = 30
const SYNTH_TIMEOUT_MS = 8000
const LOCALES: Record<Language, string> = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' }
/** The oʻ / gʻ mark the voice reads best: set from the Q/Gʻ pilot (docs/voice/LISTEN.md). */
const UZ_APOSTROPHE = 'ʻ'
const APOSTROPHES = "ʻʼ'`‘’" // = scripts/voices/uzbek.py

/** The text sent to the voice: Uzbek oʻ/gʻ with one mark, the tutuq belgisi as ʼ (normalize_uz.py). */
export function ttsText(language: Language, text: string): string {
  if (language !== 'uz') return text
  // shortcut: numbers stay digits (normalize_uz.py spells them out); spell them here if the pilot hears them wrong
  return text
    .replace(new RegExp(`([oOgG])[${APOSTROPHES}]`, 'g'), '$1\u0000')
    .replace(new RegExp(`(?<=\\w)[${APOSTROPHES}](?=\\w)`, 'gu'), 'ʼ')
    .replaceAll('\u0000', UZ_APOSTROPHE)
}

let allowed: Promise<Record<Language, ReadonlySet<string>>> | null = null
/**
 * Every sentence the app says, as recorded (normalized), loaded on the first call (0.5 MB, only
 * this route needs it). The texts themselves, never their 32-bit phraseKey: a key collides with
 * an allowed one after a few million tries offline (tts.test.ts).
 */
function allowedKeys() {
  allowed ??= import('../scripts/voices/phrases.json', { with: { type: 'json' } }).then(
    ({ default: lists }) => {
      const keys = (language: Language) =>
        new Set((lists[language] as string[]).map(normalizePhrase))
      return { uz: keys('uz'), ru: keys('ru'), en: keys('en') }
    },
  )
  return allowed
}

const escapeXml = (text: string) => text.replace(/[<>&'"]/g, (char) => `&#${char.charCodeAt(0)};`)

/** Azure Speech (official REST, free F0 tier: 0.5 M characters a month); key and region only in env. */
const azureSynth: Synth = async (text, voice, language, rate, pitch) => {
  const key = process.env.AZURE_SPEECH_KEY
  const region = process.env.AZURE_SPEECH_REGION
  if (!key || !region) throw new HttpError(503, 'tts_unavailable')
  const ssml = `<speak version='1.0' xml:lang='${LOCALES[language]}'><voice name='${voice}'><prosody rate='${rate}' pitch='${pitch}'>${escapeXml(text)}</prosody></voice></speak>`
  const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'ocp-apim-subscription-key': key,
      'content-type': 'application/ssml+xml',
      'x-microsoft-outputformat': 'audio-24khz-48kbitrate-mono-mp3',
      'user-agent': 'kiddo',
    },
    body: ssml,
    signal: AbortSignal.timeout(SYNTH_TIMEOUT_MS),
  })
  // a quota or service error is a short outage for the app (it falls back), never a cached answer
  if (!response.ok) throw new HttpError(502, 'tts_failed', { upstream: response.status })
  return new Uint8Array(await response.arrayBuffer())
}

let synth: Synth = azureSynth
/** Tests: a fake voice service (null = the real one). */
export function useSynthForTests(fake: Synth | null): void {
  synth = fake ?? azureSynth
  spoken.clear()
}

/** shortcut: a small per-instance memory behind the CDN; the CDN is the real shared cache. */
const spoken = new Map<string, Uint8Array>()
const MEMORY_ENTRIES = 200

export async function tts(request: Request, url: URL): Promise<Response> {
  const language = url.searchParams.get('lang') ?? ''
  const role = url.searchParams.get('role') ?? ''
  const rawVersion = url.searchParams.get('v')
  const version = Number(rawVersion)
  const text = normalizePhrase(url.searchParams.get('text') ?? '')
  const config = Object.hasOwn(voiceConfig, role) ? voiceConfig[role as Role] : null
  // every other parameter would only make one more CDN entry for the same answer
  const onlyKnown = [...url.searchParams.keys()].every((name) => QUERY.has(name))
  // the version only ever names the current voice or an older one, so the URL cannot fan out
  if (
    !onlyKnown ||
    !LANGUAGES.has(language) ||
    !config ||
    rawVersion === null ||
    !Number.isInteger(version) ||
    version < 0 ||
    version > config.version ||
    !text ||
    text.length > MAX_CHARS
  )
    throw new HttpError(400, 'bad_request')
  const lang = language as Language
  memoryLimit(`tts-ip:${clientIp(request)}`, PER_MINUTE, 60)
  if (!(await allowedKeys())[lang].has(text)) throw new HttpError(403, 'not_allowed')

  const cacheKey = `${lang}\u0000${role}\u0000${config.version}\u0000${text}`
  let audio = spoken.get(cacheKey)
  if (!audio) {
    audio = await synth(ttsText(lang, text), config.voices[lang], lang, config.rate, config.pitch)
    if (spoken.size >= MEMORY_ENTRIES) spoken.delete(spoken.keys().next().value!)
    spoken.set(cacheKey, audio)
  }
  return new Response(audio, {
    status: 200,
    headers: {
      'content-type': 'audio/mpeg',
      'cache-control': 'public, max-age=31536000, s-maxage=31536000, immutable',
      // the native app (another origin) may load it with Web Audio
      'access-control-allow-origin': '*',
    },
  })
}

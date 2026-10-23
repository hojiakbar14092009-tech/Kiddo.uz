/*
 * Text-to-speech providers for the `tts` Edge Function (plain TypeScript,
 * testable under Node). Settings are Edge Function secrets only:
 *
 *   TTS_PROVIDER   none (default) | azure          (google, elevenlabs: not implemented → unavailable)
 *   TTS_API_KEY    provider key
 *   TTS_REGION     azure region, e.g. westeurope
 *   TTS_VOICE_UZ / TTS_VOICE_RU / TTS_VOICE_EN    provider voice per language
 *
 * Rule: a language without its own voice is unavailable (503). A voice is used
 * only for its own language – the Azure voice name starts with the language
 * (`uz-UZ-MadinaNeural` for uz), so an Uzbek sentence can never be read by a
 * Russian, Kazakh, Turkish or "multilingual" voice of another locale.
 */

import type { Language } from './validate.ts'

export type Env = (name: string) => string | undefined

export interface TtsProvider {
  /** Short name, stored with the cached clip. */
  readonly id: string
  /** MP3 bytes of `text` read by `voice`. Throws on any provider failure. */
  synthesize(text: string, language: Language, voice: string): Promise<Uint8Array>
}

export interface TtsChoice {
  provider: TtsProvider
  voice: string
}

/** Largest MP3 accepted from a provider (200 characters are far below this). */
export const MAX_TTS_BYTES = 2 * 1024 * 1024
const PROVIDER_TIMEOUT_MS = 15_000

/** True when the voice name belongs to this language (`uz-UZ-…` for uz). */
export function voiceMatchesLanguage(voice: string, language: Language): boolean {
  return new RegExp(`^${language}-[A-Z]{2}-[A-Za-z0-9]{1,64}$`).test(voice)
}

/**
 * The provider and voice for a language, or null (→ 503 unavailable) when no
 * provider is configured, it is not implemented, its settings are incomplete,
 * or it has no real voice for that language.
 */
export function selectTts(
  env: Env,
  language: Language,
  fetchImpl: typeof fetch = fetch,
): TtsChoice | null {
  const name = (env('TTS_PROVIDER') ?? 'none').trim().toLowerCase()
  const voice = (env(`TTS_VOICE_${language.toUpperCase()}`) ?? '').trim()
  if (!voice) return null
  switch (name) {
    case 'azure': {
      const key = (env('TTS_API_KEY') ?? '').trim()
      const region = (env('TTS_REGION') ?? '').trim().toLowerCase()
      if (!key || !/^[a-z0-9]{2,32}$/.test(region)) return null
      if (!voiceMatchesLanguage(voice, language)) return null
      return { provider: azureProvider({ key, region, fetchImpl }), voice }
    }
    // 'none', and providers that are not implemented yet ('google' has no
    // Uzbek voice at all; 'elevenlabs' voice ids say nothing about the
    // language, so the language rule above could not be enforced).
    default:
      return null
  }
}

/** SHA-256 hex of `language + text` – the cache key of a generated sentence. */
export async function ttsHash(language: Language, text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(language + text))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Where a generated sentence lives in bucket `voice`. */
export function ttsPath(language: Language, hash: string): string {
  return `tts/${language}/${hash}.mp3`
}

export function xmlEscape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Azure AI Speech REST (https://<region>.tts.speech.microsoft.com). */
export function azureProvider(options: {
  key: string
  region: string
  fetchImpl?: typeof fetch
}): TtsProvider {
  const fetchImpl = options.fetchImpl ?? fetch
  return {
    id: 'azure',
    async synthesize(text, language, voice) {
      if (!voiceMatchesLanguage(voice, language)) throw new Error('voice_language_mismatch')
      const locale = voice.split('-').slice(0, 2).join('-')
      const ssml =
        `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${locale}">` +
        `<voice name="${xmlEscape(voice)}">${xmlEscape(text)}</voice></speak>`
      const response = await fetchImpl(
        `https://${options.region}.tts.speech.microsoft.com/cognitiveservices/v1`,
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': options.key,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
            'User-Agent': 'kiddo-tts',
          },
          body: ssml,
          signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
        },
      )
      if (!response.ok) throw new Error(`azure_tts_${response.status}`)
      const bytes = new Uint8Array(await response.arrayBuffer())
      if (bytes.length === 0 || bytes.length > MAX_TTS_BYTES) throw new Error('azure_tts_size')
      return bytes
    },
  }
}

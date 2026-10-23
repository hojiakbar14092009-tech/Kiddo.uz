/*
 * Request validation for the audio Edge Functions (plain TypeScript, testable
 * under Node). Contract: docs/architecture/audio-security.md.
 */

export const LANGUAGES = ['uz', 'ru', 'en'] as const
export type Language = (typeof LANGUAGES)[number]

/** A recorded clip: `<lang>/<8 hex digits of the phrase hash>`. */
export const VOICE_KEY_PATTERN = /^(uz|ru|en)\/[0-9a-f]{8}$/
export const MAX_VOICE_KEYS = 20
export const MAX_TTS_CHARS = 200

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value)
}

/**
 * `{ "keys": [...] }` with 1–20 valid keys → the distinct keys in order;
 * anything else → null (400 bad_request).
 */
export function parseVoiceKeys(body: unknown): string[] | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null
  const keys = (body as { keys?: unknown }).keys
  if (!Array.isArray(keys) || keys.length < 1 || keys.length > MAX_VOICE_KEYS) return null
  const out: string[] = []
  for (const key of keys) {
    if (typeof key !== 'string' || !VOICE_KEY_PATTERN.test(key)) return null
    if (!out.includes(key)) out.push(key)
  }
  return out
}

/** Storage path of a recorded clip in bucket `voice`: `uz/000cef41` → `uz/000cef41.mp3`. */
export function voicePath(key: string): string {
  return `${key}.mp3`
}

export interface TtsRequest {
  language: Language
  text: string
}

/**
 * `{ "language": "uz"|"ru"|"en", "text": "…" }` → the language and the
 * normalised text (Unicode NFC, trimmed, runs of whitespace as one space);
 * null when the language is not allowed, the text has control characters, or
 * it is not 1–200 characters (UTF-16 units, like the client) after normalising.
 */
export function parseTtsRequest(body: unknown): TtsRequest | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null
  const { language, text } = body as { language?: unknown; text?: unknown }
  if (!isLanguage(language) || typeof text !== 'string') return null
  if (text.length > MAX_TTS_CHARS * 4) return null
  const normalised = text.normalize('NFC').replace(/\s+/gu, ' ').trim()
  if (normalised.length < 1 || normalised.length > MAX_TTS_CHARS) return null
  if (!isPlainSentence(normalised)) return null
  return { language, text: normalised }
}

/**
 * Remote TTS reads generic sentences only (docs/architecture/audio-security.md):
 * letters (with their combining marks), digits, punctuation, single spaces
 * and a few arithmetic signs. No control characters, emoji or other symbols,
 * and nothing that looks like an e-mail address or a link (`@`, `://`), so
 * the endpoint is not a general-purpose reader for arbitrary data.
 */
export function isPlainSentence(text: string): boolean {
  if (!/^[\p{L}\p{M}\p{N}\p{P} +\u2212=\u00d7\u00f7%]+$/u.test(text)) return false
  return !text.includes('@') && !text.includes('://')
}

import type { Language } from '@/content/languages'
import { callEdgeFunction, edgeError, refreshSubscriptionSoon } from './edgeFunctions'
import { EXPIRY_MARGIN_MS } from './voiceSource'
import { useParentStore } from '@/store/parentStore'

/*
 * Server text-to-speech for a sentence without a recording (private voice
 * mode only, docs/architecture/audio-security.md). The `tts` Edge Function
 * checks PRO and answers 503 when it has no real voice for the language, so an
 * Uzbek sentence is never read by a different-language voice.
 */

/**
 * ok – a signed URL to play; missing – no voice for it (503 unavailable);
 * locked – the server says the account is not PRO; error – anything else.
 */
export type TtsResult =
  { status: 'ok'; url: string } | { status: 'missing' } | { status: 'locked' } | { status: 'error' }

export const MAX_TTS_CHARS = 200

interface Cached {
  url: string
  expiresAt: number
}

/** Per session (memory only): signed URLs by language + text, and languages with no voice. */
const urls = new Map<string, Cached>()
const unavailable = new Set<Language>()

export function clearRemoteTts(): void {
  urls.clear()
  unavailable.clear()
}

export async function requestTts(
  language: Language,
  text: string,
  now: () => number = Date.now,
): Promise<TtsResult> {
  const sentence = text.trim()
  if (!sentence || sentence.length > MAX_TTS_CHARS) return { status: 'missing' }
  if (unavailable.has(language)) return { status: 'missing' }
  const id = `${language}\u0000${sentence}`
  const hit = urls.get(id)
  if (hit && now() < hit.expiresAt - EXPIRY_MARGIN_MS) return { status: 'ok', url: hit.url }
  urls.delete(id)

  try {
    const reply = await callEdgeFunction('tts', { language, text: sentence })
    if (!reply) return { status: 'error' }
    const code = edgeError(reply)
    if (reply.status === 503 && code === 'unavailable') {
      unavailable.add(language)
      return { status: 'missing' }
    }
    if (reply.status === 403 && code === 'not_pro') {
      clearRemoteTts()
      refreshSubscriptionSoon()
      return { status: 'locked' }
    }
    const body = (reply.body ?? {}) as { url?: unknown; expiresIn?: unknown }
    if (reply.status !== 200 || typeof body.url !== 'string' || !/^https?:\/\//.test(body.url)) {
      console.warn('[kiddo audio] tts failed', reply.status, code)
      return { status: 'error' }
    }
    const expiresIn = typeof body.expiresIn === 'number' ? body.expiresIn : 0
    urls.set(id, { url: body.url, expiresAt: now() + expiresIn * 1000 })
    return { status: 'ok', url: body.url }
  } catch (error) {
    console.warn('[kiddo audio] tts failed', error)
    return { status: 'error' }
  }
}

// Signed URLs belong to the signed-in account: another account (or none) starts empty.
useParentStore.subscribe((state, previous) => {
  if (state.session !== previous.session) clearRemoteTts()
})

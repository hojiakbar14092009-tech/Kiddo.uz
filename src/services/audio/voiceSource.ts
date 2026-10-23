import type { Language } from '@/content/languages'
import { isSupabaseConfigured } from '@/services/supabase/config'
import { useParentStore } from '@/store/parentStore'
import { callEdgeFunction, edgeError, refreshSubscriptionSoon } from './edgeFunctions'
import { publicClipUrl, voicePrivateFlag } from './voicePaths'

/*
 * Where a recorded clip is played from (docs/architecture/audio-security.md).
 * public  – the clip in the build, /audio/voice/<lang>/<key>.mp3 (default).
 * private – cloud mode and VITE_VOICE_PRIVATE=true: a short-lived signed URL
 *           from the `voice-url` Edge Function, which checks PRO on the server.
 * Signed URLs live in memory only (never localStorage, never the service
 * worker cache) and are dropped 30 s before they expire.
 */

export type VoiceMode = 'public' | 'private'

/**
 * ok – a URL per key (keys the server has no clip for are left out);
 * locked – the server says the account is not PRO; error – anything else.
 */
export type ClipResolution =
  { status: 'ok'; urls: Record<string, string> } | { status: 'locked' } | { status: 'error' }

/** The contract allows 1–20 keys per call. */
export const MAX_KEYS_PER_CALL = 20
/** A signed URL is not used in its last 30 seconds (a clip must still load). */
export const EXPIRY_MARGIN_MS = 30_000

const KEY_PATTERN = /^[0-9a-f]{8}$/

export function voiceMode(): VoiceMode {
  return isSupabaseConfigured &&
    voicePrivateFlag() &&
    useParentStore.getState().session?.mode === 'cloud'
    ? 'private'
    : 'public'
}

interface Signed {
  url: string
  expiresAt: number
}

const signed = new Map<string, Signed>()

const fullKey = (language: Language, key: string) => `${language}/${key}`

function cached(id: string, now: number): string | null {
  const entry = signed.get(id)
  if (!entry) return null
  if (now < entry.expiresAt - EXPIRY_MARGIN_MS) return entry.url
  signed.delete(id)
  return null
}

/** Drops every signed URL (sign-out, another account, tests). */
export function clearVoiceUrls(): void {
  signed.clear()
}

interface VoiceUrlReply {
  urls?: Record<string, unknown>
  expiresIn?: unknown
}

async function fetchSigned(ids: string[], now: () => number): Promise<'ok' | 'locked' | 'error'> {
  try {
    const reply = await callEdgeFunction('voice-url', { keys: ids })
    if (!reply) return 'error'
    if (reply.status === 403 && edgeError(reply) === 'not_pro') return 'locked'
    if (reply.status !== 200) {
      console.warn('[kiddo audio] voice-url failed', reply.status, edgeError(reply))
      return 'error'
    }
    const body = (reply.body ?? {}) as VoiceUrlReply
    const expiresIn = typeof body.expiresIn === 'number' ? body.expiresIn : 0
    const expiresAt = now() + expiresIn * 1000
    for (const id of ids) {
      const url = body.urls?.[id]
      if (typeof url === 'string' && /^https?:\/\//.test(url)) signed.set(id, { url, expiresAt })
    }
    return 'ok'
  } catch (error) {
    console.warn('[kiddo audio] voice-url failed', error)
    return 'error'
  }
}

/**
 * Playable URLs for the clips of one speech request, by key. Public mode
 * answers with the build's paths; private mode asks the server once for every
 * key it has no fresh URL for (in calls of at most 20 keys).
 */
export async function resolveClips(
  language: Language,
  keys: readonly string[],
  now: () => number = Date.now,
): Promise<ClipResolution> {
  const unique = [...new Set(keys)].filter((key) => KEY_PATTERN.test(key))
  if (voiceMode() === 'public') {
    return {
      status: 'ok',
      urls: Object.fromEntries(unique.map((key) => [key, publicClipUrl(language, key)])),
    }
  }
  const wanted = unique.filter((key) => cached(fullKey(language, key), now()) === null)
  for (let start = 0; start < wanted.length; start += MAX_KEYS_PER_CALL) {
    const batch = wanted
      .slice(start, start + MAX_KEYS_PER_CALL)
      .map((key) => fullKey(language, key))
    const result = await fetchSigned(batch, now)
    if (result === 'locked') {
      // The device thought it was PRO: ask the server what the account really has.
      clearVoiceUrls()
      refreshSubscriptionSoon()
      return { status: 'locked' }
    }
    if (result === 'error') return { status: 'error' }
  }
  const urls: Record<string, string> = {}
  for (const key of unique) {
    const url = cached(fullKey(language, key), now())
    if (url) urls[key] = url
  }
  return { status: 'ok', urls }
}

// Signed URLs belong to the signed-in account: another account (or none) starts empty.
useParentStore.subscribe((state, previous) => {
  if (state.session !== previous.session) clearVoiceUrls()
})

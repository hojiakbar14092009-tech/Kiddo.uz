import type { Language } from '@/content/languages'
import voiceConfig from './voiceConfig.json'

/**
 * Where voice comes from: the site itself on the web (''), the live site in the native app,
 * whose package carries no clips (VITE_VOICE_BASE, set by `npm run build:native`).
 */
export const VOICE_BASE: string = import.meta.env.VITE_VOICE_BASE ?? ''

/** A voice role of voiceConfig.json: the narrator, or a child's voice. */
export type VoiceRole = keyof typeof voiceConfig

/**
 * Recorded clips are version 0 of a role's voice. Once a role's voice or settings change
 * (its `version` goes up), its old recordings no longer match and the live voice speaks instead.
 */
export const recordedVoiceIsCurrent = (role: VoiceRole) => voiceConfig[role].version === 0

/** Where a recorded clip lives in a public build: `/audio/voice/<lang>/<key>.mp3`. */
export function publicClipUrl(language: Language, key: string): string {
  return `${VOICE_BASE}/audio/voice/${language}/${key}.mp3`
}

/**
 * The live voice of one app sentence (server/tts.ts). The URL is the cache key: text, language,
 * voice role and the role's version, so the CDN and the device keep each answer for good.
 */
export function liveVoiceUrl(
  language: Language,
  text: string,
  role: VoiceRole = 'narrator',
): string {
  const version = voiceConfig[role].version
  return `${VOICE_BASE}/api/tts?lang=${language}&role=${role}&v=${version}&text=${encodeURIComponent(text)}`
}

/** Build flag: clips come from the private bucket, not the site (see docs/architecture/audio-security.md). */
export function voicePrivateFlag(): boolean {
  return import.meta.env.VITE_VOICE_PRIVATE === 'true'
}

/** The service worker's runtime cache for public clips (voiceBuild.ts). */
export const PUBLIC_VOICE_CACHE = 'kiddo-voice'

/**
 * A private build must not keep serving clips an earlier public build cached
 * on this device: the old `kiddo-voice` cache is deleted on startup. Device
 * mode in a private build therefore has no recorded voice (intended, see
 * docs/architecture/audio-security.md). Never throws.
 */
export async function dropPublicVoiceCache(isPrivate = voicePrivateFlag()): Promise<boolean> {
  if (!isPrivate) return false
  try {
    if (typeof caches === 'undefined') return false
    return await caches.delete(PUBLIC_VOICE_CACHE)
  } catch {
    return false
  }
}

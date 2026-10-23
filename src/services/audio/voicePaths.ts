import type { Language } from '@/content/languages'

/** Where a recorded clip lives in a public build: `/audio/voice/<lang>/<key>.mp3`. */
export function publicClipUrl(language: Language, key: string): string {
  return `/audio/voice/${language}/${key}.mp3`
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

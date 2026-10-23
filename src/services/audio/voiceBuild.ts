/*
 * Build settings for the voice clips (used by vite.config.ts; pure, so unit
 * tests can check them). See docs/architecture/audio-security.md.
 */

/** The build flag, from Vite's env (`VITE_VOICE_PRIVATE=true`). */
export function isVoicePrivateBuild(env: Record<string, string | undefined>): boolean {
  return env.VITE_VOICE_PRIVATE === 'true'
}

/** Clips inside `dist` (public mode only); a private build removes this folder. */
export const VOICE_DIST_DIR = 'audio/voice'

/** Never precached in either mode (several MB); the private build has none to precache. */
export const VOICE_GLOB_IGNORES = ['audio/voice/**']

/**
 * Service worker runtime cache for clips. Public mode keeps them after the
 * first play (offline); private mode has no rule at all, so short-lived
 * signed URLs are never stored by the service worker.
 */
export function voiceRuntimeCaching(voicePrivate: boolean) {
  if (voicePrivate) return []
  return [
    {
      urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith('/audio/voice/'),
      handler: 'CacheFirst' as const,
      options: {
        cacheName: 'kiddo-voice', // = PUBLIC_VOICE_CACHE in voicePaths.ts
        expiration: { maxEntries: 8000 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
  ]
}

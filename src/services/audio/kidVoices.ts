import type { Language } from '@/content/languages'

/*
 * Children's voices (ElevenLabs, a girl and a boy): the sentences recorded in a
 * child's voice so far, played to a girl in the girl's voice and to a boy in the
 * boy's. Everything else keeps the standard recordings, so the app grows into
 * the children's voices clip by clip as credits allow (scripts/voices/kid_voices.py).
 *
 * The clips live inside the public voice folder (/audio/voice/kid/…), so the
 * private build removes them with the rest and the service worker caches them
 * like any clip; in private voice mode the standard clips are used.
 */

export const KID_VOICES = ['girl', 'boy'] as const
export type KidVoice = (typeof KID_VOICES)[number]

type KidManifest = Record<KidVoice, Partial<Record<Language, readonly string[]>>>

let manifest: Promise<Record<KidVoice, Record<Language, ReadonlySet<string>>>> | null = null

/** Which sentences each child's voice has, loaded once on the first word spoken. */
export function loadKidManifest() {
  manifest ??= import('./kidVoiceManifest.json').then(({ default: data }) => {
    const lists = data as unknown as KidManifest
    const sets = (voice: KidVoice) => ({
      uz: new Set(lists[voice]?.uz ?? []),
      ru: new Set(lists[voice]?.ru ?? []),
      en: new Set(lists[voice]?.en ?? []),
    })
    return { girl: sets('girl'), boy: sets('boy') }
  })
  return manifest
}

export function kidClipUrl(voice: KidVoice, language: Language, key: string): string {
  return `/audio/voice/kid/${voice}/${language}/${key}.mp3`
}

/** The child's voice for a child's gender (none when it is not known). */
export function kidVoiceFor(gender: string | undefined | null): KidVoice | null {
  return gender === 'girl' || gender === 'boy' ? gender : null
}

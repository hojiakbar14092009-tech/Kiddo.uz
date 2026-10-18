import type { Language } from '@/content/languages'

export type VoiceKind = 'letters' | 'words' | 'numbers' | 'phrases'

export interface VoiceClip {
  kind: VoiceKind
  /** Letter/number id, or a phrase key such as `try-again`. */
  id: string
}

/**
 * Recorded voice files that ship with the app, per language and kind.
 * Add an id here once its file exists at `public/audio/{language}/{kind}/{id}.mp3`;
 * anything not listed is spoken with the device voice instead.
 */
const RECORDED: Record<Language, Record<VoiceKind, readonly string[]>> = {
  uz: { letters: [], words: [], numbers: [], phrases: [] },
  ru: { letters: [], words: [], numbers: [], phrases: [] },
  en: { letters: [], words: [], numbers: [], phrases: [] },
}

export function recordedClipUrl(language: Language, clip: VoiceClip): string | null {
  return RECORDED[language][clip.kind].includes(clip.id)
    ? `/audio/${language}/${clip.kind}/${clip.id}.mp3`
    : null
}

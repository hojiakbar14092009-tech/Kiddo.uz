import type { Language } from '@/content/languages'
import { phraseKey, splitSentences, withoutName } from './phrases'

export type VoiceKind = 'letters' | 'words' | 'numbers' | 'phrases'

/** Kept for callers that name what they say; clips are found by their text. */
export interface VoiceClip {
  kind: VoiceKind
  id: string
}

type Manifest = Record<Language, readonly string[]>

let manifest: Promise<Record<Language, ReadonlySet<string>>> | null = null

/** The list of recorded sentences, loaded once on the first word spoken. */
function loadManifest() {
  manifest ??= import('./voiceManifest.json').then(({ default: data }) => {
    const lists = data as unknown as Manifest
    return {
      uz: new Set(lists.uz ?? []),
      ru: new Set(lists.ru ?? []),
      en: new Set(lists.en ?? []),
    }
  })
  return manifest
}

/** One piece of speech: a recorded clip, or a sentence for the device voice. */
export type SpeechPart = { kind: 'clip'; url: string } | { kind: 'tts'; text: string }

/**
 * Turns a text into recorded clips, sentence by sentence. A sentence with the
 * child’s name uses the clip recorded without it; anything not recorded falls
 * back to the device voice.
 */
export async function planSpeech(
  language: Language,
  text: string,
  childName?: string | null,
): Promise<SpeechPart[]> {
  const recorded = (await loadManifest())[language]
  return splitSentences(text).map((sentence): SpeechPart => {
    for (const candidate of [sentence, withoutName(sentence, childName)]) {
      if (!candidate) continue
      const key = phraseKey(language, candidate)
      if (recorded.has(key)) return { kind: 'clip', url: `/audio/voice/${language}/${key}.mp3` }
    }
    return { kind: 'tts', text: sentence }
  })
}

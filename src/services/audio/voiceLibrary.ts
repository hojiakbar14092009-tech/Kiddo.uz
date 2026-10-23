import type { Language } from '@/content/languages'
import { phraseKey, remoteSafeText, splitSentences, withoutName } from './phrases'
import { publicClipUrl } from './voicePaths'

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

/**
 * One piece of speech: a recorded clip, or a sentence for the device voice.
 * `url` is the clip's public path; in private voice mode the player asks
 * `voiceSource` for a signed URL by `language` + `key` instead.
 * A `tts` part's `remoteText` is the only text that may go to the server
 * voice: the sentence without the child's name, or null when it may not leave
 * the device at all (`remoteSafeText`). `text` is for the device voice only.
 */
export type SpeechPart =
  | { kind: 'clip'; url: string; language: Language; key: string }
  | { kind: 'tts'; text: string; remoteText: string | null }

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
      if (recorded.has(key)) {
        return { kind: 'clip', url: publicClipUrl(language, key), language, key }
      }
    }
    return { kind: 'tts', text: sentence, remoteText: remoteSafeText(sentence, childName) }
  })
}

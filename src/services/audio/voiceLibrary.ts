import type { Language } from '@/content/languages'
import { phraseKey, remoteSafeText, splitSentences, withoutName } from './phrases'
import { kidClipUrl, loadKidManifest, type KidVoice } from './kidVoices'
import { publicClipUrl } from './voicePaths'
import { PIECE_PAUSE_MS, piecesOf } from './pieces'

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
  | {
      kind: 'clip'
      url: string
      language: Language
      key: string
      /** A short quiet after it: the pieces of one sentence (pieces.ts). */
      pauseAfterMs?: number
    }
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
  /** The child's own voice (girl or boy) when its recording exists; public mode only. */
  kidVoice?: KidVoice | null,
): Promise<SpeechPart[]> {
  const recorded = (await loadManifest())[language]
  const kid = kidVoice ? (await loadKidManifest())[kidVoice][language] : null
  return splitSentences(text).flatMap((sentence): SpeechPart[] => {
    const candidates = [sentence, withoutName(sentence, childName)].filter(
      (candidate): candidate is string => Boolean(candidate),
    )
    // the child's voice first: the whole sentence, or its pieces (numbers, lists)
    if (kidVoice && kid) {
      for (const candidate of candidates) {
        const key = phraseKey(language, candidate)
        if (kid.has(key)) {
          return [{ kind: 'clip', url: kidClipUrl(kidVoice, language, key), language, key }]
        }
      }
      for (const candidate of candidates) {
        const pieces = piecesOf(candidate, language, (piece) => kid.has(phraseKey(language, piece)))
        if (!pieces) continue
        return pieces.map((piece, index) => {
          const key = phraseKey(language, piece)
          return {
            kind: 'clip',
            url: kidClipUrl(kidVoice, language, key),
            language,
            key,
            ...(index < pieces.length - 1 ? { pauseAfterMs: PIECE_PAUSE_MS } : {}),
          }
        })
      }
    }
    for (const candidate of candidates) {
      const key = phraseKey(language, candidate)
      if (recorded.has(key)) {
        return [{ kind: 'clip', url: publicClipUrl(language, key), language, key }]
      }
    }
    return [{ kind: 'tts', text: sentence, remoteText: remoteSafeText(sentence, childName) }]
  })
}

import { LANGUAGE_INFO, type Language } from '@/content/languages'

export interface SpeakOptions {
  language: Language
  /** Overrides the default child-friendly pitch (1.1). */
  pitch?: number
  /** Overrides the default slow, clear rate (0.75). */
  rate?: number
  /** Overrides the locale, e.g. to say “Yahoooo!” with an English voice. */
  locale?: string
  /**
   * For text with the child's name: the same words without it (null when the
   * sentence cannot be said without the name). A device voice that is not
   * local (it runs on its maker's servers, e.g. some Chrome "Google" voices)
   * gets only this version, or stays silent: the name never leaves the device.
   */
  remoteText?: string | null
  /** 0–1; defaults to full volume. */
  volume?: number
}

const VOICE_WAIT_MS = 1200

function getSynth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
    ? window.speechSynthesis
    : null
}

/** Voices load asynchronously on most browsers (notably Safari on iPad). */
function loadVoices(synth: SpeechSynthesis): Promise<SpeechSynthesisVoice[]> {
  const voices = synth.getVoices()
  if (voices.length > 0) return Promise.resolve(voices)

  return new Promise((resolve) => {
    const done = () => {
      synth.removeEventListener('voiceschanged', done)
      clearTimeout(timer)
      resolve(synth.getVoices())
    }
    const timer = setTimeout(done, VOICE_WAIT_MS)
    synth.addEventListener('voiceschanged', done)
  })
}

function pickVoice(voices: SpeechSynthesisVoice[], locale: string) {
  const prefix = locale.slice(0, 2).toLowerCase()
  const matches = voices.filter((voice) => voice.lang.toLowerCase().startsWith(prefix))
  return (
    matches.find(
      (voice) => voice.lang.toLowerCase() === locale.toLowerCase() && voice.localService,
    ) ??
    matches.find((voice) => voice.lang.toLowerCase() === locale.toLowerCase()) ??
    matches[0] ??
    null
  )
}

/**
 * Thin wrapper over the Web Speech API. It is the fallback voice until recorded
 * audio files are added. A language without an installed voice (often Uzbek)
 * stays silent rather than being read with the wrong pronunciation.
 */
export const speech = {
  isSupported(): boolean {
    return getSynth() !== null
  },

  async hasVoice(language: Language): Promise<boolean> {
    const synth = getSynth()
    if (!synth) return false
    return pickVoice(await loadVoices(synth), LANGUAGE_INFO[language].locale) !== null
  },

  /**
   * iOS/iPadOS only allow speech that starts inside a user gesture. Speaking a
   * silent utterance on the first tap unlocks speech for the rest of the visit.
   */
  unlock(): void {
    const synth = getSynth()
    if (!synth) return
    const utterance = new SpeechSynthesisUtterance(' ')
    utterance.volume = 0
    synth.speak(utterance)
  },

  cancel(): void {
    getSynth()?.cancel()
  },

  /**
   * Speaks the phrases one after another; resolves when all are done. Resolves
   * `false` without a sound when there is no speech engine or no voice for the
   * locale, so the caller never counts silence as spoken.
   */
  async say(phrases: string | readonly string[], options: SpeakOptions): Promise<boolean> {
    const synth = getSynth()
    if (!synth) return false

    const locale = options.locale ?? LANGUAGE_INFO[options.language].locale
    const voice = pickVoice(await loadVoices(synth), locale)
    if (!voice) return false

    let list: readonly string[] = typeof phrases === 'string' ? [phrases] : phrases
    if (!voice.localService && options.remoteText !== undefined) {
      if (options.remoteText === null) return false
      list = [options.remoteText]
    }
    synth.cancel()

    await Promise.all(
      list.map(
        (text) =>
          new Promise<void>((resolve) => {
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.voice = voice
            utterance.lang = voice.lang
            utterance.pitch = options.pitch ?? 1.1
            utterance.rate = options.rate ?? 0.75
            utterance.volume = options.volume ?? 1
            utterance.onend = () => resolve()
            utterance.onerror = () => resolve()
            synth.speak(utterance)
          }),
      ),
    )
    return true
  },
}

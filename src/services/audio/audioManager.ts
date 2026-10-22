import { Howl } from 'howler'
import type { Language } from '@/content/languages'
import { useSettingsStore } from '@/store/settingsStore'
import { canUse } from '@/store/subscriptionStore'
import { speech, type SpeakOptions } from './speech'
import { useFamilyStore } from '@/store/familyStore'
import { planSpeech, type VoiceClip } from './voiceLibrary'

export type UiSound = 'click' | 'success' | 'soft'

const UI_SOUND_URLS: Record<UiSound, string> = {
  click: '/audio/ui/ui_click.mp3',
  success: '/audio/ui/ui_success.mp3',
  soft: '/audio/ui/ui_soft.mp3',
}

/** One spoken item: a recorded clip if we have it, otherwise text for the device voice. */
export interface Utterance {
  text: string
  clip?: VoiceClip
}

export type VoiceOptions = Omit<SpeakOptions, 'volume'> & { language: Language }

export interface SpeakFlags {
  requirePro?: boolean
  /**
   * Only recorded clips: a sentence without a recording stays silent (the
   * text is on screen) instead of using the device voice, which may not speak
   * this language.
   */
  clipsOnly?: boolean
}

/** What a speaker button shows: nothing, getting ready, talking, or a short error. */
export type SpeechStatus = 'idle' | 'loading' | 'speaking' | 'error'

/**
 * How a speech request went:
 * done – it was spoken; locked – not PRO; muted – volume is 0;
 * missing – no recording for it; error – the sound could not play;
 * cancelled – a newer speech or stop() replaced it.
 */
export type SpeakOutcome = 'done' | 'locked' | 'muted' | 'missing' | 'error' | 'cancelled'

const ERROR_MS = 2500
/** A clip that has not started after this long counts as failed. */
const LOAD_TIMEOUT_MS = 10_000

function currentVolume(): number {
  return useSettingsStore.getState().volume
}

/**
 * The central audio gate.
 * - Interface sounds (click, success, soft) play in every tier.
 * - Voice (letters, words, numbers, mascot speech) plays **only on PRO**.
 *   On Free, `speak` stays silent and returns `false`, so the caller can show
 *   the mascot’s thought bubble instead.
 */
class AudioManager {
  private readonly uiSounds = new Map<UiSound, Howl>()

  play(sound: UiSound): void {
    const volume = currentVolume()
    if (volume <= 0) return
    let howl = this.uiSounds.get(sound)
    if (!howl) {
      howl = new Howl({ src: [UI_SOUND_URLS[sound]], preload: true })
      this.uiSounds.set(sound, howl)
    }
    howl.volume(volume)
    howl.play()
  }

  canSpeak(): boolean {
    return canUse('audio')
  }

  /** Where speech is now: the speaker button and the talking mascot follow this. */
  getStatus(): SpeechStatus {
    return this.status
  }

  subscribe(listener: (status: SpeechStatus) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Speaks the items in order. Resolves `false` without a sound on Free. */
  async speak(
    items: readonly Utterance[],
    options: VoiceOptions,
    flags: SpeakFlags = {},
  ): Promise<boolean> {
    return (await this.say(items, options, flags)) !== 'locked'
  }

  /**
   * Speaks the items in order and says how it went. Only one speech at a
   * time: a new call (or `stopSpeech`) cuts the one before it off at once, so
   * pressing a button again restarts cleanly instead of adding a second voice.
   */
  async say(
    items: readonly Utterance[],
    options: VoiceOptions,
    { requirePro = true, clipsOnly = false }: SpeakFlags = {},
  ): Promise<SpeakOutcome> {
    // The PRO check runs right before any sound, not only when the button is drawn.
    if (requirePro && !this.canSpeak()) return 'locked'
    const volume = currentVolume()
    if (volume <= 0) return 'muted'

    const family = useFamilyStore.getState()
    const name = family.children.find((child) => child.id === family.activeChildId)?.name
    const generation = this.cancelCurrent()
    this.setStatus('loading')
    let played = 0
    let missing = 0
    let failed = 0
    try {
      for (const item of items) {
        if (!item.text.trim()) continue
        // An English cheer (“Yahoooo!”) in any language uses the English recordings.
        const clipLanguage = options.locale?.startsWith('en') ? 'en' : options.language
        const parts = await planSpeech(clipLanguage, item.text, name)
        for (const part of parts) {
          // A newer phrase or stop() wins: the rest of this one is dropped.
          if (generation !== this.generation) return 'cancelled'
          if (part.kind === 'clip') {
            const result = await this.playClip(part.url, volume, generation)
            if (result === 'error') failed += 1
            else if (result === 'stopped') return 'cancelled'
            else played += 1
          } else if (clipsOnly) {
            missing += 1
          } else {
            this.setStatus('speaking')
            await speech.say(part.text, { ...options, volume })
            played += 1
          }
        }
      }
    } catch (error) {
      console.warn('[kiddo audio] speech failed', error)
      failed += 1
    }
    if (generation !== this.generation) return 'cancelled'
    if (missing > 0 && played > 0) {
      console.warn(`[kiddo audio] ${missing} sentence(s) without a recording were skipped`)
    }
    const outcome: SpeakOutcome =
      failed > 0 && played === 0 ? 'error' : missing > 0 && played === 0 ? 'missing' : 'done'
    if (outcome === 'done') this.setStatus('idle')
    else this.showError(generation, outcome, items)
    return outcome
  }

  stopSpeech(): void {
    this.cancelCurrent()
    this.setStatus('idle')
  }

  /** Which speech request is the latest (each `say` and `stopSpeech` makes a new one). */
  currentSpeech(): number {
    return this.generation
  }

  private generation = 0
  private current: Howl | null = null
  private finishCurrent: (() => void) | null = null
  private status: SpeechStatus = 'idle'
  private readonly listeners = new Set<(status: SpeechStatus) => void>()
  private errorTimer: ReturnType<typeof setTimeout> | undefined

  private cancelCurrent(): number {
    this.generation += 1
    clearTimeout(this.errorTimer)
    const howl = this.current
    const finish = this.finishCurrent
    this.current = null
    this.finishCurrent = null
    howl?.stop?.()
    // a clip that had not loaded yet may never report the stop: end it here
    finish?.()
    speech.cancel()
    return this.generation
  }

  private setStatus(status: SpeechStatus) {
    if (status === this.status) return
    this.status = status
    this.listeners.forEach((listener) => listener(status))
  }

  /** A short error state on the button, then back to idle; the details go to the console. */
  private showError(generation: number, outcome: SpeakOutcome, items: readonly Utterance[]) {
    console.warn(`[kiddo audio] ${outcome}:`, items.map((item) => item.text).join(' | '))
    this.setStatus('error')
    this.errorTimer = setTimeout(() => {
      if (generation === this.generation) this.setStatus('idle')
    }, ERROR_MS)
  }

  private playClip(
    src: string,
    volume: number,
    generation: number,
  ): Promise<'ended' | 'stopped' | 'error'> {
    return new Promise((resolve) => {
      let settled = false
      // a clip that never loads (a stalled network, a locked audio device) must not spin forever
      const timeout = setTimeout(() => finish('error', 'timed out'), LOAD_TIMEOUT_MS)
      const finish = (result: 'ended' | 'stopped' | 'error', error?: unknown) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        if (result === 'error') console.warn('[kiddo audio] clip failed', src, error)
        if (this.current === howl) {
          this.current = null
          this.finishCurrent = null
        }
        // played clips are let go, so memory does not grow with every sentence
        queueMicrotask(() => howl.unload?.())
        resolve(result)
      }
      const howl: Howl = new Howl({
        src: [src],
        volume,
        onplay: () => {
          clearTimeout(timeout)
          if (generation === this.generation) this.setStatus('speaking')
        },
        onend: () => finish('ended'),
        onstop: () => finish('stopped'),
        onloaderror: (_id: unknown, error: unknown) => finish('error', error),
        onplayerror: (_id: unknown, error: unknown) => finish('error', error),
      })
      this.current = howl
      this.finishCurrent = () => finish('stopped')
      howl.play()
      // stopped before it began (a newer speech came first): end this one now
      if (generation !== this.generation) finish('stopped')
    })
  }
}

export const audioManager = new AudioManager()

// Whatever is being said stops when the language or the child changes.
useSettingsStore.subscribe((state, previous) => {
  if (state.language !== previous.language) audioManager.stopSpeech()
})
useFamilyStore.subscribe((state, previous) => {
  if (state.activeChildId !== previous.activeChildId) audioManager.stopSpeech()
})

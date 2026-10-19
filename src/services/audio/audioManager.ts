import { Howl } from 'howler'
import type { Language } from '@/content/languages'
import { useSettingsStore } from '@/store/settingsStore'
import { getIsPro } from '@/store/subscriptionStore'
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
    return getIsPro()
  }

  /** Speaks the items in order. Resolves `false` without a sound on Free. */
  async speak(
    items: readonly Utterance[],
    options: VoiceOptions,
    {
      requirePro = true,
      clipsOnly = false,
    }: {
      requirePro?: boolean
      /**
       * Only recorded clips: a sentence without a recording stays silent
       * (the text is on screen) instead of using the device voice, which may
       * not speak this language.
       */
      clipsOnly?: boolean
    } = {},
  ): Promise<boolean> {
    // The PRO check runs right before any sound, not only when the button is drawn.
    if (requirePro && !this.canSpeak()) return false
    const volume = currentVolume()
    if (volume <= 0) return true

    const family = useFamilyStore.getState()
    const name = family.children.find((child) => child.id === family.activeChildId)?.name
    const generation = ++this.generation
    this.current?.stop?.()
    for (const item of items) {
      // An English cheer (“Yahoooo!”) in any language uses the English recordings.
      const clipLanguage = options.locale?.startsWith('en') ? 'en' : options.language
      const parts = await planSpeech(clipLanguage, item.text, name)
      for (const part of parts) {
        // A newer phrase or stop() wins: the rest of this one is dropped.
        if (generation !== this.generation) return true
        if (part.kind === 'clip') await this.playClip(part.url, volume)
        else if (!clipsOnly) await speech.say(part.text, { ...options, volume })
      }
    }
    return true
  }

  stopSpeech(): void {
    this.generation += 1
    this.current?.stop?.()
    this.current = null
    speech.cancel()
  }

  private generation = 0
  private current: Howl | null = null

  private playClip(src: string, volume: number): Promise<void> {
    return new Promise((resolve) => {
      const howl = new Howl({
        src: [src],
        volume,
        onend: () => resolve(),
        onstop: () => resolve(),
        onloaderror: () => resolve(),
        onplayerror: () => resolve(),
      })
      this.current?.stop?.()
      this.current = howl
      howl.play()
    })
  }
}

export const audioManager = new AudioManager()

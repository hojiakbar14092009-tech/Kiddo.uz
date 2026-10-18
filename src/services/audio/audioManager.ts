import { Howl } from 'howler'
import type { Language } from '@/content/languages'
import { useSettingsStore } from '@/store/settingsStore'
import { getIsPro } from '@/store/subscriptionStore'
import { speech, type SpeakOptions } from './speech'
import { recordedClipUrl, type VoiceClip } from './voiceLibrary'

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

function playHowl(src: string, volume: number): Promise<void> {
  return new Promise((resolve) => {
    const howl = new Howl({
      src: [src],
      volume,
      onend: () => resolve(),
      onloaderror: () => resolve(),
      onplayerror: () => resolve(),
    })
    howl.play()
  })
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
  async speak(items: readonly Utterance[], options: VoiceOptions): Promise<boolean> {
    if (!this.canSpeak()) return false
    const volume = currentVolume()
    if (volume <= 0) return true

    for (const item of items) {
      const url = item.clip ? recordedClipUrl(options.language, item.clip) : null
      if (url) await playHowl(url, volume)
      else await speech.say(item.text, { ...options, volume })
    }
    return true
  }

  stopSpeech(): void {
    speech.cancel()
  }
}

export const audioManager = new AudioManager()

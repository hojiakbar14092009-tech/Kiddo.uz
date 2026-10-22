import { useCallback, useEffect, useState } from 'react'
import type { Language } from '@/content/languages'
import { audioManager, type SpeakOutcome } from '@/services/audio/audioManager'
import { useSpeechStatus } from '@/services/audio/useSpeechStatus'
import { useSettingsStore } from '@/store/settingsStore'
import { canUse, useCanUse } from '@/domain/entitlements'

/*
 * Voice in the new sections:
 * - only with the audio feature (PRO), checked again right before every sound,
 * - never on its own: the child presses the speaker button to hear the
 *   current question; after that first press the mascot also says its short
 *   reactions to the child's answers (until the page is reloaded),
 * - only recorded sentences in the chosen language (no device voice standing
 *   in for a language it may not speak), the text always stays on screen,
 * - one voice at a time (audioManager), and it stops when the question, the
 *   page, the profile or the language changes.
 */

/** The child has pressed the speaker in this visit, so reactions may be spoken too. */
let voiceOn = false
const listeners = new Set<(on: boolean) => void>()

export function setLearnVoiceOn(on: boolean) {
  voiceOn = on
  listeners.forEach((listener) => listener(on))
}

export function isLearnVoiceOn(): boolean {
  return voiceOn
}

/** Reads the lines from recordings, in this language. */
export function speakLines(lines: readonly string[], language: Language): Promise<SpeakOutcome> {
  if (!canUse('audio')) return Promise.resolve('locked')
  return audioManager.say(
    lines.filter(Boolean).map((text) => ({ text })),
    { language },
    { requirePro: true, clipsOnly: true },
  )
}

export function useLearnVoice() {
  const isPro = useCanUse('audio')
  const language = useSettingsStore((state) => state.language) ?? 'uz'
  const volume = useSettingsStore((state) => state.volume)
  const status = useSpeechStatus()
  const [on, setOn] = useState(voiceOn)

  useEffect(() => {
    const listener = (value: boolean) => setOn(value)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  const stop = useCallback(() => audioManager.stopSpeech(), [])

  /**
   * Says the lines if the child has turned the voice on (or `force` for a
   * button the child just pressed), and tells how it went.
   */
  const speak = useCallback(
    async (
      lines: readonly string[],
      { force = false }: { force?: boolean } = {},
    ): Promise<SpeakOutcome | 'off'> => {
      if (!canUse('audio')) return 'locked'
      if (!voiceOn && !force) return 'off'
      // the language at the moment of speaking, never an older one
      const current = useSettingsStore.getState().language ?? 'uz'
      return speakLines(lines, current)
    },
    [],
  )

  return {
    /** PRO and sound not muted. */
    available: isPro && volume > 0,
    isPro,
    on: on && isPro,
    setOn: setLearnVoiceOn,
    speak,
    stop,
    speaking: status === 'speaking',
    status,
    language,
  }
}

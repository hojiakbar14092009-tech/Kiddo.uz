import { useCallback, useEffect, useRef, useState } from 'react'
import type { Language } from '@/content/languages'
import { audioManager } from '@/services/audio/audioManager'
import { useFamilyStore } from '@/store/familyStore'
import { useSettingsStore } from '@/store/settingsStore'
import { getIsPro, useIsPro } from '@/store/subscriptionStore'

/*
 * Voice in the new sections:
 * - only on an active PRO (checked again right before every sound),
 * - never on its own: it starts when the child turns the voice on in a section,
 * - only recorded sentences in the chosen language (no device voice standing
 *   in for a language it may not speak), the text always stays on screen,
 * - one voice at a time, and it stops when the page, profile or language changes.
 */

/** The child switched the voice on in the new sections (PRO only; off by default). */
let voiceOn = false
const listeners = new Set<(on: boolean) => void>()

export function setLearnVoiceOn(on: boolean) {
  voiceOn = on
  listeners.forEach((listener) => listener(on))
}

export function isLearnVoiceOn(): boolean {
  return voiceOn
}

export async function speakLines(lines: readonly string[], language: Language): Promise<boolean> {
  if (!getIsPro()) return false
  return audioManager.speak(
    lines.filter(Boolean).map((text) => ({ text })),
    { language },
    { requirePro: true, clipsOnly: true },
  )
}

export function useLearnVoice() {
  const isPro = useIsPro()
  const language = useSettingsStore((state) => state.language) ?? 'uz'
  const activeChild = useFamilyStore((state) => state.activeChildId)
  const volume = useSettingsStore((state) => state.volume)
  const [on, setOn] = useState(voiceOn)
  const [speaking, setSpeaking] = useState(false)
  const run = useRef(0)

  useEffect(() => {
    const listener = (value: boolean) => setOn(value)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  // a new page, profile or language: whatever was being said stops
  useEffect(
    () => () => {
      run.current += 1
      audioManager.stopSpeech()
    },
    [language, activeChild],
  )

  const stop = useCallback(() => {
    run.current += 1
    audioManager.stopSpeech()
    setSpeaking(false)
  }, [])

  /** Says the lines if the voice is on (or `force` for a button the child pressed). */
  const speak = useCallback(
    async (lines: readonly string[], { force = false }: { force?: boolean } = {}) => {
      if (!getIsPro() || (!voiceOn && !force)) return false
      const mine = ++run.current
      setSpeaking(true)
      const spoken = await speakLines(lines, language)
      if (mine === run.current) setSpeaking(false)
      return spoken
    },
    [language],
  )

  return {
    /** PRO and sound not muted. */
    available: isPro && volume > 0,
    isPro,
    on: on && isPro,
    setOn: setLearnVoiceOn,
    speak,
    stop,
    speaking,
    language,
  }
}

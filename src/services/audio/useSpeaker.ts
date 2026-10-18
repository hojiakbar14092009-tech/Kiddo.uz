import { useCallback, useEffect, useRef, useState } from 'react'
import type { LetterEntry } from '@/content/alphabet'
import { useLanguage } from '@/store/settingsStore'
import { useIsPro } from '@/store/subscriptionStore'
import { audioManager, type Utterance } from './audioManager'

/**
 * Voice helpers bound to the child’s language. Voice is a PRO feature:
 * on Free every `say…` resolves `false` silently, and `canSpeak` is false,
 * so screens can show the mascot’s thought bubble instead.
 * `speaking` is true while a phrase plays (the mascot moves its mouth).
 */
export function useSpeaker() {
  const language = useLanguage()
  const canSpeak = useIsPro()
  const [speaking, setSpeaking] = useState(false)
  const latestRequest = useRef(0)

  useEffect(() => () => audioManager.stopSpeech(), [])

  const speak = useCallback(
    async (items: readonly Utterance[]): Promise<boolean> => {
      if (!audioManager.canSpeak()) return false
      const request = ++latestRequest.current
      setSpeaking(true)
      try {
        return await audioManager.speak(items, { language })
      } finally {
        if (request === latestRequest.current) setSpeaking(false)
      }
    },
    [language],
  )

  /** “B … banan”: the letter first, then its word. */
  const sayLetter = useCallback(
    (letter: LetterEntry) =>
      speak([
        { text: letter.spoken, clip: { kind: 'letters', id: letter.id } },
        { text: letter.word, clip: { kind: 'words', id: letter.id } },
      ]),
    [speak],
  )

  const sayText = useCallback((text: string) => speak([{ text }]), [speak])
  const stop = useCallback(() => audioManager.stopSpeech(), [])

  return { canSpeak, speaking, speak, sayLetter, sayText, stop }
}

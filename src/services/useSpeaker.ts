import { useCallback, useEffect, useRef, useState } from 'react'
import type { LetterEntry } from '@/content/alphabet'
import { useLanguage } from '@/store/settingsStore'
import { speech } from './speech'

/**
 * Speech helpers bound to the child’s current language. `speaking` is true
 * while a phrase is playing (the mascot uses it to move its mouth).
 * Stops talking when the screen unmounts.
 */
export function useSpeaker() {
  const language = useLanguage()
  const [speaking, setSpeaking] = useState(false)
  const latestRequest = useRef(0)

  useEffect(() => () => speech.cancel(), [])

  const speak = useCallback(
    async (phrases: string | readonly string[]) => {
      const request = ++latestRequest.current
      setSpeaking(true)
      try {
        await speech.say(phrases, { language })
      } finally {
        if (request === latestRequest.current) setSpeaking(false)
      }
    },
    [language],
  )

  /** “B … banan”: the letter first, then its word. */
  const sayLetter = useCallback(
    (letter: LetterEntry) => speak([letter.spoken, letter.word]),
    [speak],
  )
  const sayLetterOnly = useCallback((letter: LetterEntry) => speak(letter.spoken), [speak])
  const sayText = useCallback((text: string) => speak(text), [speak])
  const stop = useCallback(() => speech.cancel(), [])

  return { speaking, sayLetter, sayLetterOnly, sayText, stop }
}

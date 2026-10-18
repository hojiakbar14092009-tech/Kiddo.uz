import { useEffect, useMemo } from 'react'
import type { LetterEntry } from '@/content/alphabet'
import { useSettingsStore } from '@/store/settingsStore'
import { speech } from './speech'

/** Speech helpers bound to the child’s current language. Stops talking on unmount. */
export function useSpeaker() {
  const language = useSettingsStore((state) => state.language) ?? 'uz'

  useEffect(() => () => speech.cancel(), [])

  return useMemo(
    () => ({
      /** “B … banan”: the letter first, then its word. */
      sayLetter: (letter: LetterEntry) => speech.say([letter.spoken, letter.word], { language }),
      sayLetterOnly: (letter: LetterEntry) => speech.say(letter.spoken, { language }),
      sayText: (text: string) => speech.say(text, { language }),
      stop: () => speech.cancel(),
    }),
    [language],
  )
}

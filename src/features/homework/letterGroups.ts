import type { Language } from '@/content/languages'
import type { LetterEntry } from '@/content/alphabet/types'

/*
 * Letter groups for letter homework (Phase 23): one tap picks a sensible set
 * instead of tapping letters one by one — the vowels, the letters the child
 * often mixes up, or the next new letters. Deterministic; always only letters
 * the chosen game can ask about, at most `max`.
 */

export type LetterGroup = 'vowels' | 'practice' | 'next'

const VOWELS: Record<Language, ReadonlySet<string>> = {
  uz: new Set(['A', 'E', 'I', 'O', 'U', 'Oʻ']),
  ru: new Set(['А', 'Е', 'Ё', 'И', 'О', 'У', 'Ы', 'Э', 'Ю', 'Я']),
  en: new Set(['A', 'E', 'I', 'O', 'U']),
}

export function letterGroup(
  group: LetterGroup,
  input: {
    language: Language
    /** Letters the chosen game can ask about, in alphabet order. */
    playable: readonly LetterEntry[]
    /** Letter ids the child has learned in this language. */
    learned: readonly string[]
    /** Letter ids the child often gets wrong, most first. */
    struggling: readonly string[]
    max: number
  },
): string[] {
  const playable = new Set(input.playable.map((letter) => letter.id))
  let ids: string[]
  if (group === 'vowels') {
    ids = input.playable
      .filter((letter) => VOWELS[input.language].has(letter.upper))
      .map((l) => l.id)
  } else if (group === 'practice') {
    ids = input.struggling.filter((id) => playable.has(id))
  } else {
    ids = input.playable.filter((letter) => !input.learned.includes(letter.id)).map((l) => l.id)
  }
  return ids.slice(0, input.max)
}

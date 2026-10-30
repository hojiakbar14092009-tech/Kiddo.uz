import type { LetterEntry } from '@/content/alphabet/types'

/**
 * A letter to tell `letters[index]` apart from: half an alphabet away, so never a
 * look-alike neighbour (Е/Ё, Ш/Щ), and never a mark that is not a letter shape (ʼ).
 */
export function decoyFor(letters: readonly LetterEntry[], index: number): LetterEntry {
  const shaped = (letter: LetterEntry) => /\p{L}/u.test(letter.upper)
  for (let step = Math.floor(letters.length / 2); step < letters.length; step += 1) {
    const candidate = letters[(index + step) % letters.length]!
    if (candidate.id !== letters[index]?.id && shaped(candidate)) return candidate
  }
  return letters[(index + 1) % letters.length]!
}

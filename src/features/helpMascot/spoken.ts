import type { Language } from '@/content/languages'
import { MATERIAL, spell } from './content'
import { COPY } from './copy'

/*
 * Every sentence this section can read aloud, per language (for the voice
 * recorder): built from the same copy, words and sums the screens use.
 */

function linesFor(language: Language): string[] {
  const copy = COPY[language]
  const lines = [
    copy.greet,
    copy.choose,
    copy.learnHint,
    copy.testHint,
    copy.findHelp,
    copy.notThis,
    copy.fixInitial,
    copy.fixSpelling,
    copy.fixSum,
    copy.fixInitialHelp,
    copy.fixSpellingHelp,
    copy.fixSumHelp,
    copy.spot,
    copy.spotHelp,
    copy.lineIsRight,
    copy.fixLine,
    copy.correct,
    copy.tryAgain,
  ]
  for (const item of MATERIAL[language].find) lines.push(item.ask, copy.thanks(item.name))
  for (const word of MATERIAL[language].words) {
    lines.push(
      copy.initialIs(spell(word.letters, language), word.letters[0]!),
      copy.spellingIs(spell(word.letters, language)),
    )
  }
  // every sum and difference up to 10 (the largest numbers used)
  for (let a = 0; a <= 10; a += 1) {
    for (let b = 1; b <= 10; b += 1) {
      if (a >= 1 && a + b <= 10) lines.push(copy.plusIs(a, b, a + b))
      if (b < a) lines.push(copy.minusIs(a, b, a - b))
    }
  }
  return [...new Set(lines)]
}

export const SPOKEN: Record<Language, readonly string[]> = {
  uz: linesFor('uz'),
  ru: linesFor('ru'),
  en: linesFor('en'),
}

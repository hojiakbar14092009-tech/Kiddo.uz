import type { Language } from '@/content/languages'
import { MATERIAL, wordDisplay } from './content'
import { COPY } from './copy'

/*
 * Every sentence this section can read aloud, per language (for the voice
 * recorder). Built from the same copy and word lists the screens use, so
 * every line the page speaks is here, word for word.
 */

function linesFor(language: Language): string[] {
  const copy = COPY[language]
  const material = MATERIAL[language]
  const lines = [
    copy.greet,
    copy.choose,
    copy.learnHint,
    copy.testHint,
    copy.pickLetter,
    copy.pickLetterHelp,
    copy.build,
    copy.buildHelp,
    copy.exampleGo,
    copy.wrongTile,
    copy.readWord,
    copy.readWordHelp,
    copy.readSentence,
    copy.readSentenceHelp,
    copy.missing,
    copy.missingHelp,
    copy.correct,
    copy.tryAgain,
  ]
  for (const word of material.initial) {
    const letter = word.letters[0]!
    lines.push(
      copy.pickPicture(letter),
      copy.pickPictureHelp(letter),
      copy.startsWith(wordDisplay(word, language), letter),
    )
  }
  for (const word of material.build) {
    lines.push(
      copy.exampleTitle(wordDisplay(word, language)),
      copy.built(wordDisplay(word, language)),
    )
  }
  for (const word of material.read) lines.push(copy.wordIs(wordDisplay(word, language)))
  for (const sentence of material.sentences) lines.push(copy.sentenceIs(sentence.text))
  return [...new Set(lines)]
}

export const SPOKEN: Record<Language, readonly string[]> = {
  uz: linesFor('uz'),
  ru: linesFor('ru'),
  en: linesFor('en'),
}

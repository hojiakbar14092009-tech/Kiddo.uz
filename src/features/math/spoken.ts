import type { Language } from '@/content/languages'
import { COPY, helpText, numberQuestion, pictureQuestion } from './content'
import { STAGES, factsFor, OBJECTS, type StageId } from './generators'

/*
 * Every sentence the Matematika section can read aloud (PRO, voice on),
 * written out in full for each language – every example, every object,
 * every number. The screen speaks only these exact strings, so a recording
 * can be made for each of them (scripts/voices/collect.ts).
 */

const ALL_STAGES: StageId[] = [...STAGES[4], ...STAGES[5], ...STAGES[6]].map((stage) => stage.id)

function linesFor(language: Language): string[] {
  const copy = COPY[language]
  const lines: string[] = [
    copy.chooseStage,
    copy.correct,
    copy.retry,
    copy.stageDone,
    copy.stageDoneText,
  ]
  for (const stage of ALL_STAGES) {
    lines.push(copy.explain[stage])
    for (const fact of factsFor(stage)) {
      lines.push(helpText(language, stage, fact))
      if (stage.startsWith('4-')) {
        for (const object of OBJECTS) lines.push(pictureQuestion(language, object, fact))
      } else {
        lines.push(numberQuestion(language, fact))
      }
    }
  }
  return [...new Set(lines)]
}

export const SPOKEN: Record<Language, readonly string[]> = {
  uz: linesFor('uz'),
  ru: linesFor('ru'),
  en: linesFor('en'),
}

/** True when the sentence has a place in the recordings list. */
export function isSpoken(language: Language, line: string): boolean {
  return SPOKEN[language].includes(line)
}

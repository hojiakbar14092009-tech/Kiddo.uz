import type { Language } from '@/content/languages'
import { taskPrompt } from './content'
import { taskPool } from './game'
import { GARDEN_UI } from './ui'

/**
 * Every sentence this section can read aloud, per language (for the voice
 * recorder): every task the game can ask at any age, the help steps and the
 * gentle "keep looking" after a different thing.
 */
function collect(language: Language): string[] {
  const ui = GARDEN_UI[language]
  const lines = new Set<string>()
  for (const level of [4, 5, 6] as const) {
    taskPool(level).forEach((task) => lines.add(taskPrompt(task, language)))
  }
  ;[
    ui.tapOne,
    ui.tapEach,
    ui.looksLike,
    ui.example,
    ui.wiggling,
    ui.notThis,
    ui.learnDone,
    ui.howToPlay,
  ].forEach((line) => lines.add(line))
  return [...lines]
}

export const SPOKEN: Record<Language, readonly string[]> = {
  uz: collect('uz'),
  ru: collect('ru'),
  en: collect('en'),
}

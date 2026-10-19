import type { Language } from '@/content/languages'
import { TALE_TEXT } from './content'

/**
 * Every sentence this section can read aloud, per language (for the voice
 * recorder): each scene's lines and task question (read with the "Read
 * aloud" button) and each end-of-tale question (its "Listen" button).
 */
function collect(language: Language): string[] {
  const lines = new Set<string>()
  for (const tale of Object.values(TALE_TEXT[language])) {
    for (const scene of tale.scenes) {
      scene.lines.forEach((line) => lines.add(line))
      if (scene.task) lines.add(scene.task.prompt)
    }
    tale.checks.forEach((check) => lines.add(check.prompt))
  }
  return [...lines]
}

export const SPOKEN: Record<Language, readonly string[]> = {
  uz: collect('uz'),
  ru: collect('ru'),
  en: collect('en'),
}

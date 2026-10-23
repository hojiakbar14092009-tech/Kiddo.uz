import type { Language } from '@/content/languages'
import { STORY_TEXT } from './content'

/**
 * Every sentence the stories can read aloud, per language (for the voice
 * recorder): each page's sentences ("Read to me"), each choice and each
 * question prompt (the speaker button).
 */
function collect(language: Language): string[] {
  const lines = new Set<string>()
  for (const story of Object.values(STORY_TEXT[language])) {
    for (const page of Object.values(story.pages)) page.forEach((line) => lines.add(line))
    Object.values(story.choices).forEach((choice) => lines.add(choice))
    Object.values(story.questions).forEach((question) => lines.add(question.prompt))
  }
  return [...lines]
}

export const SPOKEN: Record<Language, readonly string[]> = {
  uz: collect('uz'),
  ru: collect('ru'),
  en: collect('en'),
}

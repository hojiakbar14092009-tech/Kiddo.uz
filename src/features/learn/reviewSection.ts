import type { Language } from '@/content/languages'
import { weakSkills, type LearnChild, type LearnLanguage, type SectionId } from './learnStore'
import { LEARN_SECTIONS } from './sections'

/** Maths is the same in every language; the other sections keep a record per language. */
const LANGUAGE_FREE: readonly SectionId[] = ['math']

/**
 * The section with the most to practise again for this child (in the current
 * language), or null when nothing needs review.
 */
export function reviewSection(learn: LearnChild, language: Language): SectionId | null {
  let best: { id: SectionId; weight: number } | null = null
  for (const section of LEARN_SECTIONS) {
    const lang: LearnLanguage = LANGUAGE_FREE.includes(section.id) ? 'any' : language
    const weak = weakSkills(learn, section.id, lang)
    if (weak.length === 0) continue
    const weight = weak.reduce((sum, stat) => sum + stat.wrong + stat.helped, 0)
    if (!best || weight > best.weight) best = { id: section.id, weight }
  }
  return best?.id ?? null
}

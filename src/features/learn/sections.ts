import type { AgeLevel } from '@/features/age/ageLevel'
import type { SectionId } from './learnStore'

export interface LearnSection {
  id: SectionId
  path: string
  /** The 3D picture on its card (public/3d/<icon>.webp). */
  icon: string
  /** Youngest age it is open for (all six are open from 4, with age-matched content). */
  minLevel: AgeLevel
  /** Card colour, from the existing palette. */
  tint: string
}

/** The new learning sections, in the order they appear on the home screen. */
export const LEARN_SECTIONS: readonly LearnSection[] = [
  { id: 'words', path: '/learn/words', icon: 'apple', minLevel: 4, tint: 'bg-coin-soft' },
  { id: 'math', path: '/learn/math', icon: 'strawberry', minLevel: 4, tint: 'bg-girl-soft' },
  { id: 'space', path: '/learn/space', icon: 'ringed-planet', minLevel: 4, tint: 'bg-lilac-soft' },
  { id: 'tales', path: '/learn/tales', icon: 'rabbit', minLevel: 4, tint: 'bg-sky-soft' },
  { id: 'garden', path: '/learn/garden', icon: 'butterfly', minLevel: 4, tint: 'bg-primary-soft' },
  { id: 'help', path: '/learn/help', icon: 'gift', minLevel: 4, tint: 'bg-oops-soft' },
]

export function findSection(id: SectionId): LearnSection {
  return LEARN_SECTIONS.find((section) => section.id === id)!
}

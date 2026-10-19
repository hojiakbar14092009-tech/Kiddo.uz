import type { Language } from '@/content/languages'
import { SPOKEN as firstWords } from '../firstWords/spoken'
import { SPOKEN as garden } from '../garden/spoken'
import { SPOKEN as helpMascot } from '../helpMascot/spoken'
import { SPOKEN as math } from '../math/spoken'
import { SPOKEN as space } from '../space/spoken'
import { SPOKEN as tales } from '../tales/spoken'

/** Sentences the new sections can read aloud, for scripts/voices/collect.ts. */
export const LEARN_SPOKEN: Record<Language, string[]> = (['uz', 'ru', 'en'] as const).reduce(
  (all, language) => ({
    ...all,
    [language]: [firstWords, helpMascot, tales, space, math, garden].flatMap(
      (section) => section[language],
    ),
  }),
  {} as Record<Language, string[]>,
)

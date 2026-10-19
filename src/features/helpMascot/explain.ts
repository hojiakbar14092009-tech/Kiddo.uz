import type { Language } from '@/content/languages'
import { spell } from './content'
import { COPY } from './copy'
import type { Claim } from './generate'

/** The short explanation shown (and on PRO said) when a mistake is fixed. */
export function explain(claim: Claim, language: Language): string {
  const copy = COPY[language]
  switch (claim.type) {
    case 'initial':
      return copy.initialIs(spell(claim.word.letters, language), claim.right)
    case 'spelling':
      return copy.spellingIs(spell(claim.word.letters, language))
    case 'sum': {
      const c = Number(claim.right)
      return claim.op === '+' ? copy.plusIs(claim.a, claim.b, c) : copy.minusIs(claim.a, claim.b, c)
    }
  }
}

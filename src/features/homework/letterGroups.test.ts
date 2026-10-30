import { describe, expect, it } from 'vitest'
import { uzAlphabet } from '@/content/alphabet/uz'
import { letterGroup } from './letterGroups'

const base = {
  language: 'uz' as const,
  playable: uzAlphabet.letters,
  learned: ['a', 'b'],
  struggling: ['d', 'zz', 'e'],
  max: 5,
}

describe('letter groups for homework', () => {
  it('vowels, at most the homework size', () => {
    expect(
      letterGroup('vowels', base).map((id) => uzAlphabet.letters.find((l) => l.id === id)?.upper),
    ).toEqual(['A', 'E', 'I', 'O', 'U'])
  })
  it('the letters to practise: only real, playable ones', () => {
    expect(letterGroup('practice', base)).toEqual(['d', 'e'])
  })
  it('the next new letters: not learned yet, in alphabet order', () => {
    expect(letterGroup('next', base)).toEqual(['d', 'e', 'f', 'g', 'h'])
  })
})

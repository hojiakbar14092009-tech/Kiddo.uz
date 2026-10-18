import { describe, expect, it } from 'vitest'
import { LANGUAGES } from '@/content/languages'
import { findLetter, getAlphabet, splitWordByLetter } from '.'

describe('alphabets', () => {
  it('have the expected number of letters', () => {
    expect(getAlphabet('uz').letters).toHaveLength(30) // 29 letters + Ng
    expect(getAlphabet('ru').letters).toHaveLength(33)
    expect(getAlphabet('en').letters).toHaveLength(26)
  })

  it.each(LANGUAGES)('%s: ids are unique and URL-safe', (language) => {
    const ids = getAlphabet(language).letters.map((letter) => letter.id)
    expect(new Set(ids).size).toBe(ids.length)
    ids.forEach((id) => expect(id).toMatch(/^[a-z0-9]+$/))
  })

  it.each(LANGUAGES)('%s: every example word contains its letter', (language) => {
    getAlphabet(language).letters.forEach((letter) => {
      expect(letter.word.toLocaleLowerCase()).toContain(letter.lower)
    })
  })
})

describe('splitWordByLetter', () => {
  it('highlights a letter in the middle of the word', () => {
    const ng = findLetter('uz', 'ng')!
    expect(splitWordByLetter(ng.word, ng)).toEqual({ before: 'de', match: 'ng', after: 'iz' })

    const yi = findLetter('ru', 'yi')!
    expect(splitWordByLetter(yi.word, yi)).toEqual({ before: 'с', match: 'ы', after: 'р' })
  })

  it('highlights a letter at the end of the word', () => {
    const x = findLetter('en', 'x')!
    expect(splitWordByLetter(x.word, x)).toEqual({ before: 'bo', match: 'x', after: '' })
  })

  it('highlights the whole digraph at the start', () => {
    const sh = findLetter('uz', 'sh')!
    expect(splitWordByLetter(sh.word, sh)).toEqual({ before: '', match: 'sh', after: 'er' })
  })
})

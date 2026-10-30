import { describe, expect, it } from 'vitest'
import { ruAlphabet } from '@/content/alphabet/ru'
import { uzAlphabet } from '@/content/alphabet/uz'
import { decoyFor } from './decoy'

describe('the other letter in the letter check', () => {
  it('is never the letter itself, a look-alike neighbour or a mark', () => {
    for (const { letters } of [uzAlphabet, ruAlphabet]) {
      letters.forEach((letter, index) => {
        const decoy = decoyFor(letters, index)
        expect(decoy.id).not.toBe(letter.id)
        expect(decoy).not.toBe(letters[index + 1])
        expect(/\p{L}/u.test(decoy.upper)).toBe(true)
      })
    }
  })
})

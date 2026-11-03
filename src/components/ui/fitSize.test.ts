import { describe, expect, it } from 'vitest'
import { fitSize } from './fitSize'

describe('fitSize', () => {
  it('sizes by the longest word, so it fills the box at 0.72 em a letter', () => {
    // "Пингвинёнок": 11 letters → 100 / (11 × 0.72)
    expect(fitSize('Пингвинёнок')).toBe('12.63cqi')
    expect(fitSize('Ворота Узбекистана')).toBe(fitSize('Узбекистана'))
  })

  it('counts letters, not UTF-16 units, and treats short names as at least minLetters', () => {
    expect(fitSize('O‘zbekiston')).toBe('12.63cqi')
    expect(fitSize('T-rex', 6)).toBe(fitSize('abcdef'))
  })
})

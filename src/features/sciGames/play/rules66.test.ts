import { describe, expect, it } from 'vitest'
import { changeOf, paid, SHOP_ROUNDS } from './shopRules'
import { fits, tilesFor, TRAIN_WORDS } from './trainRules'

describe('the word train', () => {
  it('gives every word’s letters and two extras that are not in it', () => {
    for (const language of ['uz', 'ru', 'en'] as const)
      for (const { word } of TRAIN_WORDS[language]) {
        const tiles = tilesFor(language, word, () => 0.3)
        expect(tiles).toHaveLength(word.length + 2)
        const letters = tiles.map((tile) => tile.letter)
        for (const letter of new Set(word))
          expect(letters.filter((item) => item === letter).length).toBe(
            [...word].filter((item) => item === letter).length,
          )
        expect(letters.filter((letter) => !word.includes(letter))).toHaveLength(2)
        expect(new Set(tiles.map((tile) => tile.id)).size).toBe(tiles.length)
      }
  })

  it('takes letters in order only', () => {
    expect(fits('olma', 0, 'o')).toBe(true)
    expect(fits('olma', 0, 'l')).toBe(false)
    expect(fits('olma', 3, 'a')).toBe(true)
  })

  it('has short words, and Uzbek words without two-letter sounds', () => {
    for (const { word } of TRAIN_WORDS.uz) expect(word).not.toMatch(/sh|ch|ng|o‘|g‘/)
    for (const language of ['uz', 'ru', 'en'] as const)
      for (const { word } of TRAIN_WORDS[language]) expect(word.length).toBeLessThanOrEqual(5)
  })
})

describe('the little shop', () => {
  it('adds coins and gives the right change, which is always among the answers', () => {
    expect(paid([5, 2, 1])).toBe(8)
    for (const round of SHOP_ROUNDS)
      if (round.kind === 'change') {
        expect(round.options).toContain(changeOf(round))
        expect(new Set(round.options).size).toBe(round.options.length)
      } else expect(round.price).toBeLessThanOrEqual(10)
  })
})

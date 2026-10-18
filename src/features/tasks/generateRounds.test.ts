import { describe, expect, it } from 'vitest'
import { getAlphabet } from '@/content/alphabet'
import { LANGUAGES } from '@/content/languages'
import { seededRandom } from '@/lib/random'
import { generateRounds, pickTargets } from './generateRounds'

const empty = { learned: [], struggles: {} }

describe('generateRounds', () => {
  it.each(LANGUAGES)('%s: builds 5 rounds with different target letters', (language) => {
    const { letters } = getAlphabet(language)
    const rounds = generateRounds('find-letter', letters, empty, seededRandom(1))

    expect(rounds).toHaveLength(5)
    expect(new Set(rounds.map((round) => round.target.id)).size).toBe(5)
    rounds.forEach((round) => {
      expect(round.options).toHaveLength(4)
      expect(round.options).toContain(round.target)
      expect(new Set(round.options.map((option) => option.id)).size).toBe(4)
    })
  })

  it.each(LANGUAGES)('%s: wrong pictures never contain the target letter', (language) => {
    const { letters } = getAlphabet(language)
    for (let seed = 0; seed < 40; seed += 1) {
      const rounds = generateRounds('find-picture', letters, empty, seededRandom(seed))
      rounds.forEach(({ target, options }) => {
        expect(options).toHaveLength(3)
        options
          .filter((option) => option.id !== target.id)
          .forEach((option) => expect(option.word.toLocaleLowerCase()).not.toContain(target.lower))
      })
    }
  })

  it('starts a beginner with the first letters of the alphabet', () => {
    const { letters } = getAlphabet('en')
    const targets = pickTargets(letters, empty, 5, seededRandom(7)).map((letter) => letter.id)
    targets.forEach((id) => expect(['a', 'b', 'c', 'd', 'e', 'f']).toContain(id))
  })

  it('brings back letters the child struggled with', () => {
    const { letters } = getAlphabet('uz')
    const targets = pickTargets(
      letters,
      { learned: ['a', 'b'], struggles: { sh: 2, ch: 1, a: 0 } },
      5,
      seededRandom(3),
    ).map((letter) => letter.id)

    expect(targets).toContain('sh')
    expect(targets).toContain('ch')
    expect(targets).not.toContain('a')
  })
})

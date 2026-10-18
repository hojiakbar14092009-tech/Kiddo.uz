import { describe, expect, it } from 'vitest'
import { seededRandom } from '@/lib/random'
import { generateRounds } from './generateRounds'
import { playableLetters } from './playableLetters'

describe('playable letters', () => {
  it('never asks a picture question about a sign without a sound', () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      const rounds = generateRounds(
        'find-picture',
        playableLetters('ru', 'find-picture'),
        { learned: [], struggles: { soft: 5, hard: 5 }, focus: ['soft'] },
        seededRandom(seed),
      )
      const ids = rounds.flatMap((round) => round.options.map((option) => option.id))
      expect(ids).not.toContain('soft')
      expect(ids).not.toContain('hard')
    }
  })

  it('keeps every letter for “find the letter” and drops only ʼ from tracing', () => {
    expect(playableLetters('uz', 'find-letter').some((letter) => letter.id === 'tutuq')).toBe(true)
    expect(playableLetters('uz', 'trace').some((letter) => letter.id === 'tutuq')).toBe(false)
    expect(playableLetters('ru', 'trace').some((letter) => letter.id === 'soft')).toBe(true)
  })
})

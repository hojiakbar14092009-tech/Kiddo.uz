import { describe, expect, it } from 'vitest'
import { letterErrorCode, roundOutcome } from './taskEvidence'

describe('letter games → evidence', () => {
  it('records only what the round shows: a wrong letter or picture, no guessed reason', () => {
    expect(letterErrorCode('find-letter')).toBe('wrong-letter')
    expect(letterErrorCode('find-picture')).toBe('wrong-initial')
  })

  it('a round solved after the glow is not independent; a first-tap round is', () => {
    const at = '2026-10-10T09:00:00.000Z'
    const glow = roundOutcome(
      'find-letter',
      { sessionId: 'r', index: 0, targetId: 'b', wrongIds: ['d', 'p'] },
      at,
    )
    expect(glow).toMatchObject({ firstTry: false, hint: 3, skill: 'language:letter-recognition' })
    expect(glow.errors).toEqual(['wrong-letter'])
    const clean = roundOutcome(
      'find-picture',
      { sessionId: 'r', index: 1, targetId: 'a', wrongIds: [] },
      at,
    )
    expect(clean).toMatchObject({
      firstTry: true,
      hint: 0,
      errors: [],
      skill: 'language:first-sound',
    })
  })
})

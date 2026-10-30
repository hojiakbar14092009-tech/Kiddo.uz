import { describe, expect, it } from 'vitest'
import { composed, resolveReaction } from './reactions'

/* Phase 31: an older learner's mascot answers small moments with a composed gesture. */

describe('reactions by character stage', () => {
  const happyStreak = { kind: 'mood', mood: 'happy' } as const

  it('a streak (a big moment) stays a celebration at every stage', () => {
    const base = { mascot: 'kidobot' as const, streak: 3, reducedMotion: false }
    expect(resolveReaction(happyStreak, base)?.gesture).toBe('celebrate')
    // a streak is rank 3: a big moment stays a celebration for everyone
    expect(resolveReaction(happyStreak, { ...base, composedReactions: true })?.gesture).toBe(
      'celebrate',
    )
  })

  it('small celebrations and jumps become calm gestures, also in a chain', () => {
    const small = composed({
      gesture: 'surprised',
      emotion: 'surprised',
      priority: 4,
      rank: 2,
      then: { gesture: 'celebrate', emotion: 'excited', priority: 4, rank: 2 },
    })
    expect(small.gesture).toBe('surprised')
    expect(small.then?.gesture).toBe('encourage')
    expect(composed({ gesture: 'jump', emotion: 'happy', priority: 4, rank: 1 }).gesture).toBe(
      'nod',
    )
    expect(
      composed({ gesture: 'celebrate', emotion: 'celebrate', priority: 4, rank: 3 }).gesture,
    ).toBe('celebrate')
  })
})

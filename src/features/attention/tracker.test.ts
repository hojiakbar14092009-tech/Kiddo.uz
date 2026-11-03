import { describe, expect, it } from 'vitest'
import {
  COOLDOWN_MS,
  idleMsFor,
  initialTracker,
  lineFor,
  noteDistraction,
  WINDOW_MS,
} from './tracker'

describe('attention tracker', () => {
  it('calls gently first, warmer the second time, and offers games the third time', () => {
    let state = initialTracker()
    const first = noteDistraction(state, 'idle', 0)
    expect(first.action).toEqual({ kind: 'nudge', level: 1, cause: 'idle' })
    state = first.state
    const second = noteDistraction(state, 'lookAway', COOLDOWN_MS)
    expect(second.action).toEqual({ kind: 'nudge', level: 2, cause: 'lookAway' })
    const third = noteDistraction(second.state, 'idle', 2 * COOLDOWN_MS)
    expect(third.action).toEqual({ kind: 'offerGames' })
    // the offer starts the count again
    expect(third.state.episodes).toEqual([])
  })

  it('greets a child coming back instead of scolding, and still counts it', () => {
    const { action, state } = noteDistraction(initialTracker(), 'away', 1000)
    expect(action).toEqual({ kind: 'welcomeBack' })
    expect(state.episodes).toHaveLength(1)
  })

  it('stays quiet during the pause after a reminder, and counts one drift once', () => {
    const first = noteDistraction(initialTracker(), 'idle', 0)
    const soon = noteDistraction(first.state, 'lookAway', COOLDOWN_MS - 1)
    expect(soon.action).toBeNull()
    expect(soon.state.episodes).toHaveLength(1)
  })

  it('forgets distractions older than the window', () => {
    const first = noteDistraction(initialTracker(), 'idle', 0)
    const later = noteDistraction(first.state, 'idle', WINDOW_MS + 1)
    expect(later.action).toEqual({ kind: 'nudge', level: 1, cause: 'idle' })
    expect(later.state.episodes).toEqual([WINDOW_MS + 1])
  })

  it('waits a little longer for the youngest', () => {
    expect(idleMsFor(4)).toBeGreaterThan(idleMsFor(6))
    expect(idleMsFor(null)).toBe(idleMsFor(6))
  })

  it('takes turns through the lines', () => {
    const nudge = { kind: 'nudge', level: 1, cause: 'lookAway' } as const
    expect([0, 1, 2, 3].map((turn) => lineFor(nudge, turn))).toEqual([
      'look1',
      'look2',
      'look3',
      'look1',
    ])
    expect(lineFor({ kind: 'offerGames' }, 5)).toBe('offer')
    expect(lineFor({ kind: 'welcomeBack' }, 1)).toBe('back2')
    expect(lineFor({ kind: 'nudge', level: 2, cause: 'idle' }, 0)).toBe('again1')
  })
})

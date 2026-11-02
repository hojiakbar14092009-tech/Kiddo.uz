import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TapTracker } from './characters/director'
import { TAP_MOVES, resolveReaction, tapPerformance } from './characters/reactions'
import { Syllables } from './characters/emotions'
import { Mascot } from './Mascot'
import { useMascotStore } from './mascotStore'

/* Phase 43: touches, rest hours and the talking mouth. */

describe('a touch on a mascot', () => {
  it('answers with a different move each time, never the same twice in a row', () => {
    const moves = Array.from({ length: 12 }, (_, i) => tapPerformance(i).gesture)
    for (let i = 1; i < moves.length; i += 1) expect(moves[i]).not.toBe(moves[i - 1])
    expect(new Set(moves).size).toBe(TAP_MOVES.length)
    expect(
      resolveReaction(
        { kind: 'tap', count: 1 },
        { mascot: 'kidobot', streak: 0, reducedMotion: false },
      )?.gesture,
    ).toBe(TAP_MOVES[1]!.gesture)
  })

  it('three quick taps make a giggle-jump (calm with reduced motion); taps stay rate-limited', () => {
    const taps = new TapTracker()
    expect(taps.press(0)).toEqual({ count: 0, burst: false })
    expect(taps.press(300)).toBeNull()
    expect(taps.press(600)).toEqual({ count: 1, burst: true })
    expect(taps.press(900)).toBeNull()
    expect(taps.press(1300)).toBeNull()
    expect(taps.press(2000)).toBeNull()
    expect(taps.press(2600)).toEqual({ count: 2, burst: false })
    expect(tapPerformance(0, true).gesture).toBe('jump')
    // a child tapping on and on: still at most three answers in any 10 s
    const busy = new TapTracker()
    const answered: number[] = []
    for (let t = 0; t < 30_000; t += 150) if (busy.press(t)) answered.push(t)
    for (const t of answered) {
      expect(
        answered.filter((other) => other >= t && other < t + 10_000).length,
      ).toBeLessThanOrEqual(3)
    }
    expect(
      resolveReaction(
        { kind: 'tap', burst: true },
        { mascot: 'kidobot', streak: 0, reducedMotion: true },
      )?.gesture,
    ).toBe('celebrate_calm')
  })
})

describe('the talking mouth', () => {
  it('follows the voice loudness, and shuts in its pauses', () => {
    const mouth = new Syllables(3)
    let open = 0
    for (let i = 0; i < 10; i += 1) open = mouth.step(0.016, true, 0.8)
    expect(open).toBeGreaterThan(0.6)
    for (let i = 0; i < 30; i += 1) open = mouth.step(0.016, true, 0)
    expect(open).toBeLessThan(0.05)
  })

  it('keeps a syllable rhythm when the loudness is unknown', () => {
    const mouth = new Syllables(3)
    const opens = Array.from({ length: 60 }, () => mouth.step(0.016, true, null))
    expect(Math.max(...opens)).toBeGreaterThan(0.3)
    expect(mouth.step(1, false)).toBe(0)
  })
})

describe('the screen robot', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    useMascotStore.setState({ mood: 'idle', message: null })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const mood = () => screen.getByTestId('mascot').getAttribute('data-mood')

  it('answers a touch, then is itself again', () => {
    vi.setSystemTime(new Date('2026-11-05T10:00:00'))
    render(<Mascot />)
    expect(mood()).toBe('idle')
    fireEvent.click(document.querySelector('[data-mascot-touch]')!)
    expect(mood()).toBe('wave')
    act(() => vi.advanceTimersByTime(1300))
    expect(mood()).toBe('idle')
    act(() => vi.advanceTimersByTime(1300))
    fireEvent.click(document.querySelector('[data-mascot-touch]')!)
    expect(mood()).toBe('happy')
  })

  it('dozes in the rest hours, and an answer still shows', () => {
    vi.setSystemTime(new Date('2026-11-05T23:00:00'))
    render(<Mascot />)
    expect(mood()).toBe('sleepy')
    act(() => useMascotStore.setState({ mood: 'happy' }))
    expect(mood()).toBe('happy')
  })

  it('does not doze in the middle of a lesson (something to read), nor while speaking', () => {
    vi.setSystemTime(new Date('2026-11-05T23:00:00'))
    useMascotStore.setState({ mood: 'idle', message: { text: 'Find A' } })
    const { rerender } = render(<Mascot />)
    expect(mood()).toBe('idle')
    act(() => useMascotStore.setState({ message: null }))
    rerender(<Mascot speaking />)
    expect(mood()).toBe('talk')
  })

  it('a touch does not cover an answer’s reaction', () => {
    vi.setSystemTime(new Date('2026-11-05T10:00:00'))
    render(<Mascot />)
    act(() => useMascotStore.setState({ mood: 'oops' }))
    fireEvent.click(document.querySelector('[data-mascot-touch]')!)
    expect(mood()).toBe('oops')
    // that touch was not taken: back at rest, the first touch is the first move
    act(() => useMascotStore.setState({ mood: 'idle' }))
    fireEvent.click(document.querySelector('[data-mascot-touch]')!)
    expect(mood()).toBe('wave')
  })
})

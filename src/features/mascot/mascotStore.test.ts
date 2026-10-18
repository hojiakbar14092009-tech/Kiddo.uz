import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EVENT_DURATION_MS, useMascotStore } from './mascotStore'

describe('mascotStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useMascotStore.getState().reset()
  })

  afterEach(() => vi.useRealTimers())

  it('jumps for joy with a message, then relaxes', () => {
    useMascotStore.getState().react('correct', { text: 'Yahoooo!', emoji: '🌟' })
    expect(useMascotStore.getState()).toMatchObject({
      mood: 'happy',
      message: { text: 'Yahoooo!' },
    })

    vi.advanceTimersByTime(EVENT_DURATION_MS.correct!)
    expect(useMascotStore.getState()).toMatchObject({ mood: 'idle', message: null })
  })

  it('keeps an instruction until the next event', () => {
    useMascotStore.getState().react('instruct', { text: 'B harfini top!' })
    vi.advanceTimersByTime(60_000)
    expect(useMascotStore.getState()).toMatchObject({
      mood: 'talk',
      message: { text: 'B harfini top!' },
    })
  })

  it('lets the latest event win and replays with a new key', () => {
    const { react, reactionKey } = useMascotStore.getState()
    react('correct', null)
    react('wrong', null)

    expect(useMascotStore.getState()).toMatchObject({ mood: 'oops', reactionKey: reactionKey + 2 })
    vi.advanceTimersByTime(EVENT_DURATION_MS.correct!)
    expect(useMascotStore.getState().mood).toBe('oops')
    vi.advanceTimersByTime(EVENT_DURATION_MS.wrong! - EVENT_DURATION_MS.correct!)
    expect(useMascotStore.getState().mood).toBe('idle')
  })

  it('maps rest to the sleepy mood', () => {
    useMascotStore.getState().react('rest', null)
    expect(useMascotStore.getState().mood).toBe('sleepy')
  })
})

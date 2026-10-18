import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { REACTION_MS, useMascotStore } from './mascotStore'

describe('mascotStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useMascotStore.setState({ mood: 'idle', reactionKey: 0 })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('jumps for joy and then relaxes', () => {
    useMascotStore.getState().react('happy')
    expect(useMascotStore.getState().mood).toBe('happy')

    vi.advanceTimersByTime(REACTION_MS.happy)
    expect(useMascotStore.getState().mood).toBe('idle')
  })

  it('replays a reaction with a new key, and the latest reaction wins', () => {
    const { react } = useMascotStore.getState()
    react('happy')
    react('oops')

    expect(useMascotStore.getState()).toMatchObject({ mood: 'oops', reactionKey: 2 })
    vi.advanceTimersByTime(REACTION_MS.happy)
    expect(useMascotStore.getState().mood).toBe('oops')
    vi.advanceTimersByTime(REACTION_MS.oops - REACTION_MS.happy)
    expect(useMascotStore.getState().mood).toBe('idle')
  })
})

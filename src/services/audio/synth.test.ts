import { Howler } from 'howler'
import { afterEach, describe, expect, it } from 'vitest'
import { audio, resetAudio } from './synth'

describe('one audio context for the whole app', () => {
  afterEach(() => resetAudio())

  it('the synthesizer plays through Howler’s context, never a second one', () => {
    const shared = { state: 'running' } as unknown as AudioContext
    Object.assign(Howler, { ctx: shared, usingWebAudio: true })
    expect(audio()).toBe(shared)
    expect(Howler.autoSuspend).toBe(false)
  })

  it('without Web Audio there is no sound at all (no context of its own)', () => {
    Object.assign(Howler, { ctx: null, usingWebAudio: false })
    expect(audio()).toBeNull()
  })
})

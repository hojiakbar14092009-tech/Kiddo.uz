import { Howler } from 'howler'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { audioManager } from './audioManager'
import { resetVoiceLevel, voiceLevel } from './voiceLevel'

/* Phase 43: the mouth reads the loudness of Kiddo's voice from the one audio context. */

function fakeContext(amplitude: () => number) {
  const connect = vi.fn()
  const disconnect = vi.fn()
  const analyser = {
    fftSize: 0,
    smoothingTimeConstant: 0,
    getByteTimeDomainData: (out: Uint8Array) => {
      for (let i = 0; i < out.length; i += 1)
        out[i] = 128 + Math.round(amplitude() * 127 * (i % 2 ? 1 : -1))
    },
  }
  const ctx = { createAnalyser: vi.fn(() => analyser) }
  Object.assign(Howler, { usingWebAudio: true, ctx, masterGain: { connect, disconnect } })
  return { ctx, connect, disconnect }
}

const saved = {
  usingWebAudio: Howler.usingWebAudio,
  ctx: Howler.ctx,
  masterGain: Howler.masterGain,
}

describe('voiceLevel', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    resetVoiceLevel()
    Object.assign(Howler, {
      usingWebAudio: saved.usingWebAudio,
      ctx: saved.ctx,
      masterGain: saved.masterGain,
    })
  })

  it('is null while no voice plays (the mouth keeps its rhythm)', () => {
    vi.spyOn(audioManager, 'getStatus').mockReturnValue('idle')
    expect(voiceLevel()).toBeNull()
  })

  it('listens on the master output once and follows the loudness', () => {
    let amp = 0.5
    const { ctx, connect } = fakeContext(() => amp)
    vi.spyOn(audioManager, 'getStatus').mockReturnValue('speaking')
    expect(voiceLevel(0)).toBeGreaterThan(0.8)
    amp = 0
    expect(voiceLevel(16)).toBe(0)
    amp = 0.1
    const quiet = voiceLevel(32)!
    expect(quiet).toBeGreaterThan(0)
    expect(quiet).toBeLessThan(0.8)
    expect(ctx.createAnalyser).toHaveBeenCalledTimes(1)
    expect(connect).toHaveBeenCalledTimes(1)
  })

  it('listens only while Kiddo speaks', () => {
    const { connect, disconnect } = fakeContext(() => 0.5)
    const status = vi.spyOn(audioManager, 'getStatus').mockReturnValue('speaking')
    voiceLevel(0)
    status.mockReturnValue('idle')
    expect(voiceLevel(16)).toBeNull()
    expect(disconnect).toHaveBeenCalledTimes(1)
    status.mockReturnValue('speaking')
    voiceLevel(32)
    expect(connect).toHaveBeenCalledTimes(2)
  })

  it('keeps the syllable rhythm until the voice is heard, and for a voice it cannot hear', () => {
    let amp = 0
    fakeContext(() => amp)
    vi.spyOn(audioManager, 'getStatus').mockReturnValue('speaking')
    // the device's own voice, or a clip still loading: rhythm, not a shut mouth
    expect(voiceLevel(0)).toBeNull()
    amp = 0.5
    expect(voiceLevel(100)).toBeGreaterThan(0.8)
    // a pause between sentences: shut
    amp = 0
    expect(voiceLevel(1500)).toBe(0)
    // a recording, then the device's voice the analyser cannot hear: back to the rhythm
    expect(voiceLevel(2200)).toBeNull()
    expect(voiceLevel(2300)).toBeNull()
  })

  it('without Web Audio there is nothing to measure', () => {
    vi.spyOn(audioManager, 'getStatus').mockReturnValue('speaking')
    Object.assign(Howler, { usingWebAudio: false, ctx: {}, masterGain: {} })
    expect(voiceLevel()).toBeNull()
  })
})

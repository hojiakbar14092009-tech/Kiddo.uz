import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSettingsStore } from '@/store/settingsStore'

const gains: { value: number }[] = []
const ctx = vi.hoisted(() => ({
  currentTime: 0,
  destination: {},
  createGain: vi.fn(),
  createOscillator: vi.fn(),
}))
vi.mock('@/services/audio/synth', () => ({ audio: () => ctx, playTone: vi.fn() }))
const narrating = vi.hoisted(() => ({ value: false }))
vi.mock('@/services/audio/soundLanguage', () => ({
  tapGain: () => (narrating.value ? 0.25 : 0.6),
}))

const { playPetSound, resetPetSounds } = await import('./petSounds')

describe('pet voices follow the sound language', () => {
  beforeEach(() => {
    resetPetSounds()
    gains.length = 0
    ctx.createGain.mockImplementation(() => {
      const gain = { value: 0 }
      gains.push(gain)
      return { gain, connect: vi.fn(), disconnect: vi.fn() }
    })
    useSettingsStore.setState({ volume: 1 })
    narrating.value = false
  })

  it('fast taps on a pet make one sound, as loud as the app’s other sounds', () => {
    playPetSound('cat')
    playPetSound('cat')
    playPetSound('parrot')
    expect(gains).toHaveLength(1)
    expect(gains[0]!.value).toBeCloseTo(0.6)
  })

  it('softer under Kiddo’s voice, silent at volume 0', () => {
    narrating.value = true
    playPetSound('cat')
    expect(gains[0]!.value).toBeCloseTo(0.25)
    resetPetSounds()
    useSettingsStore.setState({ volume: 0 })
    playPetSound('cat')
    expect(gains).toHaveLength(1)
  })
})

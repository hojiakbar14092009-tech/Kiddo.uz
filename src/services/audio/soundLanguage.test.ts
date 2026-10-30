import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSettingsStore } from '@/store/settingsStore'

const playTone = vi.hoisted(() => vi.fn())
const ctx = vi.hoisted(() => ({
  createGain: () => ({ gain: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() }),
  destination: {},
}))
vi.mock('./synth', () => ({ audio: () => ctx, playTone }))

const {
  cueNotes,
  noteSuccessSound,
  playCue,
  queueCue,
  resetCueQueue,
  SOUND_CUES,
  stepHz,
  strongestCue,
} = await import('./soundLanguage')

const PENTATONIC_C = [0, 2, 4, 7, 9]

describe('sound language', () => {
  beforeEach(() => {
    playTone.mockReset()
    resetCueQueue()
    useSettingsStore.setState({ volume: 0.8 })
  })
  afterEach(() => vi.useRealTimers())

  it('keeps every note of every cue in C major pentatonic', () => {
    for (const cue of SOUND_CUES) {
      for (const note of cueNotes(cue)) {
        const semis = Math.round(12 * Math.log2(stepHz(note.step) / 523.25))
        expect(PENTATONIC_C).toContain(((semis % 12) + 12) % 12)
        expect(note.duration).toBeLessThanOrEqual(0.5)
      }
    }
    expect(stepHz(0)).toBeCloseTo(523.25)
    expect(stepHz(5)).toBeCloseTo(1046.5)
    expect(stepHz(-1)).toBeCloseTo(440, 0)
  })

  it('every cue is short and the rising ones rise', () => {
    for (const cue of SOUND_CUES) {
      const end = Math.max(...cueNotes(cue).map((n) => n.at + n.duration))
      expect(end).toBeLessThan(1)
    }
    const coin = cueNotes('coin')
    expect(coin[1]!.step).toBeGreaterThan(coin[0]!.step)
    const spend = cueNotes('spend')
    expect(spend[1]!.step).toBeLessThan(spend[0]!.step)
  })

  it('of cues at the same moment, only the strongest is heard', () => {
    expect(strongestCue(['coin', 'star', 'unlock', 'coin'])).toBe('unlock')
    expect(strongestCue(['coin', 'spend'])).toBe('coin')
    expect(strongestCue([])).toBeNull()
    vi.useFakeTimers()
    queueCue('coin')
    queueCue('star')
    queueCue('coin')
    expect(playTone).not.toHaveBeenCalled()
    vi.advanceTimersByTime(200)
    // the star's four notes, each with its overtone
    expect(playTone).toHaveBeenCalledTimes(cueNotes('star').length * 2)
  })

  it('after the “well done” chime, small cues stay quiet and big ones follow it', () => {
    vi.useFakeTimers()
    noteSuccessSound()
    queueCue('coin')
    queueCue('star')
    vi.advanceTimersByTime(1000)
    expect(playTone).not.toHaveBeenCalled()

    noteSuccessSound()
    queueCue('star')
    queueCue('unlock')
    vi.advanceTimersByTime(300) // gathered, still waiting for the chime to end
    expect(playTone).not.toHaveBeenCalled()
    vi.advanceTimersByTime(300)
    expect(playTone).toHaveBeenCalledTimes(cueNotes('unlock').length * 2)

    // later, a coin on its own is heard again
    playTone.mockReset()
    vi.advanceTimersByTime(1000)
    queueCue('coin')
    vi.advanceTimersByTime(200)
    expect(playTone).toHaveBeenCalledTimes(cueNotes('coin').length * 2)
  })

  it('drops a cue before the child has touched the page', () => {
    Object.defineProperty(navigator, 'userActivation', {
      configurable: true,
      value: { hasBeenActive: false },
    })
    playCue('unlock')
    expect(playTone).not.toHaveBeenCalled()
    Object.defineProperty(navigator, 'userActivation', {
      configurable: true,
      value: { hasBeenActive: true },
    })
    playCue('unlock')
    expect(playTone).toHaveBeenCalled()
  })

  it('is silent at volume 0', () => {
    useSettingsStore.setState({ volume: 0 })
    playCue('unlock')
    expect(playTone).not.toHaveBeenCalled()
  })
})

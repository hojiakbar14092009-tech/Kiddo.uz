import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSettingsStore } from '@/store/settingsStore'

const playTone = vi.hoisted(() => vi.fn())
const gains = vi.hoisted(() => [] as { gain: { value: number } }[])
const ctx = vi.hoisted(() => ({
  createGain: () => {
    const node = { gain: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() }
    gains.push(node)
    return node
  },
  destination: {},
}))
vi.mock('./synth', () => ({ audio: () => ctx, playTone }))

const {
  cueNotes,
  noteSuccessSound,
  playBack,
  playConfirm,
  playCue,
  playTap,
  nextTapStep,
  queueCue,
  resetCueQueue,
  setNarrating,
  SOUND_CUES,
  stepHz,
  strongestCue,
  tapPaletteFor,
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

  it('never talks over Kiddo’s voice: small cues wait, big ones play softly', () => {
    setNarrating(true)
    playCue('coin')
    playCue('back')
    expect(playTone).not.toHaveBeenCalled()
    playCue('levelUp')
    expect(playTone).toHaveBeenCalledTimes(cueNotes('levelUp').length * 2)
    setNarrating(false)
  })

  it('frequent sounds are quieter and shorter than rare ones', () => {
    const loudness = (cue: (typeof SOUND_CUES)[number]) =>
      Math.max(...cueNotes(cue).map((n) => n.gain ?? 1))
    const length = (cue: (typeof SOUND_CUES)[number]) =>
      Math.max(...cueNotes(cue).map((n) => n.at + n.duration))
    for (const small of ['back', 'confirm', 'spend'] as const) {
      expect(loudness(small)).toBeLessThan(loudness('unlock'))
      expect(length(small)).toBeLessThan(length('levelUp'))
    }
  })

  it('the child’s own tap still answers under the voice, softly', () => {
    setNarrating(true)
    playBack()
    expect(playTone).toHaveBeenCalledTimes(cueNotes('back').length * 2)
    setNarrating(false)
  })

  it('coins spent right after a confirmation stay quiet (one sound for one choice)', () => {
    vi.useFakeTimers()
    playConfirm()
    playTone.mockReset()
    queueCue('spend')
    vi.advanceTimersByTime(200)
    expect(playTone).not.toHaveBeenCalled()
  })

  it('fast back taps make one sound', () => {
    playBack()
    playBack()
    playBack()
    expect(playTone).toHaveBeenCalledTimes(cueNotes('back').length * 2)
  })

  it('is silent at volume 0', () => {
    useSettingsStore.setState({ volume: 0 })
    playCue('unlock')
    expect(playTone).not.toHaveBeenCalled()
  })

  it('each part of the app has its own tap (Phase 42)', () => {
    expect(tapPaletteFor('/home')).toBe('wood')
    expect(tapPaletteFor('/parent/dashboard')).toBe('wood')
    expect(tapPaletteFor('/alphabet')).toBe('xylophone')
    expect(tapPaletteFor('/alphabet', '?tab=numbers')).toBe('nut')
    expect(tapPaletteFor('/alphabet/num-9')).toBe('nut')
    expect(tapPaletteFor('/tasks/find-letter')).toBe('xylophone')
    expect(tapPaletteFor('/math-lab')).toBe('nut')
    expect(tapPaletteFor('/learn/math/add')).toBe('nut')
    expect(tapPaletteFor('/learn/space')).toBe('blip')
    expect(tapPaletteFor('/worlds/dino')).toBe('blip')
    expect(tapPaletteFor('/shop')).toBe('nut')
    expect(tapPaletteFor('/trace/numbers/7')).toBe('nut')
  })

  it('taps walk a tune: never the same note twice in a row, softer under the voice', () => {
    let previous = nextTapStep()
    for (let i = 0; i < 20; i += 1) {
      const step = nextTapStep()
      expect(step).not.toBe(previous)
      previous = step
    }
    // a tap of every palette is quieter at its peak than the softest cue (back, try again)
    const peak = () => {
      const out = gains.at(-1)!.gain.value
      return (
        Math.max(...playTone.mock.calls.map((call) => (call[2] as { gain: number }).gain)) * out
      )
    }
    const quietestCue = Math.min(
      ...(['back', 'tryAgain', 'confirm'] as const).map(
        (cue) => Math.max(...cueNotes(cue).map((n) => 0.3 * (n.gain ?? 1))) * 0.8 * 0.6,
      ),
    )
    for (const palette of ['xylophone', 'nut', 'blip'] as const) {
      playTone.mockReset()
      playTap(palette)
      expect(peak()).toBeLessThan(quietestCue)
    }
  })

  it('a right answer is a soft tune up; a wrong one a gentle question, never a buzz', () => {
    const correct = cueNotes('correct')
    expect(correct.map((n) => n.step)).toEqual(
      [...correct.map((n) => n.step)].sort((a, b) => a - b),
    )
    const again = cueNotes('tryAgain')
    expect(again.every((n) => (n.gain ?? 1) <= 0.4)).toBe(true)
    expect(Math.max(...again.map((n) => n.at + n.duration))).toBeLessThan(0.4)
    // the nut roll: knocks rolling up
    const coin = cueNotes('coin')
    expect(coin.length).toBeGreaterThanOrEqual(3)
  })
})

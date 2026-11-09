import { describe, expect, it } from 'vitest'
import { ENDING, FPS, totalFrames } from '../../../marketing/shorts/src/data'
import { captionAt, cuesFor, NO_CAPTION } from './captions'
import { SHORTS } from './catalog'

const LANGS = ['uz', 'ru', 'en'] as const

describe('subtitles', () => {
  it('shows nothing before the voice, then lights the words one by one', () => {
    const cues = cuesFor('water', 'uz')
    expect(cues).toHaveLength(16)
    expect(captionAt(cues, 0)).toBe(NO_CAPTION)
    const first = cues[0]!
    expect(captionAt(cues, first.from + 0.01)).toEqual({ cue: 0, lit: 1 })
    const half = captionAt(cues, first.from + first.seconds / 2)
    expect(half.lit).toBeGreaterThan(1)
    expect(half.lit).toBeLessThan(first.words.length)
    expect(captionAt(cues, first.from + first.seconds).lit).toBe(first.words.length)
  })

  it('keeps every cue in order, apart, and inside the video, in every language', () => {
    for (const { id } of SHORTS) {
      for (const lang of LANGS) {
        const cues = cuesFor(id, lang)
        const end = (totalFrames(id, lang) - ENDING) / FPS
        cues.forEach((cue, i) => {
          expect(cue.from).toBeLessThan(cue.to)
          expect(cue.to).toBeLessThanOrEqual(end + 1e-9)
          if (i > 0) expect(cue.from).toBeGreaterThanOrEqual(cues[i - 1]!.to)
          expect(cue.at).toHaveLength(cue.words.length)
        })
      }
    }
  })
})

import type { Language } from '@/content/languages'
import { FPS, OPENING, sceneFrames, timing, voiceIn } from '../../../marketing/shorts/src/data'
import type { ShortId } from './catalog'

/*
 * The subtitles of a "bare" cartoon (one rendered without words): the app writes
 * the line and lights it word by word with the voice. The timing comes from the
 * same timings.json the video was rendered from, so voice and words cannot drift.
 */

export interface Cue {
  /** Seconds into the video: the line appears, and goes. */
  from: number
  to: number
  words: string[]
  /** For each word, the share (0–1) of the line's voice after which it lights up. */
  at: number[]
  /** How long the voice speaks the line, in seconds. */
  seconds: number
}

/** The title shows this long at the start, over the opening scene. */
export const TITLE_SECONDS = 2.5
/** The words appear a little before the voice starts. */
const LEAD = 4

export function cuesFor(id: ShortId, language: Language): Cue[] {
  const { lines, durations } = timing(id, language)
  let start = OPENING
  return lines.map((line, index) => {
    const frames = sceneFrames(id, language, index)
    const words = line.split(' ')
    const letters = words.reduce((sum, word) => sum + word.length + 1, 0)
    let seen = 0
    const at = words.map((word) => {
      const share = seen / letters
      seen += word.length + 1
      return share
    })
    const cue: Cue = {
      from: (start + voiceIn(id) - LEAD) / FPS,
      to: (start + frames) / FPS,
      words,
      at,
      seconds: Math.max(0.5, durations[index]!),
    }
    start += frames
    return cue
  })
}

export interface CaptionState {
  /** The cue showing now (-1: none), and how many of its words are lit. */
  cue: number
  lit: number
}

export const NO_CAPTION: CaptionState = { cue: -1, lit: 0 }

export function captionAt(cues: readonly Cue[], time: number): CaptionState {
  const cue = cues.findIndex((c) => time >= c.from && time < c.to)
  if (cue < 0) return NO_CAPTION
  const c = cues[cue]!
  const share = (time - c.from) / c.seconds
  return { cue, lit: c.at.filter((start) => share >= start).length }
}

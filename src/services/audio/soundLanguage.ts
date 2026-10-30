import { useSettingsStore } from '@/store/settingsStore'
import { audio, playTone } from './synth'

/*
 * The sound language (Phase 29): every moment of progress has its own short
 * sound, all in one key (C major pentatonic) and one soft, wooden timbre, so
 * the app sounds like one instrument. Made on the spot (Web Audio, no files),
 * deterministic, at the app's volume, in Free and PRO alike (it is not speech).
 *
 *  coin    two bright notes up            – coins earned
 *  star    a quick sparkle up             – stars earned
 *  grow    three warm notes up            – a plant grew, a skill mastered
 *  heart   a soft low-high pair           – a pet's friendship grew
 *  unlock  a four-note fanfare            – a world, a stage, an achievement
 *  spend   two notes down, quiet          – coins or crystals spent
 */

export const SOUND_CUES = ['coin', 'star', 'grow', 'heart', 'unlock', 'spend'] as const
export type SoundCue = (typeof SOUND_CUES)[number]

/** One note: when (s), which pentatonic step (0 = C5; 5 = C6; negative goes down), how long (s). */
export interface CueNote {
  at: number
  step: number
  duration: number
  /** Loudness 0..1 of this note (the cue is then scaled by the app volume). */
  gain?: number
}

/** C major pentatonic, in semitones from C: C D E G A. */
const PENTATONIC = [0, 2, 4, 7, 9]
const C5 = 523.25

/** The frequency of a pentatonic step (0 = C5, 5 = C6, -1 = A4 …). */
export function stepHz(step: number): number {
  const octave = Math.floor(step / PENTATONIC.length)
  const index = step - octave * PENTATONIC.length
  return C5 * 2 ** (octave + PENTATONIC[index]! / 12)
}

const CUES: Record<SoundCue, readonly CueNote[]> = {
  coin: [
    { at: 0, step: 5, duration: 0.09 },
    { at: 0.08, step: 7, duration: 0.22 },
  ],
  star: [
    { at: 0, step: 3, duration: 0.07, gain: 0.7 },
    { at: 0.06, step: 5, duration: 0.07, gain: 0.8 },
    { at: 0.12, step: 7, duration: 0.07, gain: 0.9 },
    { at: 0.18, step: 9, duration: 0.25 },
  ],
  grow: [
    { at: 0, step: 0, duration: 0.14 },
    { at: 0.13, step: 2, duration: 0.14 },
    { at: 0.26, step: 4, duration: 0.3 },
  ],
  heart: [
    { at: 0, step: -2, duration: 0.18, gain: 0.8 },
    { at: 0.17, step: 2, duration: 0.34 },
  ],
  unlock: [
    { at: 0, step: 0, duration: 0.12 },
    { at: 0.11, step: 2, duration: 0.12 },
    { at: 0.22, step: 4, duration: 0.12 },
    { at: 0.36, step: 5, duration: 0.45 },
    { at: 0.36, step: 2, duration: 0.45, gain: 0.5 },
  ],
  spend: [
    { at: 0, step: 4, duration: 0.1, gain: 0.5 },
    { at: 0.09, step: 2, duration: 0.18, gain: 0.5 },
  ],
}

/** The notes of a cue (for tests and for the parent's sound preview). */
export function cueNotes(cue: SoundCue): readonly CueNote[] {
  return CUES[cue]
}

/** Which of several cues at the same moment is heard: the most important one. */
const RANK: Record<SoundCue, number> = { unlock: 5, heart: 4, grow: 3, star: 2, coin: 1, spend: 0 }

export function strongestCue(cues: readonly SoundCue[]): SoundCue | null {
  return cues.reduce<SoundCue | null>(
    (best, cue) => (best === null || RANK[cue] > RANK[best] ? cue : best),
    null,
  )
}

/**
 * Plays a cue now at the app's volume (silent at volume 0 or without Web Audio).
 * Before the child has touched the page a cue is dropped: the browser would hold
 * it in a paused audio context and play it later, out of place.
 */
export function playCue(cue: SoundCue): void {
  const volume = useSettingsStore.getState().volume
  if (volume <= 0) return
  if (typeof navigator !== 'undefined' && navigator.userActivation?.hasBeenActive === false) return
  const ctx = audio()
  if (!ctx) return
  const out = ctx.createGain()
  out.gain.value = volume * 0.6
  out.connect(ctx.destination)
  const length = Math.max(...CUES[cue].map((note) => note.at + note.duration))
  setTimeout(() => out.disconnect(), (length + 0.3) * 1000)
  for (const note of CUES[cue]) {
    const hz = stepHz(note.step)
    // a wooden, marimba-like note: a sine body and a quiet triangle overtone, quick decay
    playTone(ctx, out, {
      at: note.at,
      duration: note.duration,
      pitch: [[0, hz]],
      gain: 0.3 * (note.gain ?? 1),
    })
    playTone(ctx, out, {
      at: note.at,
      duration: note.duration * 0.6,
      pitch: [[0, hz * 4]],
      type: 'triangle',
      gain: 0.04 * (note.gain ?? 1),
    })
  }
}

/** Cues arriving together (a finished game pays coins, stars and more at once) are one sound. */
const GATHER_MS = 150
/** The "well done" chime (ui_success) already answers a success: small cues then stay quiet. */
const SUCCESS_WINDOW_MS = 600
/** A big moment (unlock, a heart) right after the chime waits for it to finish. */
const AFTER_SUCCESS_MS = 450
let pending: SoundCue[] = []
let timer: ReturnType<typeof setTimeout> | null = null
let lastSuccess = -Infinity

/** Called when the "well done" chime plays (audioManager), so the cues do not talk over it. */
export function noteSuccessSound(): void {
  lastSuccess = Date.now()
}

/**
 * Queues a cue: of the cues queued within a moment, only the strongest is played.
 * Right after the "well done" chime, coins, stars and growth are not repeated, and
 * an unlock or a heart follows the chime instead of overlapping it.
 */
export function queueCue(cue: SoundCue): void {
  pending.push(cue)
  if (timer !== null) return
  timer = setTimeout(() => {
    const strongest = strongestCue(pending)
    pending = []
    timer = null
    if (!strongest) return
    const sinceSuccess = Date.now() - lastSuccess
    if (sinceSuccess < SUCCESS_WINDOW_MS) {
      if (strongest !== 'unlock' && strongest !== 'heart') return
      setTimeout(() => playCue(strongest), Math.max(0, AFTER_SUCCESS_MS - sinceSuccess))
      return
    }
    playCue(strongest)
  }, GATHER_MS)
}

/** For tests: forgets queued cues and the last chime. */
export function resetCueQueue(): void {
  if (timer !== null) clearTimeout(timer)
  timer = null
  pending = []
  lastSuccess = -Infinity
}

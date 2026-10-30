import { Howler } from 'howler'

/*
 * The app's small synthesizer (Web Audio, no sound files): the pets' voices
 * and the sound language (Phase 29) are both made with it. It plays through
 * the one audio context of the app — Howler's, which also plays the clicks,
 * chimes and recorded voice — so there is never a second context to unlock.
 */

let context: AudioContext | null = null

export function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!context) {
    // Howler makes its context on first use; asking for the volume sets it up
    Howler.autoSuspend = false
    if (!Howler.ctx) Howler.volume(Howler.volume())
    context = Howler.usingWebAudio && Howler.ctx ? Howler.ctx : null
  }
  if (!context) return null
  // 'interrupted': iOS paused it (a call, the lock screen); both resume on use
  if ((context.state as string) !== 'running') void context.resume()
  return context
}

/** Test helper: forget the context. */
export function resetAudio(): void {
  context = null
}

export interface Tone {
  at: number
  duration: number
  /** Pitch over the tone: [time 0..1, Hz] points. */
  pitch: [number, number][]
  type?: OscillatorType
  gain?: number
  /** A vowel-like colour, for the meow. */
  formant?: number
  vibrato?: number
}

export function playTone(ctx: AudioContext, out: AudioNode, tone: Tone) {
  const start = ctx.currentTime + tone.at
  const end = start + tone.duration
  const osc = ctx.createOscillator()
  osc.type = tone.type ?? 'sine'
  tone.pitch.forEach(([t, hz], index) => {
    const when = start + t * tone.duration
    if (index === 0) osc.frequency.setValueAtTime(hz, when)
    else osc.frequency.exponentialRampToValueAtTime(hz, when)
  })
  if (tone.vibrato) {
    const lfo = ctx.createOscillator()
    const depth = ctx.createGain()
    lfo.frequency.value = 7
    depth.gain.value = tone.vibrato
    lfo.connect(depth).connect(osc.frequency)
    lfo.start(start)
    lfo.stop(end)
  }
  const envelope = ctx.createGain()
  const peak = tone.gain ?? 0.3
  envelope.gain.setValueAtTime(0.0001, start)
  envelope.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.04, tone.duration * 0.2))
  envelope.gain.setValueAtTime(peak, start + tone.duration * 0.7)
  envelope.gain.exponentialRampToValueAtTime(0.0001, end)
  let node: AudioNode = osc
  if (tone.formant) {
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = tone.formant
    filter.Q.value = 2.2
    node = osc.connect(filter)
  }
  node.connect(envelope).connect(out)
  osc.start(start)
  osc.stop(end + 0.05)
}

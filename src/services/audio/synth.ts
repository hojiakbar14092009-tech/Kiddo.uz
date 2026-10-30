/*
 * The app's small synthesizer (Web Audio, no sound files): the pets' voices
 * and the sound language (Phase 29) are both made with it.
 */

let context: AudioContext | null = null

export function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  context ??= new Ctor()
  if (context.state === 'suspended') void context.resume()
  return context
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

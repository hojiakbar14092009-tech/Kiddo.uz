import { Howler } from 'howler'
import { audioManager } from './audioManager'

/*
 * How loud Kiddo's voice is right now (Phase 43), for the mascot's mouth: it opens with the
 * real loudness of the recording instead of a made-up rhythm. Read from the app's one audio
 * context (Howler's master output, where the voice plays), with an analyser that only
 * listens (it is not connected to the speakers), and only while Kiddo speaks. Not lip-sync by
 * sounds, only by loudness. The master output also carries the small tap sounds: a tap during a
 * pause in the speech opens the mouth for a moment, which is accepted.
 */

let analyser: AnalyserNode | null = null
let samples: Uint8Array<ArrayBuffer> | null = null
let unavailable = false
let connected = false
/** When the voice was last heard (null: not heard in this stretch of speech). */
let lastHeard: number | null = null
/**
 * Longer than any pause between sentences (slow pace included): silence this long means the
 * voice now plays where the analyser cannot hear it (the device's own voice) — back to rhythm.
 */
const DEAF_MS = 2000

function connect(): AnalyserNode | null {
  if (analyser || unavailable) return analyser
  try {
    const context = Howler.usingWebAudio ? Howler.ctx : null
    const master = Howler.masterGain
    if (!context || !master) return null
    const node = context.createAnalyser()
    node.fftSize = 512
    node.smoothingTimeConstant = 0.4
    analyser = node
    samples = new Uint8Array(new ArrayBuffer(node.fftSize))
  } catch {
    unavailable = true
  }
  return analyser
}

/**
 * The voice's loudness 0..1 while Kiddo's voice plays (0 in its pauses), or null when there
 * is no voice to measure (a bubble shown without sound, no Web Audio, or a recording the
 * analyser cannot hear) — the mouth then keeps its syllable rhythm.
 */
export function voiceLevel(now = performance.now()): number | null {
  if (audioManager.getStatus() !== 'speaking') {
    lastHeard = null
    listen(false)
    return null
  }
  const node = connect()
  if (!node || !samples || !listen(true)) return null
  node.getByteTimeDomainData(samples)
  let sum = 0
  for (const sample of samples) {
    const v = (sample - 128) / 128
    sum += v * v
  }
  const rms = Math.sqrt(sum / samples.length)
  if (rms > 0.01) lastHeard = now
  // nothing heard yet, or not for a long while: the voice is one the analyser cannot hear
  if (lastHeard === null || now - lastHeard > DEAF_MS) {
    lastHeard = null
    return null
  }
  return Math.max(0, Math.min(1, (rms - 0.015) * 5))
}

/** Plugs the analyser into the master output while Kiddo speaks, and out after. */
function listen(on: boolean): boolean {
  if (!analyser || on === connected) return connected
  try {
    if (on) Howler.masterGain.connect(analyser)
    else Howler.masterGain.disconnect(analyser)
    connected = on
  } catch {
    connected = false
  }
  return connected
}

/** Test helper. */
export function resetVoiceLevel(): void {
  analyser = null
  samples = null
  unavailable = false
  connected = false
  lastHeard = null
}

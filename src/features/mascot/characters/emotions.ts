/*
 * The emotion library: every mascot shows a feeling by blending the same
 * facial morph targets (built into each GLB by tools/mascots), so a face
 * changes without loading another model or texture. Robots have no brows, so
 * brow targets simply do not exist on them and are skipped.
 *
 * Negative feelings stay soft: a mascot is never frightened, angry or
 * disappointed in the child (a wrong answer makes it think, not sad).
 */

export const FACE_TARGETS = [
  'blink',
  'eyes_happy',
  'eyes_wide',
  'eyes_sleepy',
  'eyes_sad',
  'look_left',
  'look_right',
  'look_up',
  'look_down',
  'mouth_smile',
  'mouth_open',
  'mouth_o',
  'mouth_sad',
  'mouth_flat',
  'brows_up',
  'brows_worried',
  'brow_think',
] as const

export type FaceTarget = (typeof FACE_TARGETS)[number]

export const EMOTIONS = [
  'neutral',
  'happy',
  'excited',
  'surprised',
  'thinking',
  'curious',
  'encouraging',
  'celebrate',
  'listening',
  'speaking',
  'sleepy',
  'gentle_sad',
  'confused',
] as const

export type Emotion = (typeof EMOTIONS)[number]

export type FaceWeights = Partial<Record<FaceTarget, number>>

export const EMOTION_FACES: Readonly<Record<Emotion, FaceWeights>> = {
  neutral: { mouth_smile: 0.1 },
  happy: { mouth_smile: 0.75, eyes_happy: 0.35, brows_up: 0.2 },
  excited: { mouth_smile: 1, eyes_wide: 0.55, brows_up: 0.6 },
  surprised: { mouth_o: 1, eyes_wide: 1, brows_up: 1 },
  thinking: { mouth_flat: 0.8, look_up: 0.7, look_left: 0.35, brow_think: 1 },
  curious: { eyes_wide: 0.4, look_left: 0.3, brow_think: 0.6, mouth_o: 0.35 },
  encouraging: { mouth_smile: 0.6, eyes_happy: 0.5, brows_up: 0.3 },
  celebrate: { eyes_happy: 1, mouth_smile: 1, brows_up: 0.5 },
  listening: { look_up: 0.2, brows_up: 0.3, mouth_smile: 0.25 },
  speaking: { mouth_smile: 0.3, brows_up: 0.15 },
  sleepy: { eyes_sleepy: 1, mouth_flat: 0.4 },
  // soft: only for the mascot's own small moments (a story's sad part), never at the child
  gentle_sad: { eyes_sad: 0.6, mouth_sad: 0.5, brows_worried: 0.7 },
  confused: { brow_think: 1, brows_worried: 0.3, mouth_flat: 0.7, look_right: 0.3 },
}

/** Targets that already close the eyes: a blink on top would overshoot. */
const CLOSING: readonly FaceTarget[] = ['eyes_happy', 'eyes_sleepy']

/** How strongly a blink may still close the eyes on top of this face (0…1). */
export function blinkRoom(weights: FaceWeights): number {
  const closed = CLOSING.reduce((sum, key) => sum + (weights[key] ?? 0), 0)
  return Math.max(0, 1 - closed)
}

/** Frame-rate independent move of a face towards a target over about `ms`. */
export function blendFace(
  current: FaceWeights,
  target: FaceWeights,
  dtSeconds: number,
  ms: number,
): FaceWeights {
  // ~95 % of the way after `ms`
  const k = 1 - Math.exp((-3 * dtSeconds * 1000) / Math.max(1, ms))
  const out: FaceWeights = {}
  for (const key of FACE_TARGETS) {
    const from = current[key] ?? 0
    const to = target[key] ?? 0
    const value = from + (to - from) * k
    if (Math.abs(value) > 1e-3) out[key] = value
  }
  return out
}

/**
 * Bounded pseudo-random blinking: the next blink comes 2.2–6 s after the last,
 * sometimes as a quick double blink, never at a fixed robotic interval. Pure
 * state stepped by the caller's frame time, so it pauses when rendering does.
 */
export class Blinker {
  private seed: number
  private wait: number
  private phase = -1
  private double = false

  constructor(seed = 1) {
    this.seed = seed >>> 0 || 1
    this.wait = this.next(2.2, 6)
  }

  private random(): number {
    // xorshift32: deterministic per instance (tests), different per mascot
    let x = this.seed
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    this.seed = x >>> 0
    return this.seed / 0x1_0000_0000
  }

  private next(min: number, max: number): number {
    return min + (max - min) * this.random()
  }

  /** Blink amount for this frame (0 open … 1 closed). */
  step(dt: number): number {
    if (this.phase < 0) {
      this.wait -= dt
      if (this.wait > 0) return 0
      this.phase = 0
      this.double = this.random() < 0.15
    }
    this.phase += dt
    const length = 0.14
    const t = this.phase / length
    if (t >= 1) {
      if (this.double) {
        this.double = false
        this.phase = -0.08 / length
        return 0
      }
      this.phase = -1
      this.wait = this.next(2.2, 6)
      return 0
    }
    if (t < 0) return 0
    return t < 0.4 ? t / 0.4 : 1 - (t - 0.4) / 0.6
  }
}

/**
 * Talking mouth without phoneme data: the speech audio gives no timing, so the
 * mouth opens on irregular syllable-like beats (5–9 per second) while speech
 * plays. This is not lip-sync and is not claimed to be.
 */
export class Syllables {
  private time = 0
  private beat = 0.15
  private open = 0
  private target = 0.7
  private seed: number

  constructor(seed = 7) {
    this.seed = seed >>> 0 || 7
  }

  private random(): number {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0
    return this.seed / 0x1_0000_0000
  }

  step(dt: number, speaking: boolean): number {
    if (!speaking) {
      this.open = Math.max(0, this.open - dt * 8)
      return this.open
    }
    this.time += dt
    if (this.time >= this.beat) {
      this.time = 0
      this.beat = 0.11 + this.random() * 0.09
      this.target = this.target > 0.3 ? 0.05 + this.random() * 0.15 : 0.45 + this.random() * 0.5
    }
    this.open += (this.target - this.open) * Math.min(1, dt * 22)
    return this.open
  }
}

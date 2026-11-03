/*
 * How a story character feels and moves (Phase 74), pure so it is tested without
 * a browser. The 3D stage asks, frame by frame, where the hero is and how it is
 * squashed or leaning; the numbers are small – a breath, a hop, a lean – so the
 * flat 3D picture reads as a living, feeling creature.
 */

export type Mood = 'happy' | 'curious' | 'surprised' | 'joyful' | 'sleepy'

/** The small face shown above the hero for each mood. */
export const MOOD_FACE: Record<Mood, string> = {
  happy: '😊',
  curious: '🤔',
  surprised: '😮',
  joyful: '🥳',
  sleepy: '😴',
}

export interface Pose {
  /** Height above the ground, in character sizes. */
  lift: number
  /** Sideways step, in world units. */
  shift: number
  /** Width and height scale (squash and stretch). */
  sx: number
  sy: number
  /** Lean, radians. */
  lean: number
}

const decay = (t: number, over: number) => Math.max(0, 1 - t / over)

/** The hero's pose `t` seconds into a page. */
export function poseAt(mood: Mood, t: number): Pose {
  // every mood breathes: a little taller and narrower, then back
  const breath = Math.sin(t * (mood === 'sleepy' ? 1.3 : 2.4))
  let sx = 1 - breath * 0.018
  let sy = 1 + breath * (mood === 'sleepy' ? 0.04 : 0.028)
  let lift = 0
  let shift = 0
  let lean = 0
  switch (mood) {
    case 'happy': {
      const hop = Math.abs(Math.sin(t * 3))
      lift = hop * 0.14
      // landing squashes, the air stretches
      const land = Math.pow(1 - hop, 6)
      sy += hop * 0.05 - land * 0.09
      sx += land * 0.07 - hop * 0.03
      break
    }
    case 'curious':
      // looks this way and that, a step each way
      lean = Math.sin(t * 1.3) * 0.12
      shift = Math.sin(t * 0.6) * 0.22
      break
    case 'surprised': {
      // a jump at once, then a tremble that settles
      const jump = t < 0.6 ? Math.sin((t / 0.6) * Math.PI) : 0
      lift = jump * 0.4
      sy += jump * 0.12
      sx -= jump * 0.06
      lean = Math.sin(t * 28) * 0.05 * decay(t - 0.6, 1.2) * (t > 0.6 ? 1 : 0)
      break
    }
    case 'joyful': {
      const hop = Math.abs(Math.sin(t * 4.2))
      lift = hop * 0.3
      lean = Math.sin(t * 8.4) * 0.09
      const land = Math.pow(1 - hop, 6)
      sy += hop * 0.08 - land * 0.12
      sx += land * 0.1 - hop * 0.04
      break
    }
    case 'sleepy':
      lean = 0.12 + Math.sin(t * 0.7) * 0.04
      break
  }
  return { lift, shift, sx, sy, lean }
}

export type Weather =
  'leaves' | 'petals' | 'snow' | 'bubbles' | 'fireflies' | 'stars' | 'dust' | 'confetti'

/** Each particle's start in a box in front of the hills; fixed (seeded) so pages look alike. */
export function seededPoints(count: number, seed = 7): [number, number, number][] {
  let s = seed
  const next = () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
  return Array.from({ length: count }, () => [next() * 12 - 6, next() * 5, next() * 6 - 4.5])
}

/** Where a particle is `t` seconds on (it wraps round the box). */
export function particleAt(
  weather: Weather,
  start: readonly [number, number, number],
  index: number,
  t: number,
): [number, number, number] {
  const [x, y, z] = start
  const wrapY = (v: number) => ((v % 5) + 5) % 5
  const wrapX = (v: number) => ((((v + 6) % 12) + 12) % 12) - 6
  const phase = index * 1.7
  switch (weather) {
    case 'snow':
      return [x + Math.sin(t * 0.8 + phase) * 0.3, wrapY(y - t * 0.45), z]
    case 'leaves':
    case 'petals':
      return [x + Math.sin(t * 1.1 + phase) * 0.6, wrapY(y - t * 0.3), z]
    case 'confetti':
      return [x + Math.sin(t * 2 + phase) * 0.25, wrapY(y - t * 0.9), z]
    case 'bubbles':
      return [x + Math.sin(t * 1.4 + phase) * 0.15, wrapY(y + t * 0.5), z]
    case 'dust':
      return [wrapX(x + t * 0.6), y * 0.4 + Math.sin(t + phase) * 0.1, z]
    case 'fireflies':
      return [
        x + Math.sin(t * 0.5 + phase) * 0.8,
        0.4 + y * 0.5 + Math.sin(t * 0.9 + phase) * 0.3,
        z,
      ]
    case 'stars':
      return [x * 1.2, 2.6 + y * 0.6, -6]
  }
}

/** The colours of a weather's particles (one is picked per particle). */
export const WEATHER_COLOURS: Record<Weather, readonly string[]> = {
  leaves: ['#F2A541', '#E86F3A', '#8CC152'],
  petals: ['#FFB3C7', '#FFFFFF', '#FFD6E4'],
  snow: ['#FFFFFF'],
  bubbles: ['#DDF4FF', '#FFFFFF'],
  fireflies: ['#FFF3A0', '#E8FF9A'],
  stars: ['#FFF3B0', '#FFFFFF'],
  dust: ['#F1D9A8', '#E7C98C'],
  confetti: ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C77DFF'],
}

import { describe, expect, it } from 'vitest'
import {
  MOOD_FACE,
  particleAt,
  poseAt,
  seededPoints,
  WEATHER_COLOURS,
  type Mood,
  type Weather,
} from './life'

const MOODS: Mood[] = ['happy', 'curious', 'surprised', 'joyful', 'sleepy']
const WEATHERS = Object.keys(WEATHER_COLOURS) as Weather[]

describe('how a story hero moves (Phase 74)', () => {
  it('every mood breathes and stays small and readable', () => {
    for (const mood of MOODS) {
      expect(MOOD_FACE[mood]).toBeTruthy()
      const sizes = new Set<number>()
      for (let t = 0; t < 6; t += 0.05) {
        const pose = poseAt(mood, t)
        sizes.add(Math.round(pose.sy * 1000))
        expect(pose.sx).toBeGreaterThan(0.8)
        expect(pose.sy).toBeGreaterThan(0.8)
        expect(pose.sy).toBeLessThan(1.2)
        expect(Math.abs(pose.lean)).toBeLessThan(0.25)
        expect(pose.lift).toBeGreaterThanOrEqual(0)
        expect(pose.lift).toBeLessThan(0.45)
      }
      // it is never frozen
      expect(sizes.size).toBeGreaterThan(3)
    }
  })

  it('joy jumps higher than a happy hop, a surprise jumps at once and then settles', () => {
    const top = (mood: Mood) =>
      Math.max(...Array.from({ length: 200 }, (_, i) => poseAt(mood, i * 0.03).lift))
    expect(top('joyful')).toBeGreaterThan(top('happy'))
    expect(poseAt('surprised', 0.3).lift).toBeGreaterThan(0.3)
    expect(Math.abs(poseAt('surprised', 4).lean)).toBeLessThan(0.001)
  })

  it('landing squashes: wider and lower than in the air', () => {
    const landing = poseAt('happy', 0)
    const air = poseAt('happy', Math.PI / 6)
    expect(landing.sx).toBeGreaterThan(air.sx)
    expect(landing.sy).toBeLessThan(air.sy)
  })
})

describe('the weather of a place', () => {
  it('particles stay in the box round the stage, whatever the time', () => {
    const starts = seededPoints(40)
    for (const weather of WEATHERS) {
      for (const t of [0, 1.3, 17, 250]) {
        starts.forEach((start, index) => {
          const [x, y, z] = particleAt(weather, start, index, t)
          expect(Math.abs(x)).toBeLessThan(8)
          expect(y).toBeGreaterThanOrEqual(-0.5)
          expect(y).toBeLessThan(6.5)
          expect(z).toBeGreaterThan(-7)
          expect(z).toBeLessThan(2)
        })
      }
    }
  })

  it('snow falls, bubbles rise', () => {
    const start = [0, 3, 0] as const
    expect(particleAt('snow', start, 0, 1)[1]).toBeLessThan(3)
    expect(particleAt('bubbles', start, 0, 1)[1]).toBeGreaterThan(3)
  })

  it('the same seed gives the same particles (pages look alike every time)', () => {
    expect(seededPoints(5, 3)).toEqual(seededPoints(5, 3))
  })
})

import { describe, expect, it } from 'vitest'
import { MARKER_GAP, MARKER_SIZE, clamp, separate } from './markers'

describe('marker placement', () => {
  it('pushes overlapping buttons apart until a finger can tell them apart', () => {
    const min = MARKER_SIZE + MARKER_GAP
    const points = [
      { x: 100, y: 100 },
      { x: 110, y: 104 },
      { x: 100, y: 100 },
    ]
    separate(points, min, undefined, 20)
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const d = Math.hypot(points[i]!.x - points[j]!.x, points[i]!.y - points[j]!.y)
        expect(d).toBeGreaterThanOrEqual(min - 0.5)
      }
    }
  })

  it('leaves buttons that are far apart where they are', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
    ]
    separate(points, 54)
    expect(points).toEqual([
      { x: 0, y: 0 },
      { x: 200, y: 0 },
    ])
  })

  it('keeps points apart and inside the frame, even when they meet at an edge', () => {
    const min = MARKER_SIZE + MARKER_GAP
    const frame = { width: 233, height: 233, inset: MARKER_SIZE / 2 }
    let seed = 7
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280), seed / 233280)
    for (let run = 0; run < 300; run += 1) {
      const points = [0, 1, 2].map(() => ({ x: rnd() * 300 - 30, y: rnd() * 300 - 30 }))
      separate(points, min, frame)
      for (const p of points) {
        expect(p.x).toBeGreaterThanOrEqual(frame.inset - 0.01)
        expect(p.x).toBeLessThanOrEqual(frame.width - frame.inset + 0.01)
        expect(p.y).toBeGreaterThanOrEqual(frame.inset - 0.01)
        expect(p.y).toBeLessThanOrEqual(frame.height - frame.inset + 0.01)
      }
      for (let i = 0; i < 3; i += 1)
        for (let j = i + 1; j < 3; j += 1) {
          const d = Math.hypot(points[i]!.x - points[j]!.x, points[i]!.y - points[j]!.y)
          expect(d).toBeGreaterThanOrEqual(MARKER_SIZE)
        }
    }
  })

  it('clamps inside the frame', () => {
    expect(clamp(-5, 24, 276)).toBe(24)
    expect(clamp(400, 24, 276)).toBe(276)
  })
})

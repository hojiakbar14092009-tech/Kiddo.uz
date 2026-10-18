import { describe, expect, it } from 'vitest'
import { AUTO_PASS, densify, passes, scoreTrace, type Point } from './traceScoring'

/** A vertical bar like the letter “I”, 10 px wide and 200 px tall. */
const glyph: Point[] = []
for (let y = 0; y <= 200; y += 4) for (let x = 95; x <= 105; x += 4) glyph.push({ x, y })

const line = (x: number, y0: number, y1: number) => densify({ x, y: y0 }, { x, y: y1 }, 3)

describe('scoreTrace', () => {
  it('passes a drawing that follows the whole letter', () => {
    const score = scoreTrace(glyph, line(100, 0, 200), 14)
    expect(score.coverage).toBeGreaterThan(0.95)
    expect(passes(score, AUTO_PASS)).toBe(true)
  })

  it('does not pass half a letter', () => {
    expect(passes(scoreTrace(glyph, line(100, 0, 90), 14))).toBe(false)
  })

  it('does not pass scribbles beside the letter', () => {
    const scribble = [...line(100, 0, 200), ...line(180, 0, 200), ...line(20, 0, 200)]
    const score = scoreTrace(glyph, scribble, 14)
    expect(score.coverage).toBeGreaterThan(0.9)
    expect(score.precision).toBeLessThan(0.5)
    expect(passes(score)).toBe(false)
  })

  it('scores nothing for an empty drawing', () => {
    expect(scoreTrace(glyph, [], 14)).toEqual({ coverage: 0, precision: 0 })
  })
})

describe('densify', () => {
  it('fills the gap between two far pointer samples', () => {
    const points = densify({ x: 0, y: 0 }, { x: 0, y: 30 }, 3)
    expect(points).toHaveLength(10)
    expect(points.at(-1)).toEqual({ x: 0, y: 30 })
  })
})

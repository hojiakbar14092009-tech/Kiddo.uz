import { describe, expect, it } from 'vitest'
import { arc, join, line, resample, strokeLength, toSvgPath } from './paths'
import { boardMetrics, guidePoints, scorePath, STROKE_DONE, tracedStrokes } from './pathScoring'
import { densify, type Point } from './traceScoring'

describe('path helpers', () => {
  it('builds a half circle arc from its start to its end angle', () => {
    const points = arc(50, 50, 10, 10, 180, 360)
    expect(points[0]?.x).toBeCloseTo(40)
    expect(points.at(-1)?.x).toBeCloseTo(60)
    // through the top: 270° is up on screen
    expect(Math.min(...points.map((point) => point.y))).toBeCloseTo(40)
  })

  it('resamples a line at even steps, keeping both ends', () => {
    const points = resample(line([0, 0], [10, 0]), 2)
    expect(points.map((point) => point.x)).toEqual([0, 2, 4, 6, 8, 10])
  })

  it('joins pieces without doubling the shared point', () => {
    expect(join(line([0, 0], [5, 0]), line([5, 0], [5, 5]))).toHaveLength(3)
  })

  it('measures and prints a stroke', () => {
    expect(strokeLength(line([0, 0], [3, 4]))).toBe(5)
    expect(toSvgPath(line([0, 0], [3, 4]))).toBe('M0.0 0.0 L3.0 4.0')
  })
})

describe('scorePath', () => {
  const size = 400
  const { radius } = boardMetrics(size)
  const strokes = [line([20, 20], [80, 20]), line([50, 20], [50, 90])]
  const guides = guidePoints(strokes, size)
  const draw = (from: Point, to: Point) =>
    densify({ x: from.x * 4, y: from.y * 4 }, { x: to.x * 4, y: to.y * 4 }, 3)

  it('tracks which stroke is next', () => {
    const first = draw({ x: 20, y: 20 }, { x: 80, y: 20 })
    const score = scorePath(guides, first, radius)
    expect(score.strokes[0]).toBeGreaterThan(STROKE_DONE)
    expect(score.current).toBe(1)
    expect(tracedStrokes(score)).toBe(1)

    const both = [...first, ...draw({ x: 50, y: 20 }, { x: 50, y: 90 })]
    const done = scorePath(guides, both, radius)
    expect(done.current).toBe(2)
    expect(done.coverage).toBeGreaterThan(0.95)
    expect(done.precision).toBeGreaterThan(0.95)
  })

  it('starts at the first stroke with nothing drawn', () => {
    expect(scorePath(guides, [], radius)).toMatchObject({ coverage: 0, current: 0 })
  })

  it('keeps the lines thick enough for small fingers on small boards', () => {
    expect(boardMetrics(200).radius).toBe(16)
    expect(boardMetrics(600).ink).toBeGreaterThanOrEqual(30)
  })
})

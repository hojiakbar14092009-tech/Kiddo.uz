import { describe, expect, it } from 'vitest'
import { BOX, resample, strokeLength } from '@/components/trace/paths'
import { boardMetrics, guidePoints, scorePath } from '@/components/trace/pathScoring'
import { AUTO_PASS, densify, PASS, passes, type Point } from '@/components/trace/traceScoring'
import {
  findTraceItem,
  nextTraceItem,
  SHAPE_IDS,
  traceActivity,
  TRACE_ITEMS,
  traceStrand,
  type TraceItem,
} from './traceItems'
import { traceResult } from './traceResult'

const ALL = [...TRACE_ITEMS.numbers, ...TRACE_ITEMS.shapes]
const SIZE = 400
const { radius } = boardMetrics(SIZE)

/** A child following every stroke exactly, in pixels (`shift` moves it off the path). */
function follow(item: TraceItem, shift = 0, share = 1): Point[] {
  const k = SIZE / BOX
  return item.strokes.flatMap((whole) => {
    const stroke = resample(whole, 1)
    const end = Math.max(2, Math.ceil(stroke.length * share))
    const points = stroke.slice(0, end).map((p) => ({ x: p.x * k + shift, y: p.y * k + shift }))
    return points.slice(1).flatMap((point, i) => densify(points[i] ?? point, point, 3))
  })
}

describe('trace items', () => {
  it('has the numbers 0–10 in order and the five shapes', () => {
    expect(TRACE_ITEMS.numbers.map((item) => item.id)).toEqual(
      Array.from({ length: 11 }, (_, i) => String(i)),
    )
    expect(TRACE_ITEMS.shapes.map((item) => item.id)).toEqual([...SHAPE_IDS])
  })

  it.each(ALL.map((item) => [`${item.set}:${item.id}`, item] as const))(
    '%s has valid strokes inside the box',
    (_, item) => {
      expect(item.strokes.length).toBeGreaterThan(0)
      for (const stroke of item.strokes) {
        expect(stroke.length).toBeGreaterThanOrEqual(2)
        expect(strokeLength(stroke)).toBeGreaterThan(30)
        for (const point of stroke) {
          expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true)
          expect(point.x).toBeGreaterThanOrEqual(5)
          expect(point.x).toBeLessThanOrEqual(95)
          expect(point.y).toBeGreaterThanOrEqual(5)
          expect(point.y).toBeLessThanOrEqual(95)
        }
      }
    },
  )

  it.each(ALL.map((item) => [`${item.set}:${item.id}`, item] as const))(
    '%s is praised when followed and not when a third is drawn or beside it',
    (_, item) => {
      const guides = guidePoints(item.strokes, SIZE)
      const full = scorePath(guides, follow(item), radius)
      expect(passes(full, AUTO_PASS)).toBe(true)
      expect(full.current).toBe(item.strokes.length)

      expect(passes(scorePath(guides, follow(item, 0, 0.3), radius), PASS)).toBe(false)
      expect(passes(scorePath(guides, follow(item, radius * 3), radius), PASS)).toBe(false)
    },
  )
})

describe('trace activity', () => {
  it('names the activity and the strand for the universe', () => {
    const seven = findTraceItem('numbers', '7')!
    const circle = findTraceItem('shapes', 'circle')!
    expect(traceActivity(seven)).toBe('trace:number:7')
    expect(traceStrand(seven)).toBe('number')
    expect(traceActivity(circle)).toBe('trace:shape:circle')
    expect(traceStrand(circle)).toBe('art')
  })

  it('goes on to the next item and stops after the last', () => {
    expect(nextTraceItem('numbers', '9')?.id).toBe('10')
    expect(nextTraceItem('numbers', '10')).toBeUndefined()
    expect(nextTraceItem('shapes', 'circle')?.id).toBe('square')
  })

  it('reports traced strokes, independent only without a second try', () => {
    const four = findTraceItem('numbers', '4')!
    const score = scorePath(guidePoints(four.strokes, SIZE), follow(four), radius)
    expect(traceResult(score, four.strokes.length, 0)).toEqual({
      correct: 2,
      total: 2,
      independent: 2,
    })
    expect(traceResult(score, four.strokes.length, 1)).toEqual({
      correct: 2,
      total: 2,
      independent: 0,
    })
  })
})

import { resample, scaleStroke, type Stroke } from './paths'
import { scoreTrace, type Point, type TraceScore } from './traceScoring'

/** A stroke counts as done (the start dot moves on) when this much of it is covered. */
export const STROKE_DONE = 0.75
/** A finished line mostly off the path earns a gentle hint, never a "wrong". */
export const OFF_PATH = 0.45
/** Distance between guide samples, in pixels. */
const GUIDE_STEP = 6

export interface PathScore extends TraceScore {
  /** Coverage of each stroke (0–1), in drawing order. */
  strokes: number[]
  /** The first stroke not yet done (= strokes.length when all are). */
  current: number
}

/** The guide of each stroke as pixel points on a board of `size` px. */
export function guidePoints(strokes: readonly Stroke[], size: number): Point[][] {
  return strokes.map((stroke) => resample(scaleStroke(stroke, size), GUIDE_STEP))
}

/** How well `drawn` follows the strokes; `radius` is how far off the line may be (px). */
export function scorePath(
  guides: readonly (readonly Point[])[],
  drawn: readonly Point[],
  radius: number,
): PathScore {
  const all = guides.flat()
  const overall = scoreTrace(all, drawn, radius)
  const strokes = guides.map((guide) => scoreTrace(guide, drawn, radius).coverage)
  const current = strokes.findIndex((coverage) => coverage < STROKE_DONE)
  return { ...overall, strokes, current: current === -1 ? strokes.length : current }
}

/** Strokes counted as traced for the result (`correct` of `total`). */
export function tracedStrokes(score: PathScore): number {
  return score.strokes.filter((coverage) => coverage >= STROKE_DONE).length
}

/** Pixel sizes of the board's lines, from its width. Large on purpose for small fingers. */
export function boardMetrics(size: number) {
  const radius = Math.max(16, size * 0.075)
  return {
    /** How far off the line still counts as on it. */
    radius,
    /** The pale band the child follows (its edge is a bit inside `radius`). */
    band: radius * 1.6,
    /** The child's ink. */
    ink: Math.max(12, size * 0.055),
  }
}

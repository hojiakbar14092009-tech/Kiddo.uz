import { tracedStrokes, type PathScore } from '@/components/trace/pathScoring'

/**
 * What a finished trace reports to the universe. `total` is the number of
 * strokes, `correct` the strokes the child really drew over (at least one,
 * since the shape passed), `independent` the same when the child needed no
 * second try, otherwise 0.
 */
export function traceResult(score: PathScore, strokes: number, failedChecks: number) {
  const total = Math.max(1, strokes)
  const correct = Math.min(total, Math.max(1, tracedStrokes(score)))
  return { correct, total, independent: failedChecks === 0 ? correct : 0 }
}

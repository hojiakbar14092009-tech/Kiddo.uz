export interface Point {
  x: number
  y: number
}

export interface TraceScore {
  /** Share of the letter’s shape the child drew over (0–1). */
  coverage: number
  /** Share of the child’s line that stayed on the letter (0–1). */
  precision: number
}

/** Good enough to praise when the child presses “Done”. */
export const PASS = { coverage: 0.55, precision: 0.7 } as const
/** So clearly done that we praise without waiting for “Done”. */
export const AUTO_PASS = { coverage: 0.85, precision: 0.8 } as const

function bucketKey(x: number, y: number) {
  return `${x},${y}`
}

/** Spatial hash so scoring stays fast with thousands of points on a phone. */
function buildIndex(points: readonly Point[], cell: number) {
  const index = new Map<string, Point[]>()
  for (const point of points) {
    const key = bucketKey(Math.floor(point.x / cell), Math.floor(point.y / cell))
    const bucket = index.get(key)
    if (bucket) bucket.push(point)
    else index.set(key, [point])
  }
  return index
}

function hasNeighbour(index: Map<string, Point[]>, point: Point, radius: number): boolean {
  const cx = Math.floor(point.x / radius)
  const cy = Math.floor(point.y / radius)
  const r2 = radius * radius
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (const other of index.get(bucketKey(cx + dx, cy + dy)) ?? []) {
        const ex = other.x - point.x
        const ey = other.y - point.y
        if (ex * ex + ey * ey <= r2) return true
      }
    }
  }
  return false
}

/**
 * Compares the child’s drawing with the letter shape. Both are point clouds
 * in the same pixel space; `radius` is how far off the line may be.
 */
export function scoreTrace(
  glyph: readonly Point[],
  drawn: readonly Point[],
  radius: number,
): TraceScore {
  if (glyph.length === 0 || drawn.length === 0) return { coverage: 0, precision: 0 }
  const drawnIndex = buildIndex(drawn, radius)
  const glyphIndex = buildIndex(glyph, radius)
  const covered = glyph.filter((point) => hasNeighbour(drawnIndex, point, radius)).length
  const onLetter = drawn.filter((point) => hasNeighbour(glyphIndex, point, radius)).length
  return { coverage: covered / glyph.length, precision: onLetter / drawn.length }
}

export function passes(
  score: TraceScore,
  threshold: { coverage: number; precision: number } = PASS,
) {
  return score.coverage >= threshold.coverage && score.precision >= threshold.precision
}

/** Adds points between pointer samples so fast strokes leave no gaps. */
export function densify(from: Point, to: Point, step: number): Point[] {
  const distance = Math.hypot(to.x - from.x, to.y - from.y)
  const count = Math.max(1, Math.ceil(distance / step))
  return Array.from({ length: count }, (_, i) => {
    const t = (i + 1) / count
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }
  })
}

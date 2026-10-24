/* Screen placement of the numbered points on a 3D model. */

/** The numbered buttons are 48 px (`size-12`). */
export const MARKER_SIZE = 48

/** Space kept between two numbered buttons, so a finger hits the one it aims at. */
export const MARKER_GAP = 6

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

export interface Frame {
  width: number
  height: number
  /** Distance kept from each edge (half a button). */
  inset: number
}

/**
 * Pushes screen points apart until no two are closer than `min` (each moves half
 * the overlap, along the line between them). Points on the same spot split sideways.
 * With a `frame`, every point is kept inside it on each round, so a point held at
 * an edge is never pulled back onto its neighbour by a clamp afterwards.
 */
export function separate(
  points: { x: number; y: number }[],
  min: number,
  frame?: Frame,
  rounds = 12,
): void {
  const keepIn = (p: { x: number; y: number }) => {
    if (!frame) return
    p.x = clamp(p.x, frame.inset, frame.width - frame.inset)
    p.y = clamp(p.y, frame.inset, frame.height - frame.inset)
  }
  points.forEach(keepIn)
  for (let round = 0; round < rounds; round += 1) {
    let moved = false
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const a = points[i]!
        const b = points[j]!
        let dx = b.x - a.x
        let dy = b.y - a.y
        let dist = Math.hypot(dx, dy)
        if (dist >= min - 0.01) continue
        if (dist < 0.01) {
          // the same spot: split sideways, or up and down when the sides are walls
          const roomX = frame ? frame.width - 2 * frame.inset : Infinity
          dx = roomX >= min ? 1 : 0
          dy = roomX >= min ? 0 : 1
          dist = 1
        }
        const push = (min - dist) / 2
        a.x -= (dx / dist) * push
        a.y -= (dy / dist) * push
        b.x += (dx / dist) * push
        b.y += (dy / dist) * push
        keepIn(a)
        keepIn(b)
        moved = true
      }
    }
    if (!moved) return
  }
}

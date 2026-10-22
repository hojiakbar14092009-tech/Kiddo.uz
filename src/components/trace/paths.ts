import type { Point } from './traceScoring'

/*
 * Tracing shapes as data. Every shape lives in a 0–100 box (x to the right,
 * y down, like the screen). A shape is a list of strokes; a stroke is a
 * polyline drawn in order, from its first point (the start dot) to its last.
 * Curves are built from arcs and resampled, so the board can draw the guide,
 * move the demo dot along it and score the child's line from the same data.
 */

export type Stroke = readonly Point[]

export const BOX = 100
const DEG = Math.PI / 180

export function line(...points: readonly (readonly [number, number])[]): Point[] {
  return points.map(([x, y]) => ({ x, y }))
}

/**
 * An elliptical arc around (cx, cy) from `from`° to `to`° (0° = right, 90° =
 * down, so a growing angle turns clockwise on screen).
 */
export function arc(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  from: number,
  to: number,
  steps = Math.max(8, Math.ceil(Math.abs(to - from) / 6)),
): Point[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const angle = (from + ((to - from) * i) / steps) * DEG
    return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) }
  })
}

/** A quadratic curve from `a` to `b` bending towards `control`. */
export function curve(a: Point, control: Point, b: Point, steps = 16): Point[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps
    const u = 1 - t
    return {
      x: u * u * a.x + 2 * u * t * control.x + t * t * b.x,
      y: u * u * a.y + 2 * u * t * control.y + t * t * b.y,
    }
  })
}

/** Joins pieces into one stroke, dropping a point repeated at a joint. */
export function join(...pieces: readonly (readonly Point[])[]): Point[] {
  const out: Point[] = []
  for (const piece of pieces) {
    for (const point of piece) {
      const last = out.at(-1)
      if (last && Math.hypot(last.x - point.x, last.y - point.y) < 0.01) continue
      out.push(point)
    }
  }
  return out
}

export function strokeLength(stroke: Stroke): number {
  let length = 0
  for (let i = 1; i < stroke.length; i += 1) {
    const a = stroke[i - 1]
    const b = stroke[i]
    if (a && b) length += Math.hypot(b.x - a.x, b.y - a.y)
  }
  return length
}

/** Points every `step` units along the stroke (both ends included). */
export function resample(stroke: Stroke, step: number): Point[] {
  const first = stroke[0]
  if (!first) return []
  const out: Point[] = [first]
  let carry = 0
  for (let i = 1; i < stroke.length; i += 1) {
    const a = stroke[i - 1]
    const b = stroke[i]
    if (!a || !b) continue
    const segment = Math.hypot(b.x - a.x, b.y - a.y)
    let at = step - carry
    while (at <= segment) {
      const t = at / segment
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
      at += step
    }
    carry = segment - (at - step)
  }
  const last = stroke.at(-1)
  const tail = out.at(-1)
  if (last && tail && Math.hypot(last.x - tail.x, last.y - tail.y) > step * 0.25) out.push(last)
  return out
}

/** The stroke as an SVG path (`M x y L …`) in box units. */
export function toSvgPath(stroke: Stroke): string {
  return stroke
    .map((point, i) => `${i === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ')
}

/** Box units → pixels on a square board of `size` px. */
export function scaleStroke(stroke: Stroke, size: number): Point[] {
  const k = size / BOX
  return stroke.map((point) => ({ x: point.x * k, y: point.y * k }))
}

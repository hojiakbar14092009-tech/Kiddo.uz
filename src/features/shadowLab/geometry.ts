/*
 * Shadow Lab geometry (Phase 34): shadows are computed, never drawn by hand.
 *
 * The scene, seen from the side: a point light, a flat cut-out object and a
 * wall, along the depth axis z (light at z = 0, wall at z = WALL_Z). A point
 * P = (x, y, z) of the object throws its shadow where the ray from the light
 * through P meets the wall: S = L + (P − L) · (WALL_Z − L.z) / (P.z − L.z).
 * So the shadow grows as the object nears the light, moves away from the
 * light's side, turns as the object turns, and narrows as the object tilts
 * (turns about its vertical axis) — the real relationship, in one formula.
 */

export type Point = readonly [number, number]
export type Polygon = readonly Point[]

/** The wall's depth; the light sits at depth 0. */
export const WALL_Z = 10

export interface Light {
  /** Left/right and up/down of the light, in wall units (the wall spans −5 … 5). */
  x: number
  y: number
  /** How far the light has moved towards the wall (depth; 0 = its usual place). */
  z?: number
}

export interface Placement {
  /** Depth of the object between the light (0) and the wall (WALL_Z). */
  z: number
  /** Where the object's centre is, left/right and up/down. */
  x: number
  y: number
  /** Turn in its own plane, degrees. */
  rotate: number
  /** Turn about its vertical axis (towards/away from the wall), degrees; 0 = facing the wall. */
  tilt: number
}

/** Object outlines in their own units (about −1 … 1), centred on 0. */
export const SHAPES = {
  square: [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ],
  triangle: [
    [0, 1.1],
    [1.1, -0.9],
    [-1.1, -0.9],
  ],
  // an arrow: its direction shows how the object (and its shadow) turn
  arrow: [
    [-1, -0.35],
    [0.2, -0.35],
    [0.2, -0.85],
    [1.1, 0],
    [0.2, 0.85],
    [0.2, 0.35],
    [-1, 0.35],
  ],
  // an L: not symmetric, so its mirror image is a different shadow
  ell: [
    [-0.9, -1],
    [0.9, -1],
    [0.9, -0.4],
    [-0.3, -0.4],
    [-0.3, 1],
    [-0.9, 1],
  ],
  circle: Array.from(
    { length: 24 },
    (_, i) => [Math.cos((i / 24) * Math.PI * 2), Math.sin((i / 24) * Math.PI * 2)] as const,
  ),
} as const satisfies Record<string, Polygon>
export type ShapeId = keyof typeof SHAPES

/** The object's corners in the scene (x, y, z). */
export function placePoints(shape: Polygon, at: Placement): [number, number, number][] {
  const r = (at.rotate * Math.PI) / 180
  const t = (at.tilt * Math.PI) / 180
  return shape.map(([px, py]) => {
    // turn in its plane, then tilt about the vertical axis
    const x = px * Math.cos(r) - py * Math.sin(r)
    const y = px * Math.sin(r) + py * Math.cos(r)
    return [at.x + x * Math.cos(t), at.y + y, at.z + x * Math.sin(t)]
  })
}

/** The shadow of an object on the wall: the central projection from the light. */
export function shadowOf(shape: Polygon, at: Placement, light: Light): Polygon {
  const lz = light.z ?? 0
  return placePoints(shape, at).map(([x, y, z]) => {
    // a point at (or behind) the light's depth would throw no shadow: keep it just in front
    const k = (WALL_Z - lz) / Math.max(0.05, z - lz)
    return [light.x + (x - light.x) * k, light.y + (y - light.y) * k] as const
  })
}

/** Is a point inside a polygon (even–odd rule)? */
export function inside(point: Point, polygon: Polygon): boolean {
  const [x, y] = point
  let hit = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i]!
    const [xj, yj] = polygon[j]!
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

/** The wall area that counts: −WALL_HALF … WALL_HALF both ways. */
export const WALL_HALF = 5

/**
 * How well two shadows (each a union of polygons) agree: intersection over
 * union on a fixed grid of sample points over the wall. Deterministic, and
 * tolerant by design — nobody has to be pixel perfect.
 */
export function overlap(a: readonly Polygon[], b: readonly Polygon[], grid = 64): number {
  let both = 0
  let either = 0
  for (let i = 0; i < grid; i += 1) {
    for (let j = 0; j < grid; j += 1) {
      const p: Point = [
        -WALL_HALF + ((i + 0.5) / grid) * WALL_HALF * 2,
        -WALL_HALF + ((j + 0.5) / grid) * WALL_HALF * 2,
      ]
      const inA = a.some((polygon) => inside(p, polygon))
      const inB = b.some((polygon) => inside(p, polygon))
      if (inA && inB) both += 1
      if (inA || inB) either += 1
    }
  }
  return either === 0 ? 1 : both / either
}

/** Width and height of a polygon's bounding box (for "bigger / smaller" talk). */
export function sizeOf(polygon: Polygon): { width: number; height: number } {
  const xs = polygon.map(([x]) => x)
  const ys = polygon.map(([, y]) => y)
  return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }
}

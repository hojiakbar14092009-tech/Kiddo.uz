import type { Polygon } from './geometry'

/*
 * Mode 2 (identify from views): simple solids and what they look like from
 * the front, from above and from the side (their silhouettes, as a light
 * straight behind would cast them). Each view is computed from the solid's
 * size, so a cone really is a triangle from the front and a circle from
 * above; nothing here is a picture.
 */

export const VIEWS = ['front', 'top', 'side'] as const
export type View = (typeof VIEWS)[number]

export const SOLID_IDS = ['cube', 'cylinder', 'cone', 'sphere', 'pyramid', 'prism'] as const
export type SolidId = (typeof SOLID_IDS)[number]

const rect = (w: number, h: number): Polygon => [
  [-w / 2, -h / 2],
  [w / 2, -h / 2],
  [w / 2, h / 2],
  [-w / 2, h / 2],
]
const circle = (r: number): Polygon =>
  Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2
    return [r * Math.cos(a), r * Math.sin(a)] as const
  })
/** Apex up (y grows upwards on the wall). */
const triangle = (w: number, h: number): Polygon => [
  [-w / 2, -h / 2],
  [w / 2, -h / 2],
  [0, h / 2],
]

interface Solid {
  /** Width (left–right), depth (front–back) and height of the solid. */
  size: { w: number; d: number; h: number }
  view: (view: View, size: Solid['size']) => Polygon
}

export const SOLIDS: Record<SolidId, Solid> = {
  cube: { size: { w: 2, d: 2, h: 2 }, view: (_, s) => rect(s.w, s.h) },
  // upright: a rectangle from the front and the side, a circle from above
  cylinder: {
    size: { w: 2, d: 2, h: 2.6 },
    view: (v, s) => (v === 'top' ? circle(s.w / 2) : rect(s.w, s.h)),
  },
  cone: {
    size: { w: 2.2, d: 2.2, h: 2.6 },
    view: (v, s) => (v === 'top' ? circle(s.w / 2) : triangle(s.w, s.h)),
  },
  sphere: { size: { w: 2.4, d: 2.4, h: 2.4 }, view: (_, s) => circle(s.w / 2) },
  // square base: a triangle from the front and the side, a square from above
  pyramid: {
    size: { w: 2.2, d: 2.2, h: 2.4 },
    view: (v, s) => (v === 'top' ? rect(s.w, s.d) : triangle(s.w, s.h)),
  },
  // a triangular prism lying left–right: rectangles from the front and above, a triangle from the side
  prism: {
    size: { w: 3, d: 2, h: 1.8 },
    view: (v, s) =>
      v === 'side' ? triangle(s.d, s.h) : v === 'top' ? rect(s.w, s.d) : rect(s.w, s.h),
  },
}

export function viewOf(solid: SolidId, view: View): Polygon {
  const { size, view: draw } = SOLIDS[solid]
  return draw(view, size)
}

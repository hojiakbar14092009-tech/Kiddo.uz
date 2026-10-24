/*
 * How hard each kind of 3D canvas may work, in one place. Pure values (no
 * three.js import), so any chunk can read them without pulling in the 3D code.
 *
 * - `content`: the thing the child came to look at (the Explorer model, a
 *   planet, a tale scene). Full frame rate while it moves.
 * - `ambient`: a decorative character beside the lesson (the robot mascot in a
 *   game header, about 56–100 px). 30 frames a second look the same at that
 *   size and halve the work; measured on the Phase 12 baseline it drew about
 *   1 000 WebGL calls a second on every lesson page.
 *
 * The device-strength checks stay in `features/mascot/webgl.ts` (which devices
 * get 3D at all) and `explorer3d/support.ts` (Explorer quality).
 */

export interface RenderBudget {
  /** Frames a second while animating; the canvas renders on demand in between. */
  fps: number
  /** With prefers-reduced-motion: just enough for a mood to change. */
  reducedMotionFps: number
  /** Device-pixel-ratio range handed to the canvas. */
  dpr: [number, number]
}

export const RENDER_BUDGET = {
  // the canvas is tiny, so full sharpness costs little: the frame rate is what counts
  ambient: { fps: 30, reducedMotionFps: 10, dpr: [1, 2] },
} as const satisfies Record<string, RenderBudget>

/**
 * Motion tokens for framer-motion, matching the CSS ones in index.css.
 * Durations are in seconds (framer-motion's unit). Reduced motion is honoured
 * by `useReducedMotion()` in components and by the global CSS rule.
 */
export const MOTION = {
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
} as const

/** A soft "toy" spring for things popping into place. */
export const POP_SPRING = { type: 'spring', stiffness: 260, damping: 18 } as const

/** Cubic-bezier easings (same curves as --ease-pop / --ease-soft). */
export const EASE = {
  pop: [0.34, 1.56, 0.64, 1],
  soft: [0.25, 0.8, 0.25, 1],
} as const

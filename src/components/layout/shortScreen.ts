/*
 * A phone held sideways (e.g. 844×390) has very little height: the game or
 * question must start above the fold. These classes make the frame compact
 * only on such short screens (max-height 500px); every other size keeps its
 * own look. They are full literal class names so Tailwind finds them.
 */
export const SHORT_SCREEN = {
  /** The page under the top bar: less padding and smaller gaps. */
  page: 'short:gap-2! short:py-2!',
  /** The mascot + instruction row: a small robot with its bubble beside it. */
  mascotRow: 'short:gap-2!',
  robot: 'short:w-12!',
  /** Buttons next to the mascot sit side by side, never stacked. */
  actions: 'short:flex-row! short:gap-2!',
} as const

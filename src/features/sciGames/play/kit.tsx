import { motion, useReducedMotion } from 'framer-motion'

export function Line({ text }: { text: string }) {
  return (
    <p role="status" className="min-h-14 max-w-md font-display text-xl font-bold text-balance">
      {text}
    </p>
  )
}

/** A pulsing ring around whatever the child should tap next. */
export function TapHint({ on }: { on: boolean }) {
  const reduceMotion = useReducedMotion() ?? false
  if (!on) return null
  return (
    <motion.span
      aria-hidden="true"
      className="pointer-events-none absolute -inset-2 rounded-full border-4 border-coin"
      animate={reduceMotion ? { opacity: 1 } : { scale: [1, 1.15, 1], opacity: [0.9, 0.4, 0.9] }}
      transition={{ duration: 1.4, repeat: Infinity }}
    />
  )
}

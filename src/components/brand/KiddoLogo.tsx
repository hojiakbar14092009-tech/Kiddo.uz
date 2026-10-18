import { motion, useReducedMotion } from 'framer-motion'
import { useId } from 'react'

/*
 * The Kiddo logotype, drawn letter by letter rather than typed in a font.
 * Every letter is one thick rounded stroke, like a child's first line with a
 * marker. The two d's look at you: their bowls are a robot's dark visor eyes
 * with a glint, their stems are antennas with the robots' pink and blue tips,
 * and a smile runs under them. The dot of the i is a gold coin.
 */

const STROKE = 24
const VIEW_W = 520
const VIEW_H = 236

/** Each stroke of the logotype, in drawing order. */
const STROKES = [
  { id: 'k-stem', d: 'M44 34 V176' },
  { id: 'k-arm', d: 'M118 52 L60 112' },
  { id: 'k-leg', d: 'M74 100 L122 176' },
  { id: 'i-stem', d: 'M164 104 V176' },
  { id: 'd1-stem', d: 'M268 40 V176' },
  { id: 'd1-bowl', d: 'M268 136 a40 40 0 1 1 -80 0 a40 40 0 1 1 80 0' },
  { id: 'd2-stem', d: 'M384 40 V176' },
  { id: 'd2-bowl', d: 'M384 136 a40 40 0 1 1 -80 0 a40 40 0 1 1 80 0' },
  { id: 'o', d: 'M462 102 a38 38 0 1 1 0 76 a38 38 0 1 1 0 -76' },
] as const

interface WordmarkProps {
  /** Draws itself stroke by stroke (the opening animation). */
  animate?: boolean
  /** Seconds before drawing starts. */
  delay?: number
  className?: string
}

export function KiddoWordmark({ animate = false, delay = 0, className }: WordmarkProps) {
  const id = useId().replace(/:/g, '')
  const reduceMotion = useReducedMotion() ?? false
  const draw = animate && !reduceMotion
  const step = 0.16
  const at = (index: number) => delay + index * step
  const after = at(STROKES.length)

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label="Kiddo"
      className={className}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient
          id={`${id}-ink`}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2={VIEW_W}
          y2={VIEW_H}
        >
          <stop offset="0" stopColor="#1DB89E" />
          <stop offset="1" stopColor="#0B6F62" />
        </linearGradient>
        <radialGradient id={`${id}-coin`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#FFE58A" />
          <stop offset="0.6" stopColor="#FFC93C" />
          <stop offset="1" stopColor="#E09A12" />
        </radialGradient>
      </defs>

      {/* the visor inside each d: it fills in once the bowl is drawn */}
      {[268, 384].map((x, index) => (
        <motion.circle
          key={x}
          cx={x - 40}
          cy={136}
          r={30}
          fill="#22192F"
          initial={draw ? { scale: 0, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: at(6 + index * 2), type: 'spring', stiffness: 300, damping: 16 }}
          style={{ originX: `${x - 40}px`, originY: '136px' }}
        />
      ))}

      {STROKES.map((stroke, index) => (
        <motion.path
          key={stroke.id}
          d={stroke.d}
          fill="none"
          stroke={`url(#${id}-ink)`}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={draw ? { pathLength: 0, opacity: 0 } : false}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: at(index), duration: 0.42, ease: 'easeOut' }}
        />
      ))}

      {/* eyes: a glint in each visor, and they blink now and then */}
      {[228, 344].map((x) => (
        <motion.g
          key={x}
          initial={draw ? { opacity: 0 } : false}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scaleY: [1, 1, 0.1, 1] }}
          transition={{
            opacity: { delay: after },
            scaleY: { delay: after + 1, duration: 4, repeat: Infinity, times: [0, 0.92, 0.96, 1] },
          }}
          style={{ originX: `${x}px`, originY: '134px' }}
        >
          <ellipse cx={x} cy={134} rx={11} ry={14} fill="#7CF5D9" />
          <circle cx={x + 4} cy={128} r={4} fill="#FFFFFF" />
        </motion.g>
      ))}

      {/* antenna tips: the girl robot's pink and the boy robot's blue */}
      {[
        { x: 268, color: '#F27BA6' },
        { x: 384, color: '#5BB4F0' },
      ].map((tip, index) => (
        <motion.circle
          key={tip.x}
          cx={tip.x}
          cy={20}
          r={15}
          fill={tip.color}
          stroke="#FFFFFF"
          strokeWidth={4}
          initial={draw ? { scale: 0 } : false}
          animate={{ scale: 1 }}
          transition={{
            delay: after + 0.15 + index * 0.12,
            type: 'spring',
            stiffness: 500,
            damping: 12,
          }}
          style={{ originX: `${tip.x}px`, originY: '20px' }}
        />
      ))}

      {/* the smile under the two eyes */}
      <motion.path
        d="M238 204 Q296 236 354 204"
        fill="none"
        stroke="#F27BA6"
        strokeWidth={10}
        strokeLinecap="round"
        initial={draw ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{ delay: after + 0.4, duration: 0.5 }}
      />

      {/* the coin dot of the i drops in and spins */}
      <motion.g
        initial={draw ? { y: -140, rotateY: 0, opacity: 0 } : false}
        animate={{ y: 0, opacity: 1, rotateY: draw ? 720 : 0 }}
        transition={{ delay: at(3) + 0.3, type: 'spring', stiffness: 220, damping: 13 }}
        style={{ originX: '164px', originY: '56px' }}
      >
        <circle
          cx={164}
          cy={56}
          r={22}
          fill={`url(#${id}-coin)`}
          stroke="#E09A12"
          strokeWidth={4}
        />
        <path
          d="m164 44 3.6 7.3 8 1.2-5.8 5.6 1.4 8-7.2-3.8-7.2 3.8 1.4-8-5.8-5.6 8-1.2z"
          fill="#FFF6CF"
        />
      </motion.g>
    </svg>
  )
}

/**
 * The app mark: the logotype's face on its own – two visor eyes with antennas
 * and a smile – on a teal tile. It reads as Kiddo even at favicon size.
 */
export function KiddoMark({ size = 96, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={`${id}-tile`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22C3A6" />
          <stop offset="1" stopColor="#0B6F62" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="128" fill={`url(#${id}-tile)`} />
      <circle cx="256" cy="256" r="236" fill="#FFFFFF" opacity="0.06" />
      {/* antennas (the d stems) */}
      <path
        d="M228 120 V300 M388 120 V300"
        stroke="#FFFFFF"
        strokeWidth="34"
        strokeLinecap="round"
      />
      <circle cx="228" cy="96" r="26" fill="#F27BA6" stroke="#FFFFFF" strokeWidth="8" />
      <circle cx="388" cy="96" r="26" fill="#5BB4F0" stroke="#FFFFFF" strokeWidth="8" />
      {/* visor eyes (the d bowls) */}
      {[164, 324].map((x) => (
        <g key={x}>
          <circle cx={x} cy="256" r="64" fill="#22192F" stroke="#FFFFFF" strokeWidth="34" />
          <ellipse cx={x} cy="252" rx="20" ry="26" fill="#7CF5D9" />
          <circle cx={x + 8} cy="240" r="8" fill="#FFFFFF" />
        </g>
      ))}
      <path
        d="M168 380 Q256 440 344 380"
        fill="none"
        stroke="#FFC93C"
        strokeWidth="22"
        strokeLinecap="round"
      />
    </svg>
  )
}

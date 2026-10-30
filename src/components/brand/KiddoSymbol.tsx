import { motion, useReducedMotion, type Transition } from 'framer-motion'
import { useId, type CSSProperties } from 'react'

/*
 * The Kiddo symbol (Phase 32): a standalone mark that works without the
 * name. A deep blue world is cut by a K of light — an upright stem and two
 * arms open to the right, the negative space between the blue pieces. Where
 * the arms meet the stem a star shines (the centre light), and a warm gold
 * orbit sweeps round the world like a comet's path: it starts behind the
 * world at the top, comes round in front at the bottom and ends in a small
 * moon. Not a closed ring, not a plain K. Vector only.
 *
 * With `play`, it performs the opening: light appears → the star forms →
 * the blue world enters → the gold orbit joins and interlocks → the centre
 * light activates → the symbol settles (OPENING_SECONDS). Reduced motion: a
 * simple fade.
 */

const CX = 120
const CY = 120
const R = 78
/** The K: the stem's x and the point where the arms leave it. */
const STEM_X = 98
const JOIN = [STEM_X, CY] as const
const CUT = 13

const f = (n: number) => n.toFixed(2)

/** A four-pointed star of light at (x, y). */
function starPath(x: number, y: number, r: number, waist: number): string {
  const pts: string[] = []
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2
    const d = i % 2 === 0 ? r : waist
    pts.push(`${f(x + d * Math.cos(a))} ${f(y + d * Math.sin(a))}`)
  }
  return `M${pts.join(' L')} Z`
}

const STAR_PATH = starPath(JOIN[0], JOIN[1], 30, 7)

/** The orbit: an open ellipse arc (a path, not a ring), tilted. */
const ORBIT = { rx: 108, ry: 36, tilt: -24 }
function arc(from: number, to: number, sweep: 0 | 1): string {
  const p = (deg: number) => {
    const a = (deg * Math.PI) / 180
    return `${f(ORBIT.rx * Math.cos(a))} ${f(ORBIT.ry * Math.sin(a))}`
  }
  const span = Math.abs(to - from)
  return `M${p(from)} A${ORBIT.rx} ${ORBIT.ry} 0 ${span > 180 ? 1 : 0} ${sweep} ${p(to)}`
}
/** Behind the world: over the top, from the right towards the left. */
const ORBIT_BACK = arc(-35, -160, 0)
/** In front: from the left, under the world, up to the moon on the right. */
const ORBIT_FRONT = arc(180, 25, 0)
const MOON_DEG = 25
const MOON = [
  ORBIT.rx * Math.cos((MOON_DEG * Math.PI) / 180),
  ORBIT.ry * Math.sin((MOON_DEG * Math.PI) / 180),
] as const

/** Scale and spin each part about its own centre. */
const OWN: CSSProperties = { transformBox: 'fill-box', transformOrigin: '50% 50%' }

const at = (delay: number, duration: number, ease: Transition['ease'] = 'easeOut') => ({
  delay,
  duration,
  ease,
})

export function KiddoSymbol({
  size,
  play = false,
  label,
  className,
}: {
  size?: number
  /** Perform the opening once (the splash). */
  play?: boolean
  /** Accessible name; decorative when left out. */
  label?: string
  className?: string
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const reduceMotion = useReducedMotion() ?? false
  const moves = play && !reduceMotion
  const fade = play && reduceMotion
  // initial states only when the opening plays; otherwise the symbol is simply there
  const from = <T extends object>(value: T) => (moves ? value : false)
  const orbitStroke = { fill: 'none', stroke: `url(#${id}-gold)`, strokeLinecap: 'round' as const }

  return (
    <motion.svg
      viewBox="0 0 240 240"
      width={size}
      height={size}
      className={className}
      data-kiddo-symbol=""
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      initial={fade ? { opacity: 0 } : false}
      animate={fade ? { opacity: 1 } : undefined}
      transition={fade ? { duration: 0.5 } : undefined}
    >
      <defs>
        <linearGradient id={`${id}-blue`} x1="0.1" y1="0.05" x2="0.85" y2="0.95">
          <stop offset="0" stopColor="#4277FF" />
          <stop offset="0.5" stopColor="#1D47CC" />
          <stop offset="1" stopColor="#0C2470" />
        </linearGradient>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FF7E29" />
          <stop offset="0.55" stopColor="#FFB534" />
          <stop offset="1" stopColor="#FFD86E" />
        </linearGradient>
        <radialGradient id={`${id}-star`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.5" stopColor="#FFF0B3" />
          <stop offset="1" stopColor="#FFC23D" />
        </radialGradient>
        <radialGradient id={`${id}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFE7A0" stopOpacity="0.95" />
          <stop offset="1" stopColor="#FFE7A0" stopOpacity="0" />
        </radialGradient>
        {/* the K of light: everything white stays, the black strokes are cut away */}
        <mask id={`${id}-k`} maskUnits="userSpaceOnUse" x="0" y="0" width="240" height="240">
          <rect width="240" height="240" fill="#FFFFFF" />
          <g stroke="#000000" strokeWidth={CUT} strokeLinecap="round">
            <line x1={STEM_X} y1={CY - R - 10} x2={STEM_X} y2={CY + R + 10} />
            <line x1={JOIN[0]} y1={JOIN[1]} x2={CX + R + 14} y2={CY - R + 2} />
            <line x1={JOIN[0]} y1={JOIN[1]} x2={CX + R + 14} y2={CY + R - 2} />
          </g>
        </mask>
      </defs>

      {/* 1. light appears (and 6. it activates again at the end) */}
      <motion.circle
        cx={JOIN[0]}
        cy={JOIN[1]}
        r="48"
        fill={`url(#${id}-glow)`}
        initial={from({ opacity: 0, scale: 0.2 })}
        animate={
          moves
            ? { opacity: [0, 1, 0.55, 0.55, 1, 0.75], scale: [0.2, 1.3, 1, 1, 1.5, 1.1] }
            : { opacity: 0.75 }
        }
        transition={
          moves
            ? { duration: 3.0, times: [0, 0.3, 0.45, 0.86, 0.93, 1], ease: 'easeOut' }
            : undefined
        }
        style={OWN}
        data-part="light"
      />

      {/* the orbit's far side, behind the world */}
      <g transform={`translate(${CX} ${CY}) rotate(${ORBIT.tilt})`}>
        <motion.path
          d={ORBIT_BACK}
          {...orbitStroke}
          strokeWidth="7"
          strokeOpacity="0.85"
          initial={from({ pathLength: 0, opacity: 0 })}
          animate={moves ? { pathLength: 1, opacity: 1 } : undefined}
          transition={at(1.5, 0.45, 'easeInOut')}
          data-part="orbit-back"
        />
      </g>

      {/* 3. the blue world enters, cut by the K */}
      <motion.g
        initial={from({ opacity: 0, scale: 0.55 })}
        animate={moves ? { opacity: 1, scale: 1 } : undefined}
        transition={{ delay: 0.8, type: 'spring', stiffness: 120, damping: 15 }}
        style={OWN}
        data-part="world"
      >
        <circle cx={CX} cy={CY} r={R} fill={`url(#${id}-blue)`} mask={`url(#${id}-k)`} />
        <path
          d={`M${CX - 62} ${CY - 26} A${R - 14} ${R - 14} 0 0 1 ${CX - 40} ${CY - 52}`}
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.35"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </motion.g>

      {/* 2. the star forms at the heart of the K */}
      <motion.path
        d={STAR_PATH}
        fill={`url(#${id}-star)`}
        stroke="#FFB534"
        strokeWidth="2"
        strokeLinejoin="round"
        initial={from({ opacity: 0, scale: 0, rotate: -90 })}
        animate={
          moves ? { opacity: 1, scale: [0, 1, 1, 1.25, 1], rotate: [-90, 0, 0, 45, 0] } : undefined
        }
        transition={
          moves
            ? { delay: 0.3, duration: 2.7, times: [0, 0.2, 0.86, 0.94, 1], ease: 'easeOut' }
            : undefined
        }
        style={OWN}
        data-part="star"
      />

      {/* 4. the warm gold orbit joins and 5. interlocks in front, ending in its moon */}
      <g transform={`translate(${CX} ${CY}) rotate(${ORBIT.tilt})`}>
        <motion.path
          d={ORBIT_FRONT}
          {...orbitStroke}
          strokeWidth="11"
          initial={from({ pathLength: 0, opacity: 0 })}
          animate={moves ? { pathLength: 1, opacity: 1 } : undefined}
          transition={at(1.9, 0.6, 'easeInOut')}
          data-part="orbit-front"
        />
        <motion.circle
          cx={f(MOON[0])}
          cy={f(MOON[1])}
          r="10"
          fill="#FFD86E"
          stroke="#FFFFFF"
          strokeWidth="3"
          initial={from({ scale: 0, opacity: 0 })}
          animate={moves ? { scale: 1, opacity: 1 } : undefined}
          transition={{ delay: 2.45, type: 'spring', stiffness: 260, damping: 13 }}
          style={OWN}
          data-part="moon"
        />
      </g>
    </motion.svg>
  )
}

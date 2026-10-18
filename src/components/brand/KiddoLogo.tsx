import clsx from 'clsx'
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
 * The app mark: Kiddo's robot mascot's head on a teal tile – white shell,
 * mint ears, a dark visor with glowing eyes and a smile, and a gold antenna.
 * It is alive: the head bobs and tilts, the antenna tip pulses, the eyes look
 * around and blink. Still for `animate={false}` and for reduced motion.
 */
export function KiddoMark({
  size = 96,
  className,
  animate = true,
}: {
  size?: number
  className?: string
  animate?: boolean
}) {
  const id = useId().replace(/:/g, '')
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      aria-hidden="true"
      className={clsx('kd-mark', animate && 'kd-mark-live', className)}
    >
      <defs>
        <linearGradient id={`${id}-tile`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22C3A6" />
          <stop offset="1" stopColor="#0B6F62" />
        </linearGradient>
        <radialGradient id={`${id}-shell`} cx="38%" cy="26%" r="80%">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.6" stopColor="#F3F0F8" />
          <stop offset="1" stopColor="#D3CCE2" />
        </radialGradient>
        <linearGradient id={`${id}-visor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4C3F66" />
          <stop offset="1" stopColor="#1C162D" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="128" fill={`url(#${id}-tile)`} />
      <circle cx="256" cy="256" r="236" fill="#FFFFFF" opacity="0.07" />
      <ellipse
        cx="256"
        cy="440"
        rx="120"
        ry="16"
        fill="#063F37"
        opacity="0.28"
        className="kd-mark-shadow"
      />

      <g transform="translate(0 40)">
        <g className="kd-mark-head">
          {/* antenna */}
          <rect x="246" y="62" width="20" height="74" rx="10" fill="#E3F7F2" />
          <circle
            cx="256"
            cy="56"
            r="28"
            fill="#FFC93C"
            stroke="#FFFFFF"
            strokeWidth="9"
            className="kd-mark-tip"
          />
          {/* ears */}
          <ellipse
            cx="108"
            cy="250"
            rx="40"
            ry="70"
            fill="#9BE8D6"
            stroke="#FFFFFF"
            strokeWidth="10"
          />
          <ellipse
            cx="404"
            cy="250"
            rx="40"
            ry="70"
            fill="#9BE8D6"
            stroke="#FFFFFF"
            strokeWidth="10"
          />
          {/* shell */}
          <rect x="122" y="118" width="268" height="246" rx="116" fill={`url(#${id}-shell)`} />
          <ellipse cx="200" cy="148" rx="46" ry="12" fill="#FFFFFF" opacity="0.95" />
          {/* visor */}
          <rect x="154" y="166" width="204" height="164" rx="70" fill={`url(#${id}-visor)`} />
          <path
            d="M186 190 Q256 172 326 190"
            stroke="#FFFFFF"
            strokeOpacity="0.22"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
          />
          <ellipse cx="184" cy="292" rx="16" ry="9" fill="#7FF0FF" opacity="0.28" />
          <ellipse cx="328" cy="292" rx="16" ry="9" fill="#7FF0FF" opacity="0.28" />
          {/* eyes that look around and blink */}
          <g className="kd-mark-look">
            <g className="kd-mark-eyes">
              <rect x="196" y="208" width="32" height="50" rx="16" fill="#7FF0FF" />
              <rect x="284" y="208" width="32" height="50" rx="16" fill="#7FF0FF" />
              <circle cx="219" cy="220" r="6" fill="#FFFFFF" />
              <circle cx="307" cy="220" r="6" fill="#FFFFFF" />
            </g>
          </g>
          <path
            d="M220 284 Q256 312 292 284"
            stroke="#7FF0FF"
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      </g>
    </svg>
  )
}

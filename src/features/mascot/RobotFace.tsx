import { motion, type MotionValue } from 'framer-motion'
import type { MascotModel } from '@/store/familyStore'
import type { MascotMood } from './types'

interface RobotFaceProps {
  mood: MascotMood
  model: MascotModel
  glow: string
  eyesClosed: boolean
  eyeX: MotionValue<number>
  eyeY: MotionValue<number>
  animateLoops: boolean
}

const STROKE = { fill: 'none', strokeLinecap: 'round' } as const

/** The expressions drawn on the visor. */
export function RobotFace({
  mood,
  model,
  glow,
  eyesClosed,
  eyeX,
  eyeY,
  animateLoops,
}: RobotFaceProps) {
  if (mood === 'sleepy') {
    return (
      <g>
        <path d="M68 86 Q79 96 90 86" stroke={glow} strokeWidth={5} {...STROKE} />
        <path d="M110 86 Q121 96 132 86" stroke={glow} strokeWidth={5} {...STROKE} />
        <motion.ellipse
          cx="100"
          cy="112"
          rx="7"
          fill={glow}
          initial={{ ry: 3 }}
          animate={animateLoops ? { ry: [3, 3, 9, 9, 3] } : { ry: 4 }}
          transition={{
            duration: 4.5,
            times: [0, 0.25, 0.4, 0.55, 0.7],
            repeat: Infinity,
            repeatDelay: 3,
          }}
        />
        <text
          x="140"
          y="60"
          fill={glow}
          fontSize="16"
          fontWeight="800"
          fontFamily="Rubik, sans-serif"
        >
          z
        </text>
      </g>
    )
  }

  if (mood === 'happy' || mood === 'celebrate') {
    return (
      <g>
        <path d="M68 92 Q79 76 90 92" stroke={glow} strokeWidth={6} {...STROKE} />
        <path d="M110 92 Q121 76 132 92" stroke={glow} strokeWidth={6} {...STROKE} />
        <path
          d="M84 103 Q100 124 116 103 Z"
          fill={glow}
          stroke={glow}
          strokeWidth={3}
          strokeLinejoin="round"
        />
      </g>
    )
  }

  if (mood === 'oops') {
    return (
      <g>
        <path d="M68 74 L86 70" stroke={glow} strokeWidth={4} {...STROKE} />
        <path d="M114 70 L132 74" stroke={glow} strokeWidth={4} {...STROKE} />
        <circle cx="79" cy="88" r="7.5" fill={glow} />
        <circle cx="121" cy="88" r="7.5" fill={glow} />
        <circle cx="100" cy="112" r="6.5" stroke={glow} strokeWidth={4} fill="none" />
      </g>
    )
  }

  return (
    <g>
      <motion.g style={{ x: eyeX, y: eyeY }}>
        <motion.g
          animate={{ scaleY: eyesClosed ? 0.12 : 1 }}
          transition={{ duration: 0.08 }}
          style={{ transformOrigin: '100px 88px', transformBox: 'view-box' }}
        >
          <rect x="72" y="78" width="14" height="20" rx="7" fill={glow} />
          <rect x="114" y="78" width="14" height="20" rx="7" fill={glow} />
          {model === 'girl' && (
            <g>
              <path d="M70 77 L65 71" stroke={glow} strokeWidth={3} {...STROKE} />
              <path d="M130 77 L135 71" stroke={glow} strokeWidth={3} {...STROKE} />
            </g>
          )}
        </motion.g>
      </motion.g>

      {mood === 'talk' ? (
        <motion.ellipse
          cx="100"
          cy="111"
          rx="9"
          fill={glow}
          initial={{ ry: 2 }}
          animate={animateLoops ? { ry: [2, 6, 3, 7, 2.5, 5, 2] } : { ry: 4 }}
          transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
        />
      ) : (
        <path d="M88 108 Q100 118 112 108" stroke={glow} strokeWidth={4} {...STROKE} />
      )}
    </g>
  )
}

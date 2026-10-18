import {
  motion,
  useAnimationControls,
  useReducedMotion,
  useTransform,
  type TargetAndTransition,
} from 'framer-motion'
import { useEffect, useId, useRef, useState } from 'react'
import { randomBetween } from '@/lib/random'
import type { MascotModel } from '@/store/familyStore'
import { RobotFace } from './RobotFace'
import type { MascotMood, RobotPalette } from './types'
import { useBlink } from './useBlink'
import { useGaze } from './useGaze'

const PALETTES: Record<MascotModel, RobotPalette> = {
  girl: { accent: ['#FFD0E2', '#F27BA6', '#C24C7B'], glow: '#FFB8DC' },
  boy: { accent: ['#9BE8D6', '#17A08B', '#0A5C50'], glow: '#7FF0FF' },
}

const EASE_IN_OUT = [0.42, 0, 0.58, 1] as const
/** A soft spring with a little overshoot – reads as a living body, not a machine. */
const LIMB_SPRING = { type: 'spring', stiffness: 110, damping: 11, mass: 0.9 } as const

/** One-shot whole-body reactions, anchored at the feet. */
const BODY_ACTIONS: Record<'happy' | 'oops' | 'rest', TargetAndTransition> = {
  // anticipation (crouch) → jump → land with a squash → settle
  happy: {
    y: [0, 8, -34, 4, 0],
    scaleX: [1, 1.06, 0.97, 1.03, 1],
    scaleY: [1, 0.9, 1.05, 0.97, 1],
    rotate: 0,
    transition: { duration: 1.1, times: [0, 0.15, 0.5, 0.8, 1], ease: EASE_IN_OUT },
  },
  // a decaying head-shake of the whole body
  oops: {
    y: [0, 3, 0],
    rotate: [0, -9, 7, -4, 2, 0],
    scaleX: 1,
    scaleY: 1,
    transition: { duration: 1.2, ease: 'easeInOut' },
  },
  rest: { y: 0, rotate: 0, scaleX: 1, scaleY: 1, transition: { duration: 0.4 } },
}

const SHADOW_ACTIONS: Record<'happy' | 'rest', TargetAndTransition> = {
  happy: {
    scaleX: [1, 1.08, 0.6, 1.06, 1],
    opacity: [0.14, 0.16, 0.06, 0.15, 0.14],
    transition: { duration: 1.1, times: [0, 0.15, 0.5, 0.8, 1], ease: EASE_IN_OUT },
  },
  rest: { scaleX: 1, opacity: 0.14, transition: { duration: 0.4 } },
}

type ArmPose = { left: TargetAndTransition; right: TargetAndTransition }

function armPose(mood: MascotMood, loops: boolean): ArmPose {
  switch (mood) {
    case 'happy':
      return {
        left: loops
          ? {
              rotate: [150, 166, 150],
              transition: { duration: 0.45, repeat: Infinity, ease: 'easeInOut' },
            }
          : { rotate: 150, transition: LIMB_SPRING },
        right: loops
          ? {
              rotate: [-150, -166, -150],
              transition: { duration: 0.45, repeat: Infinity, ease: 'easeInOut', delay: 0.08 },
            }
          : { rotate: -150, transition: LIMB_SPRING },
      }
    case 'oops':
      return {
        left: { rotate: 38, transition: LIMB_SPRING },
        right: { rotate: -38, transition: LIMB_SPRING },
      }
    case 'wave':
      return {
        left: { rotate: 10, transition: LIMB_SPRING },
        right: loops
          ? {
              rotate: [-150, -122, -152, -126, -150],
              transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.6 },
            }
          : { rotate: -150, transition: LIMB_SPRING },
      }
    case 'talk':
      return {
        left: { rotate: 12, transition: LIMB_SPRING },
        right: loops
          ? {
              rotate: [-12, -42, -18, -36, -12],
              transition: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' },
            }
          : { rotate: -30, transition: LIMB_SPRING },
      }
    default:
      return {
        left: loops
          ? {
              rotate: [8, 12, 8],
              transition: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' },
            }
          : { rotate: 10, transition: LIMB_SPRING },
        right: loops
          ? {
              rotate: [-8, -12, -8],
              transition: { duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: 0.3 },
            }
          : { rotate: -10, transition: LIMB_SPRING },
      }
  }
}

export interface RobotProps {
  model: MascotModel
  mood?: MascotMood
  /** Changing it replays the current reaction, e.g. for a second correct answer in a row. */
  reactionKey?: number
  /** Width in px; height is 1.2× the width. */
  size?: number
  /** Follow the child’s finger/cursor with the eyes and head. */
  followPointer?: boolean
  /** Accessible name; leave empty when the robot is purely decorative. */
  label?: string
  className?: string
}

/**
 * Kiddo’s robot mascot. Motion is layered like a living body: constant
 * breathing, a slow head sway on a different rhythm, irregular blinking,
 * gaze that follows the child, springy limbs, and one-shot reactions with
 * anticipation and follow-through. Honours `prefers-reduced-motion`.
 */
export function Robot({
  model,
  mood = 'idle',
  reactionKey = 0,
  size = 200,
  followPointer = true,
  label = '',
  className,
}: RobotProps) {
  const reduceMotion = useReducedMotion() ?? false
  const loops = !reduceMotion
  const svgRef = useRef<SVGSVGElement>(null)
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const palette = PALETTES[model]
  const ids = { shell: `shell-${uid}`, visor: `visor-${uid}`, accent: `accent-${uid}` }

  // Each robot breathes at its own pace, so two robots never move in lockstep.
  const [breathSeconds] = useState(() => randomBetween(3.2, 3.9))
  const [swaySeconds] = useState(() => randomBetween(4.8, 5.8))

  const eyesClosed = useBlink(loops && mood !== 'happy' && mood !== 'oops')
  const gaze = useGaze(svgRef, followPointer && loops)
  const eyeX = useTransform(gaze.x, (v) => v * 6)
  const eyeY = useTransform(gaze.y, (v) => v * 4)
  const headTurn = useTransform(gaze.x, (v) => v * 7)

  const body = useAnimationControls()
  const shadow = useAnimationControls()

  useEffect(() => {
    if (mood === 'happy' && loops) {
      void body.start(BODY_ACTIONS.happy)
      void shadow.start(SHADOW_ACTIONS.happy)
    } else if (mood === 'oops' && loops) {
      void body.start(BODY_ACTIONS.oops)
      void shadow.start(SHADOW_ACTIONS.rest)
    } else {
      void body.start(BODY_ACTIONS.rest)
      void shadow.start(SHADOW_ACTIONS.rest)
    }
  }, [mood, reactionKey, loops, body, shadow])

  const arms = armPose(mood, loops)
  const accentFill = `url(#${ids.accent})`
  const shellFill = `url(#${ids.shell})`

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size * 1.2}
      viewBox="0 0 200 240"
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      className={className}
      overflow="visible"
    >
      <defs>
        <radialGradient id={ids.shell} cx="38%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="58%" stopColor="#F1EEF6" />
          <stop offset="100%" stopColor="#C9C1D9" />
        </radialGradient>
        <linearGradient id={ids.visor} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4C3F66" />
          <stop offset="100%" stopColor="#1C162D" />
        </linearGradient>
        <radialGradient id={ids.accent} cx="35%" cy="28%" r="80%">
          <stop offset="0%" stopColor={palette.accent[0]} />
          <stop offset="55%" stopColor={palette.accent[1]} />
          <stop offset="100%" stopColor={palette.accent[2]} />
        </radialGradient>
      </defs>

      <motion.ellipse
        cx="100"
        cy="232"
        rx="46"
        ry="6"
        fill="#3A2E4D"
        initial={{ opacity: 0.14 }}
        animate={shadow}
        style={{ transformOrigin: '100px 232px', transformBox: 'view-box' }}
      />

      {/* One-shot reactions (jump, shake), pivoting at the feet */}
      <motion.g animate={body} style={{ transformOrigin: '100px 226px', transformBox: 'view-box' }}>
        {/* Breathing */}
        <motion.g
          animate={loops ? { y: [0, -4, -1, 0] } : { y: 0 }}
          transition={{
            duration: breathSeconds,
            times: [0, 0.45, 0.8, 1],
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <rect
            x="76"
            y="196"
            width="18"
            height="26"
            rx="9"
            fill={shellFill}
            stroke="#D9D3E4"
            strokeWidth="1.5"
          />
          <rect
            x="106"
            y="196"
            width="18"
            height="26"
            rx="9"
            fill={shellFill}
            stroke="#D9D3E4"
            strokeWidth="1.5"
          />
          <ellipse cx="85" cy="223" rx="13" ry="7" fill={accentFill} />
          <ellipse cx="115" cy="223" rx="13" ry="7" fill={accentFill} />

          <motion.g
            animate={arms.left}
            style={{ transformOrigin: '66px 160px', transformBox: 'view-box' }}
          >
            <rect
              x="56"
              y="156"
              width="16"
              height="40"
              rx="8"
              fill={shellFill}
              stroke="#D9D3E4"
              strokeWidth="1.5"
            />
            <circle cx="64" cy="198" r="9" fill={accentFill} />
          </motion.g>
          <motion.g
            animate={arms.right}
            style={{ transformOrigin: '134px 160px', transformBox: 'view-box' }}
          >
            <rect
              x="128"
              y="156"
              width="16"
              height="40"
              rx="8"
              fill={shellFill}
              stroke="#D9D3E4"
              strokeWidth="1.5"
            />
            <circle cx="136" cy="198" r="9" fill={accentFill} />
          </motion.g>

          <rect
            x="62"
            y="144"
            width="76"
            height="62"
            rx="30"
            fill={shellFill}
            stroke="#D9D3E4"
            strokeWidth="1.5"
          />
          <rect x="80" y="158" width="40" height="32" rx="13" fill="#ECE8F2" />
          {model === 'girl' ? (
            <path
              d="M100 183 C 88 175 86 167 92 163 C 96 160 100 163 100 166 C 100 163 104 160 108 163 C 114 167 112 175 100 183 Z"
              fill={accentFill}
            />
          ) : (
            <path
              d="M100 162 l3.2 6.5 7.1 1 -5.2 5 1.2 7.1 -6.3 -3.4 -6.3 3.4 1.2 -7.1 -5.2 -5 7.1 -1 z"
              fill={accentFill}
            />
          )}
          <rect x="88" y="136" width="24" height="14" rx="6" fill="#D9D3E4" />

          {/* Head: follows the gaze, plus a slow sway on its own rhythm */}
          <motion.g
            style={{ rotate: headTurn, transformOrigin: '100px 142px', transformBox: 'view-box' }}
          >
            <motion.g
              animate={loops ? { rotate: [-2, 2.5, -1, -2] } : { rotate: 0 }}
              transition={{
                duration: swaySeconds,
                times: [0, 0.4, 0.75, 1],
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{ transformOrigin: '100px 142px', transformBox: 'view-box' }}
            >
              <ellipse cx="32" cy="88" rx="14" ry="26" fill={accentFill} />
              <ellipse cx="168" cy="88" rx="14" ry="26" fill={accentFill} />

              {model === 'boy' && (
                <g>
                  <rect x="97" y="10" width="6" height="22" rx="3" fill="#CFC8DD" />
                  <motion.circle
                    cx="100"
                    cy="10"
                    fill={accentFill}
                    initial={{ r: 8 }}
                    animate={loops ? { r: [7, 9, 7] } : { r: 8 }}
                    transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </g>
              )}

              <rect
                x="34"
                y="26"
                width="132"
                height="118"
                rx="56"
                fill={shellFill}
                stroke="#D9D3E4"
                strokeWidth="1.5"
              />
              <ellipse cx="72" cy="38" rx="20" ry="6" fill="#FFFFFF" opacity="0.85" />

              {model === 'girl' && (
                <g>
                  <path d="M138 34 L116 20 Q110 34 116 48 Z" fill={accentFill} />
                  <path d="M138 34 L160 20 Q166 34 160 48 Z" fill={accentFill} />
                  <circle cx="138" cy="34" r="7" fill={palette.accent[2]} />
                </g>
              )}

              <rect x="50" y="48" width="100" height="80" rx="34" fill={`url(#${ids.visor})`} />
              <path
                d="M66 60 Q100 51 134 60"
                stroke="#FFFFFF"
                strokeOpacity="0.22"
                strokeWidth="5"
                fill="none"
                strokeLinecap="round"
              />
              <ellipse cx="64" cy="108" rx="8" ry="5" fill={palette.glow} opacity="0.3" />
              <ellipse cx="136" cy="108" rx="8" ry="5" fill={palette.glow} opacity="0.3" />

              <RobotFace
                mood={mood}
                model={model}
                glow={palette.glow}
                eyesClosed={eyesClosed}
                eyeX={eyeX}
                eyeY={eyeY}
                animateLoops={loops}
              />
            </motion.g>
          </motion.g>
        </motion.g>
      </motion.g>
    </svg>
  )
}

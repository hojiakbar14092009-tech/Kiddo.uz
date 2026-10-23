import type { ReactNode } from 'react'
import { FACE_INK } from './faceArt'

/*
 * The shared pieces of the answer pictures (see choiceArt.tsx).
 *
 * Kiddo's own little pictures for the "What could you do?" answers (simple
 * SVG scenes, no emoji, no characters), so a child who cannot read yet can
 * choose by the picture while the speaker reads the answers. Drawn on a
 * 120 × 90 scene with a handful of shared pieces: children, a grandma and a
 * grandpa, toys, a speech bubble and a few props.
 */

const INK = FACE_INK
const SKIN = '#F6C9A0'
const SKIN_2 = '#D9A27A'
const HAIR = '#5D4037'
const TEAR = '#2E86DE'

type Mood = 'smile' | 'grin' | 'sad' | 'cry' | 'calm' | 'talk' | 'cross' | 'plain'
type Pose = 'stand' | 'sit' | 'run' | 'wave' | 'reach' | 'away'

const limb = { stroke: INK, strokeWidth: 3.5, strokeLinecap: 'round', fill: 'none' } as const

function Face({ x, y, mood }: { x: number; y: number; mood: Mood }) {
  const eyes =
    mood === 'calm' ? (
      <>
        <path
          d={`M${x - 6} ${y - 1} Q${x - 4} ${y + 1} ${x - 2} ${y - 1}`}
          {...limb}
          strokeWidth={1.8}
        />
        <path
          d={`M${x + 2} ${y - 1} Q${x + 4} ${y + 1} ${x + 6} ${y - 1}`}
          {...limb}
          strokeWidth={1.8}
        />
      </>
    ) : (
      <>
        <circle cx={x - 4} cy={y - 1} r="1.6" fill={INK} />
        <circle cx={x + 4} cy={y - 1} r="1.6" fill={INK} />
      </>
    )
  const mouths: Record<Mood, ReactNode> = {
    smile: (
      <path d={`M${x - 4} ${y + 4} Q${x} ${y + 8} ${x + 4} ${y + 4}`} {...limb} strokeWidth={1.8} />
    ),
    grin: <path d={`M${x - 5} ${y + 3} Q${x} ${y + 10} ${x + 5} ${y + 3} Z`} fill={INK} />,
    calm: (
      <path d={`M${x - 3} ${y + 5} Q${x} ${y + 7} ${x + 3} ${y + 5}`} {...limb} strokeWidth={1.8} />
    ),
    sad: (
      <path d={`M${x - 4} ${y + 7} Q${x} ${y + 3} ${x + 4} ${y + 7}`} {...limb} strokeWidth={1.8} />
    ),
    cry: (
      <path d={`M${x - 4} ${y + 7} Q${x} ${y + 3} ${x + 4} ${y + 7}`} {...limb} strokeWidth={1.8} />
    ),
    cross: <path d={`M${x - 4} ${y + 6} H${x + 4}`} {...limb} strokeWidth={1.8} />,
    talk: <ellipse cx={x} cy={y + 5} rx="2.4" ry="2.8" fill={INK} />,
    plain: <path d={`M${x - 3} ${y + 5} H${x + 3}`} {...limb} strokeWidth={1.8} />,
  }
  return (
    <>
      {eyes}
      {mouths[mood]}
      {mood === 'cross' && (
        <>
          <path d={`M${x - 7} ${y - 6} L${x - 2} ${y - 4}`} {...limb} strokeWidth={1.8} />
          <path d={`M${x + 7} ${y - 6} L${x + 2} ${y - 4}`} {...limb} strokeWidth={1.8} />
        </>
      )}
      {mood === 'cry' && (
        <path
          d={`M${x - 6} ${y + 1} Q${x - 8.5} ${y + 5} ${x - 6} ${y + 6.5} Q${x - 3.5} ${y + 5} ${x - 6} ${y + 1} Z`}
          fill={TEAR}
        />
      )}
    </>
  )
}

/** A child standing on the ground line (y = 82) at `x`. */
export function Kid({
  x,
  shirt,
  mood = 'smile',
  pose = 'stand',
  skin = SKIN,
}: {
  x: number
  shirt: string
  mood?: Mood
  pose?: Pose
  skin?: string
}) {
  if (pose === 'sit') {
    const hy = 50
    return (
      <g>
        <path d={`M${x - 2} 79 H${x + 15}`} {...limb} strokeWidth={4.5} />
        <rect x={x - 9} y={hy + 10} width="18" height="20" rx="6" fill={shirt} />
        <circle cx={x} cy={hy} r="10" fill={skin} />
        <path
          d={`M${x - 10} ${hy - 1} Q${x} ${hy - 16} ${x + 10} ${hy - 1} Q${x} ${hy - 7} ${x - 10} ${hy - 1} Z`}
          fill={HAIR}
        />
        <Face x={x} y={hy + 1} mood={mood} />
      </g>
    )
  }
  if (pose === 'away') {
    // seen from the back, walking off
    const hy = 34
    return (
      <g>
        <path d={`M${x - 4} 68 L${x - 8} 82 M${x + 4} 68 L${x + 7} 81`} {...limb} strokeWidth={4} />
        <rect x={x - 9} y={hy + 10} width="18" height="25" rx="6" fill={shirt} />
        <circle cx={x} cy={hy} r="10" fill={HAIR} />
      </g>
    )
  }
  const hy = 34
  const legs =
    pose === 'run'
      ? `M${x - 3} 68 L${x - 11} 79 M${x + 3} 68 L${x + 10} 80`
      : `M${x - 4} 68 V82 M${x + 4} 68 V82`
  const arms: Record<Exclude<Pose, 'sit' | 'away'>, string> = {
    stand: `M${x - 8} 48 L${x - 12} 62 M${x + 8} 48 L${x + 12} 62`,
    run: `M${x - 8} 48 L${x - 15} 56 M${x + 8} 48 L${x + 15} 42`,
    wave: `M${x - 8} 48 L${x - 12} 62 M${x + 8} 48 L${x + 15} 34`,
    reach: `M${x - 8} 48 L${x - 12} 62 M${x + 8} 48 L${x + 19} 52`,
  }
  return (
    <g>
      <path d={legs} {...limb} strokeWidth={4} />
      <path d={arms[pose]} {...limb} />
      {pose === 'wave' && <circle cx={x + 16} cy={32} r="3.5" fill={skin} />}
      <rect x={x - 9} y={hy + 10} width="18" height="25" rx="6" fill={shirt} />
      <circle cx={x} cy={hy} r="10" fill={skin} />
      <path
        d={`M${x - 10} ${hy - 1} Q${x} ${hy - 16} ${x + 10} ${hy - 1} Q${x} ${hy - 7} ${x - 10} ${hy - 1} Z`}
        fill={HAIR}
      />
      <Face x={x} y={hy + 1} mood={mood} />
      {pose === 'run' && (
        <path
          d={`M${x - 26} 46 H${x - 16} M${x - 28} 56 H${x - 18} M${x - 25} 66 H${x - 15}`}
          {...limb}
          strokeWidth={2.5}
          strokeOpacity={0.5}
        />
      )}
    </g>
  )
}

/** A grown-up: grandma in a white headscarf, grandpa in a dark doppi. */
export function Elder({
  x,
  who,
  mood = 'smile',
}: {
  x: number
  who: 'grandma' | 'grandpa'
  mood?: Mood
}) {
  const hy = 22
  return (
    <g>
      <path d={`M${x - 5} 68 V82 M${x + 5} 68 V82`} {...limb} strokeWidth={4.5} />
      <path d={`M${x - 11} 38 L${x - 15} 56 M${x + 11} 38 L${x + 15} 56`} {...limb} />
      <rect
        x={x - 12}
        y={hy + 11}
        width="24"
        height="38"
        rx="8"
        fill={who === 'grandma' ? '#81C784' : '#8D6E63'}
      />
      {who === 'grandma' && (
        <path
          d={`M${x - 14} ${hy + 8} Q${x - 15} ${hy - 14} ${x} ${hy - 14} Q${x + 15} ${hy - 14} ${x + 14} ${hy + 8} Z`}
          fill="#FAFAFA"
          stroke={INK}
          strokeOpacity="0.25"
          strokeWidth="1.5"
        />
      )}
      <circle cx={x} cy={hy} r="11" fill={SKIN_2} />
      {who === 'grandpa' && (
        <>
          <path
            d={`M${x - 10} ${hy - 4} L${x - 8} ${hy - 13} H${x + 8} L${x + 10} ${hy - 4} Z`}
            fill="#263238"
          />
          <path
            d={`M${x - 5} ${hy - 9} h3 M${x + 2} ${hy - 9} h3`}
            stroke="#fff"
            strokeWidth="1.6"
          />
          <path
            d={`M${x - 8} ${hy + 5} Q${x} ${hy + 18} ${x + 8} ${hy + 5} Q${x} ${hy + 9} ${x - 8} ${hy + 5} Z`}
            fill="#ECEFF1"
          />
        </>
      )}
      <Face x={x} y={hy} mood={mood} />
    </g>
  )
}

/** A speech bubble whose tail points down-left (or right with `flip`). */
export function Bubble({
  x,
  y,
  children,
  flip = false,
}: {
  x: number
  y: number
  children: ReactNode
  flip?: boolean
}) {
  const tail = flip
    ? `M${x + 18} ${y + 17} L${x + 22} ${y + 25} L${x + 11} ${y + 17} Z`
    : `M${x + 6} ${y + 17} L${x + 2} ${y + 25} L${x + 13} ${y + 17} Z`
  return (
    <g>
      <rect x={x} y={y} width="26" height="19" rx="7" fill="#fff" stroke={INK} strokeWidth="2" />
      <path d={tail} fill="#fff" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <rect x={x + 2} y={y + 14} width="16" height="4" fill="#fff" />
      {children}
    </g>
  )
}

/** A question mark drawn as a path (no SVG text, so it never joins the button's text). */
export const Question = ({ x, y }: { x: number; y: number }) => (
  <g fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path
      d={`M${x + 9.5} ${y + 6.5} C${x + 9.5} ${y + 2.5} ${x + 16.5} ${y + 2.5} ${x + 16.5} ${y + 6.5} C${x + 16.5} ${y + 9.5} ${x + 13} ${y + 9.5} ${x + 13} ${y + 12}`}
    />
    <circle cx={x + 13} cy={y + 15.5} r="1.6" fill={INK} stroke="none" />
  </g>
)

export function Heart({
  x,
  y,
  s = 1,
  fill = '#F06292',
}: {
  x: number
  y: number
  s?: number
  fill?: string
}) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 4 C-6 -2 -2 -8 0 -4 C2 -8 6 -2 0 4 Z"
      fill={fill}
    />
  )
}

export const BubbleHeart = ({ x, y, flip }: { x: number; y: number; flip?: boolean }) => (
  <Bubble x={x} y={y} flip={flip}>
    <Heart x={x + 13} y={y + 10} s={1.25} />
  </Bubble>
)

export function Ball({ x, y, r = 7 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#FF7043" stroke={INK} strokeWidth="1.8" />
      <path
        d={`M${x - r} ${y} Q${x} ${y - r * 0.6} ${x + r} ${y}`}
        stroke="#fff"
        strokeWidth="1.8"
        fill="none"
      />
    </g>
  )
}

export function Teddy({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x - 5} cy={y - 8} r="3" fill="#A1887F" />
      <circle cx={x + 5} cy={y - 8} r="3" fill="#A1887F" />
      <ellipse cx={x} cy={y + 7} rx="7" ry="7" fill="#A1887F" />
      <circle cx={x} cy={y - 3} r="6.5" fill="#BCAAA4" />
      <circle cx={x - 2} cy={y - 4} r="1" fill={INK} />
      <circle cx={x + 2} cy={y - 4} r="1" fill={INK} />
    </g>
  )
}

export function Blocks({ x, scattered = false }: { x: number; scattered?: boolean }) {
  if (scattered) {
    return (
      <g stroke={INK} strokeWidth="1.5">
        <rect
          x={x}
          y={70}
          width="11"
          height="11"
          rx="2"
          fill="#FFB74D"
          transform={`rotate(-14 ${x + 5} 75)`}
        />
        <rect
          x={x + 14}
          y={72}
          width="11"
          height="11"
          rx="2"
          fill="#64B5F6"
          transform={`rotate(10 ${x + 19} 77)`}
        />
        <rect
          x={x + 6}
          y={60}
          width="11"
          height="11"
          rx="2"
          fill="#81C784"
          transform={`rotate(24 ${x + 11} 65)`}
        />
      </g>
    )
  }
  return (
    <g stroke={INK} strokeWidth="1.5">
      <rect x={x} y={71} width="11" height="11" rx="2" fill="#FFB74D" />
      <rect x={x + 12} y={71} width="11" height="11" rx="2" fill="#64B5F6" />
      <rect x={x + 6} y={59} width="11" height="11" rx="2" fill="#81C784" />
    </g>
  )
}

/** Blocks flying through the air. */
export function Flying({ x }: { x: number }) {
  return (
    <g>
      <g stroke={INK} strokeWidth="1.5">
        <rect
          x={x}
          y={22}
          width="10"
          height="10"
          rx="2"
          fill="#FFB74D"
          transform={`rotate(20 ${x + 5} 27)`}
        />
        <rect
          x={x + 14}
          y={36}
          width="10"
          height="10"
          rx="2"
          fill="#64B5F6"
          transform={`rotate(-25 ${x + 19} 41)`}
        />
      </g>
      <path
        d={`M${x - 10} 30 H${x - 3} M${x + 3} 46 H${x + 10}`}
        {...limb}
        strokeWidth={2.2}
        strokeOpacity={0.5}
      />
    </g>
  )
}

/** A spilt cup and its puddle. */
export function Spill({ x }: { x: number }) {
  return (
    <g>
      <ellipse cx={x + 8} cy={81} rx="15" ry="3.5" fill="#FFB74D" opacity="0.8" />
      <path
        d={`M${x - 8} 72 L${x + 6} 76 L${x + 4} 84 L${x - 10} 80 Z`}
        fill="#E1F5FE"
        stroke={INK}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </g>
  )
}

export function Cloth({ x }: { x: number }) {
  return (
    <rect x={x} y={74} width="13" height="7" rx="2" fill="#F48FB1" stroke={INK} strokeWidth="1.5" />
  )
}

/** Somsa on a plate. */
export function Somsa({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y + 4} rx="13" ry="3.5" fill="#fff" stroke={INK} strokeWidth="1.5" />
      <path
        d={`M${x - 9} ${y + 3} L${x} ${y - 9} L${x + 9} ${y + 3} Z`}
        fill="#F4B860"
        stroke={INK}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx={x - 2} cy={y - 2} r="0.9" fill={INK} />
      <circle cx={x + 2} cy={y} r="0.9" fill={INK} />
    </g>
  )
}

export function Tv({ x }: { x: number }) {
  return (
    <g>
      <path d={`M${x + 8} 46 L${x + 3} 38 M${x + 14} 46 L${x + 19} 38`} {...limb} strokeWidth={2} />
      <rect
        x={x}
        y={46}
        width="24"
        height="18"
        rx="3"
        fill="#90CAF9"
        stroke={INK}
        strokeWidth="2"
      />
      <path d={`M${x + 6} 64 L${x + 4} 70 M${x + 18} 64 L${x + 20} 70`} {...limb} strokeWidth={2} />
      <circle cx={x + 12} cy={55} r="4" fill="#FFF176" />
    </g>
  )
}

/** A playground slide on the right. */
export function Slide({ x }: { x: number }) {
  return (
    <g>
      <path d={`M${x} 82 V34 M${x + 6} 82 V34`} {...limb} strokeWidth={2.5} />
      <path
        d={`M${x} 42 H${x + 6} M${x} 52 H${x + 6} M${x} 62 H${x + 6} M${x} 72 H${x + 6}`}
        {...limb}
        strokeWidth={2}
      />
      <path
        d={`M${x + 6} 34 Q${x + 14} 34 ${x + 18} 50 Q${x + 22} 76 ${x + 30} 80`}
        stroke="#FFB300"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  )
}

/** A wall clock: "later". */
export function Clock({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="9" fill="#fff" stroke={INK} strokeWidth="2" />
      <path d={`M${x} ${y} V${y - 6} M${x} ${y} H${x + 4}`} {...limb} strokeWidth={2} />
    </g>
  )
}

/** Slow breath rings around the head. */
export function BreathRings({ x }: { x: number }) {
  return (
    <g stroke="#26A69A" strokeWidth="2.5" fill="none" strokeLinecap="round">
      <path d={`M${x + 14} 26 Q${x + 22} 34 ${x + 14} 42`} opacity="0.9" />
      <path d={`M${x + 20} 20 Q${x + 32} 34 ${x + 20} 48`} opacity="0.6" />
      <path d={`M${x - 14} 26 Q${x - 22} 34 ${x - 14} 42`} opacity="0.9" />
      <path d={`M${x - 20} 20 Q${x - 32} 34 ${x - 20} 48`} opacity="0.6" />
    </g>
  )
}

export const Sparkle = ({ x, y }: { x: number; y: number }) => (
  <path
    d={`M${x} ${y - 5} V${y + 5} M${x - 5} ${y} H${x + 5}`}
    stroke="#FFB300"
    strokeWidth="2.4"
    strokeLinecap="round"
  />
)

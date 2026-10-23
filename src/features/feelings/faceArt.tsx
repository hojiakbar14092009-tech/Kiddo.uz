import type { ReactNode } from 'react'
import type { FeelingId } from './content'

/*
 * Kiddo's own feeling faces (simple SVG, no emoji, no characters), drawn on
 * a 120 × 120 face. Each face differs in more than colour: eyebrows, eyes,
 * mouth and one extra sign (a tear, a drop of sweat, pink cheeks, a medal),
 * so a child who does not tell colours apart can still read them.
 */

export const FACE_INK = '#3a2e4d'
/** One colour for every face from L3 on: the face, not the colour, tells the feeling. */
export const NEUTRAL_FILL = '#FFE3B8'
const INK = FACE_INK

export interface FaceArt {
  fill: string
  parts: ReactNode
}

const line = { stroke: INK, strokeWidth: 5, strokeLinecap: 'round', fill: 'none' } as const
const thick = { ...line, strokeWidth: 6 } as const

const dotEyes = (y = 52, r = 5.5) => (
  <>
    <circle cx="42" cy={y} r={r} fill={INK} />
    <circle cx="78" cy={y} r={r} fill={INK} />
  </>
)

export const FACE_ART: Readonly<Record<FeelingId, FaceArt>> = {
  happy: {
    fill: '#FFD54F',
    parts: (
      <>
        {dotEyes()}
        <path d="M34 70 Q60 102 86 70 Q60 80 34 70 Z" fill={INK} />
        <path d="M48 86 Q60 94 72 86 Q60 82 48 86 Z" fill="#F48FB1" />
        <circle cx="30" cy="68" r="6" fill="#FF8A65" opacity="0.45" />
        <circle cx="90" cy="68" r="6" fill="#FF8A65" opacity="0.45" />
      </>
    ),
  },
  sad: {
    fill: '#9CC9F0',
    parts: (
      <>
        <path d="M30 42 L50 34" {...line} />
        <path d="M70 34 L90 42" {...line} />
        {dotEyes(54)}
        <path d="M40 90 Q60 70 80 90" {...line} />
        <path d="M38 62 Q31 74 38 79 Q45 74 38 62 Z" fill="#2E86DE" />
      </>
    ),
  },
  angry: {
    fill: '#FF9E80',
    parts: (
      <>
        <path d="M30 36 L52 46" {...thick} />
        <path d="M68 46 L90 36" {...thick} />
        {dotEyes(56)}
        <rect
          x="38"
          y="76"
          width="44"
          height="16"
          rx="5"
          fill="#fff"
          stroke={INK}
          strokeWidth="4"
        />
        <path d="M38 84 H82 M49 76 V92 M60 76 V92 M71 76 V92" stroke={INK} strokeWidth="3" />
      </>
    ),
  },
  scared: {
    fill: '#D7C6F5',
    parts: (
      <>
        <path d="M30 32 Q40 24 52 30" {...line} />
        <path d="M68 30 Q80 24 90 32" {...line} />
        <circle cx="42" cy="50" r="11" fill="#fff" stroke={INK} strokeWidth="3.5" />
        <circle cx="78" cy="50" r="11" fill="#fff" stroke={INK} strokeWidth="3.5" />
        <circle cx="42" cy="51" r="3.5" fill={INK} />
        <circle cx="78" cy="51" r="3.5" fill={INK} />
        <rect x="40" y="74" width="40" height="20" rx="9" fill={INK} />
        <path
          d="M44 84 L50 79 L56 84 L62 79 L68 84 L74 79 L77 82"
          stroke="#fff"
          strokeWidth="3"
          fill="none"
          strokeLinejoin="round"
        />
        <path d="M6 50 Q2 56 6 62 M114 50 Q118 56 114 62" {...line} strokeWidth={3.5} />
      </>
    ),
  },
  surprised: {
    fill: '#FFCC80',
    parts: (
      <>
        <path d="M30 30 Q41 18 52 30" {...line} />
        <path d="M68 30 Q79 18 90 30" {...line} />
        <circle cx="42" cy="50" r="7" fill={INK} />
        <circle cx="78" cy="50" r="7" fill={INK} />
        <circle cx="44.5" cy="47.5" r="2.2" fill="#fff" />
        <circle cx="80.5" cy="47.5" r="2.2" fill="#fff" />
        <ellipse cx="60" cy="84" rx="10" ry="13" fill={INK} />
      </>
    ),
  },
  calm: {
    fill: '#A8E6CF',
    parts: (
      <>
        <path d="M33 52 Q42 60 51 52" {...line} />
        <path d="M69 52 Q78 60 87 52" {...line} />
        <path d="M46 80 Q60 90 74 80" {...line} />
        <circle cx="30" cy="68" r="6" fill="#4DB6AC" opacity="0.35" />
        <circle cx="90" cy="68" r="6" fill="#4DB6AC" opacity="0.35" />
      </>
    ),
  },
  proud: {
    fill: '#FFB74D',
    parts: (
      <>
        <path d="M30 32 Q40 26 50 30" {...line} />
        <path d="M70 30 Q80 26 90 32" {...line} />
        <path d="M33 50 Q42 40 51 50" {...line} />
        <path d="M69 50 Q78 40 87 50" {...line} />
        <path d="M36 70 Q60 92 84 70" {...line} />
        <circle cx="92" cy="94" r="15" fill="#FFE082" stroke={INK} strokeWidth="3.5" />
        <path
          d="M92 85 L94.6 90.6 L100.6 91.2 L96 95.2 L97.4 101 L92 98 L86.6 101 L88 95.2 L83.4 91.2 L89.4 90.6 Z"
          fill={INK}
        />
      </>
    ),
  },
  shy: {
    fill: '#FFD6E0',
    parts: (
      <>
        <path d="M34 48 Q42 44 50 48" {...line} strokeWidth={4} />
        <path d="M70 48 Q78 44 86 48" {...line} strokeWidth={4} />
        <circle cx="39" cy="58" r="4.5" fill={INK} />
        <circle cx="75" cy="58" r="4.5" fill={INK} />
        <ellipse cx="32" cy="72" rx="10" ry="6.5" fill="#F06292" opacity="0.6" />
        <ellipse cx="88" cy="72" rx="10" ry="6.5" fill="#F06292" opacity="0.6" />
        <path
          d="M27 70 L30 75 M33 70 L36 75 M83 70 L86 75 M89 70 L92 75"
          stroke={INK}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path d="M50 84 Q55 80 60 84 Q65 88 70 84" {...line} strokeWidth={4} />
      </>
    ),
  },
  worried: {
    fill: '#CFD8E3',
    parts: (
      <>
        <path d="M30 44 Q40 34 52 36" {...line} />
        <path d="M68 36 Q80 34 90 44" {...line} />
        {dotEyes(54)}
        <path
          d="M40 86 Q45 79 50 86 Q55 93 60 86 Q65 79 70 86 Q75 93 80 86"
          {...line}
          strokeWidth={4.5}
        />
        <path d="M94 22 Q86 34 94 39 Q102 34 94 22 Z" fill="#42A5F5" />
      </>
    ),
  },
  disappointed: {
    // soft, level brows and heavy lids with a little sigh: let down, not cross
    fill: '#E3D2B8',
    parts: (
      <>
        <path d="M31 43 Q41 40 51 43" {...line} strokeWidth={4} />
        <path d="M69 43 Q79 40 89 43" {...line} strokeWidth={4} />
        <path d="M33 55 H51" {...line} strokeWidth={4} />
        <path d="M69 55 H87" {...line} strokeWidth={4} />
        <path d="M35 55 A7 6 0 0 0 49 55 Z" fill={INK} />
        <path d="M71 55 A7 6 0 0 0 85 55 Z" fill={INK} />
        <path d="M46 86 Q60 79 74 86" {...line} strokeWidth={4.5} />
        <circle
          cx="84"
          cy="84"
          r="3.2"
          fill="#fff"
          stroke={INK}
          strokeOpacity="0.45"
          strokeWidth="1.8"
        />
        <circle
          cx="92"
          cy="78"
          r="2.3"
          fill="#fff"
          stroke={INK}
          strokeOpacity="0.45"
          strokeWidth="1.5"
        />
      </>
    ),
  },
}

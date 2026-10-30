import type { ReactNode } from 'react'
import type { ScaleStopId } from './scales'

/*
 * One flat drawing per stop, in a 100 × 100 box whose width is the object's
 * size across: the Scale Portal draws them all at their true relative size.
 */
export const SCALE_DRAWINGS: Record<ScaleStopId, ReactNode> = {
  cell: (
    <>
      <circle cx="50" cy="50" r="48" fill="#E2574C" />
      <circle cx="50" cy="50" r="26" fill="#C23B33" />
      <ellipse cx="38" cy="30" rx="14" ry="6" fill="#FFFFFF" opacity="0.35" />
    </>
  ),
  ant: (
    <>
      <path
        d="M30 60 L14 74 M40 62 L36 82 M58 62 L64 82 M68 60 L86 74 M36 44 L18 36 M64 44 L82 36 M72 34 L82 14 M78 36 L94 26"
        stroke="#2B2A4C"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <ellipse cx="22" cy="54" rx="20" ry="14" fill="#3A2E28" />
      <ellipse cx="50" cy="52" rx="12" ry="9" fill="#4A3A30" />
      <circle cx="76" cy="46" r="12" fill="#4A3A30" />
    </>
  ),
  child: (
    <>
      <circle cx="50" cy="13" r="11" fill="#F2C9A0" />
      <path d="M40 5 Q50 -3 60 5 L59 11 Q50 6 41 11 Z" fill="#2B2A4C" />
      <rect x="38" y="26" width="24" height="36" rx="9" fill="#3C8EE0" />
      <rect
        x="28"
        y="28"
        width="9"
        height="30"
        rx="4.5"
        fill="#3C8EE0"
        transform="rotate(12 32 28)"
      />
      <rect
        x="63"
        y="28"
        width="9"
        height="30"
        rx="4.5"
        fill="#3C8EE0"
        transform="rotate(-12 68 28)"
      />
      <rect x="40" y="58" width="9" height="40" rx="4.5" fill="#2B3B6B" />
      <rect x="51" y="58" width="9" height="40" rx="4.5" fill="#2B3B6B" />
    </>
  ),
  tower: (
    <>
      <path d="M48 0 h4 v20 h-4 z" fill="#8A93A6" />
      <path d="M44 20 h12 l4 30 h-20 z" fill="#C7CEDD" />
      <ellipse cx="50" cy="52" rx="14" ry="5" fill="#3C4F86" />
      <path d="M42 56 h16 l12 44 h-40 z" fill="#E1E6F0" />
      <path d="M30 100 L50 60 L70 100" fill="none" stroke="#8A93A6" strokeWidth="3" />
    </>
  ),
  city: (
    <>
      <rect x="0" y="70" width="100" height="30" fill="#7FC8A0" />
      {[
        [4, 52, 12],
        [18, 40, 10],
        [30, 58, 14],
        [46, 30, 10],
        [58, 46, 14],
        [74, 36, 10],
        [86, 54, 12],
      ].map(([x, y, w]) => (
        <rect key={`${x}`} x={x} y={y} width={w} height={70 - y!} fill="#5C6B8C" />
      ))}
      <rect x="50" y="10" width="2" height="20" fill="#5C6B8C" />
    </>
  ),
  earth: (
    <>
      <circle cx="50" cy="50" r="50" fill="#2F7FD8" />
      <path
        d="M20 30 q10 -12 24 -6 q6 10 -4 18 q-10 4 -8 16 q-10 4 -14 -6 q-6 -12 2 -22z M56 56 q12 -6 22 2 q6 12 -6 22 q-12 4 -16 -8 q-4 -10 0 -16z M60 14 q10 -2 16 6 q-8 4 -16 -6z"
        fill="#4CB76A"
      />
      <ellipse cx="34" cy="22" rx="16" ry="6" fill="#FFFFFF" opacity="0.3" />
    </>
  ),
  jupiter: (
    <>
      <circle cx="50" cy="50" r="50" fill="#D9A877" />
      <path d="M4 34 h92 M2 50 h96 M4 66 h92" stroke="#B57D52" strokeWidth="7" />
      <ellipse cx="66" cy="62" rx="10" ry="5" fill="#C2553E" />
    </>
  ),
  sun: (
    <>
      <circle cx="50" cy="50" r="50" fill="#FFB534" />
      <circle cx="50" cy="50" r="40" fill="#FFD467" />
      <circle cx="36" cy="36" r="10" fill="#FFF0B3" opacity="0.8" />
    </>
  ),
  'solar-system': (
    <>
      {[48, 34, 22, 12].map((r) => (
        <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="#9DB0E0" strokeWidth="1.2" />
      ))}
      <circle cx="50" cy="50" r="4" fill="#FFB534" />
      <circle cx="98" cy="50" r="2.4" fill="#5B8DEF" />
      <circle cx="50" cy="16" r="2" fill="#D9A877" />
      <circle cx="28" cy="50" r="1.6" fill="#2F7FD8" />
    </>
  ),
  galaxy: (
    <>
      <ellipse cx="50" cy="50" rx="50" ry="22" fill="#2B2A6B" opacity="0.5" />
      <path
        d="M50 50 C 70 30, 96 44, 86 60 C 78 72, 52 70, 50 50 C 30 70, 4 56, 14 40 C 22 28, 48 30, 50 50"
        fill="#B9A6FF"
        opacity="0.75"
      />
      <circle cx="50" cy="50" r="7" fill="#FFF0B3" />
    </>
  ),
}

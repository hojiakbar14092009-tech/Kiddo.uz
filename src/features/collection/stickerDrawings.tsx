import type { ReactNode } from 'react'

/* The drawings of the Kiddo Universe stickers (viewBox 0 0 100 100). */

const INK = '#2b2a4c'

export const STICKER_DRAWINGS: Record<string, ReactNode> = {
  'discovery-map': (
    <>
      <path d="M14 26 38 18l24 8 24-8v56l-24 8-24-8-24 8z" fill="#f6d58e" />
      <path d="M38 18v56M62 26v56" stroke="#d9a94f" strokeWidth="3" />
      <path
        d="M22 66c8-4 10-14 20-14s10 10 18 6 10-16 18-18"
        fill="none"
        stroke="#e2574c"
        strokeWidth="4"
        strokeDasharray="5 5"
        strokeLinecap="round"
      />
      <path d="m72 32 8 8m0-8-8 8" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="22" cy="66" r="4.5" fill="#3c8ee0" />
    </>
  ),
  'living-alphabet': (
    <>
      <path d="M50 12 22 84h15l6-17h14l6 17h15z" fill="#7c5ce6" />
      <path d="m46 54 4-14 4 14z" fill="#fff" />
      <circle cx="42" cy="34" r="5" fill="#fff" />
      <circle cx="58" cy="34" r="5" fill="#fff" />
      <circle cx="43" cy="35" r="2.4" fill={INK} />
      <circle cx="59" cy="35" r="2.4" fill={INK} />
      <path d="M44 44q6 5 12 0" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M30 84v8m40-8v8" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <path d="M18 48h10M72 48h10" stroke="#7c5ce6" strokeWidth="6" strokeLinecap="round" />
    </>
  ),
  'galaxy-book': (
    <>
      <path d="M50 80C38 72 24 72 12 76V30c12-4 26-4 38 4z" fill="#3c8ee0" />
      <path d="M50 80c12-8 26-8 38-4V30c-12-4-26-4-38 4z" fill="#2f6fc0" />
      <path d="M50 34v46" stroke="#fff" strokeWidth="3" />
      <path
        d="M50 30c-14-2-16-16-4-20 10-3 18 6 12 12-5 5-12 0-8-4"
        fill="none"
        stroke="#f2b8ff"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="30" cy="18" r="3" fill="#ffd34d" />
      <circle cx="70" cy="14" r="2.5" fill="#ffd34d" />
      <circle cx="76" cy="26" r="2" fill="#fff" />
    </>
  ),
  'scale-portal': (
    <>
      <path d="M18 88V44a32 32 0 0 1 64 0v44z" fill="#2fb59a" />
      <path d="M28 88V46a22 22 0 0 1 44 0v42z" fill="#173f63" />
      <path d="M50 32v34M34 44h32" stroke="#ffd34d" strokeWidth="4" strokeLinecap="round" />
      <path d="M28 58a6 6 0 0 0 12 0zm32 0a6 6 0 0 0 12 0z" fill="#ffd34d" />
      <path d="M34 44 30 58m4-14 4 14m28-14-4 14m4-14 4 14" stroke="#ffd34d" strokeWidth="2" />
      <path d="M40 76h20" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
    </>
  ),
  'thought-lantern': (
    <>
      <path d="M38 14h24l-4 10H42z" fill={INK} />
      <path d="M30 28h40l-6 48H36z" fill="#ffb648" />
      <path d="M36 76h28v8H36z" fill={INK} />
      <path d="M44 44h5a4 4 0 1 1 8 0h5v8a4 4 0 1 0 0 8v8H44v-8a4 4 0 1 1 0-8z" fill="#fff6c9" />
      <path d="M50 6v8" stroke={INK} strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  'magic-pencil': (
    <>
      <path d="M66 14 82 30 38 74 22 58z" fill="#ffb648" />
      <path d="m66 14 16 16 4-4a6 6 0 0 0 0-8l-8-8a6 6 0 0 0-8 0z" fill="#f2789c" />
      <path d="m22 58 16 16-22 6z" fill="#f6d5a8" />
      <path d="m14 82 6-12 10 10z" fill={INK} />
      <path d="m56 24 16 16" stroke="#e08f2b" strokeWidth="3" />
      <path
        d="m24 22 3 7 7 3-7 3-3 7-3-7-7-3 7-3zm52 46 2 5 5 2-5 2-2 5-2-5-5-2 5-2z"
        fill="#7c5ce6"
      />
    </>
  ),
  'cosmic-garden': (
    <>
      <circle cx="50" cy="60" r="28" fill="#6f58d8" />
      <path d="M24 66c10 6 42 6 52 0" stroke="#9d8af0" strokeWidth="4" fill="none" />
      <path d="M50 32V14" stroke="#3a9b52" strokeWidth="4" strokeLinecap="round" />
      <path
        d="M50 24c-10 0-14-6-14-12 8 0 14 4 14 12zm0-4c8 0 12-4 12-10-7 0-12 3-12 10z"
        fill="#4cc069"
      />
      <path
        d="M32 38 26 26m4 6c-6 0-8-4-8-8 5 0 8 3 8 8z"
        stroke="#3a9b52"
        strokeWidth="3"
        fill="#4cc069"
      />
      <circle cx="40" cy="56" r="4" fill="#9d8af0" />
      <circle cx="62" cy="70" r="5" fill="#9d8af0" />
      <circle cx="82" cy="22" r="3" fill="#ffd34d" />
    </>
  ),
  'crystal-rocket': (
    <>
      <path d="M50 8 66 30v34H34V30z" fill="#7fd6f0" />
      <path d="m50 8 16 22H50z" fill="#b6ecfb" />
      <path d="M50 30v34" stroke="#4aa9d0" strokeWidth="3" />
      <circle cx="50" cy="40" r="7" fill="#fff" stroke="#4aa9d0" strokeWidth="3" />
      <path d="M34 50 22 66h12zm32 0 12 16H66z" fill="#e2574c" />
      <path d="M40 64h20l-4 14h-12z" fill="#ffb648" />
      <path d="M44 78h12l-6 12z" fill="#ffd34d" />
    </>
  ),
  'science-crystal': (
    <>
      <path d="M22 80h56l-6 8H28z" fill={INK} />
      <path d="M50 14 62 34 54 80H46l-8-46z" fill="#3fc1c9" />
      <path d="m50 14 12 20H38z" fill="#9be7ea" />
      <path d="M30 40 38 52l-4 28h-8l-4-26z" fill="#7c5ce6" />
      <path d="m70 40 8 14-4 26h-8l-4-28z" fill="#f2789c" />
      <circle cx="74" cy="24" r="4" fill="#9be7ea" />
      <circle cx="82" cy="14" r="2.5" fill="#9be7ea" />
    </>
  ),
  observatory: (
    <>
      <path d="M18 88V60a32 32 0 0 1 64 0v28z" fill="#e9edf5" />
      <path d="M50 28a32 32 0 0 1 32 32H18a32 32 0 0 1 32-32z" fill="#3c4f86" />
      <path d="m46 30 4 30h8l-4-30z" fill="#1d2a52" />
      <path d="m52 46 24-30 8 6-26 28z" fill="#ffb648" />
      <path d="M40 72h20v16H40z" fill="#3c4f86" />
      <path
        d="m20 16 2 5 5 2-5 2-2 5-2-5-5-2 5-2zm60 52 1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z"
        fill="#ffd34d"
      />
    </>
  ),
  'time-capsule': (
    <>
      <rect x="18" y="26" width="64" height="52" rx="26" fill="#ffb648" />
      <path d="M50 26v52" stroke="#e08f2b" strokeWidth="4" />
      <circle cx="50" cy="52" r="17" fill="#fff6c9" stroke={INK} strokeWidth="3" />
      <path d="M50 42v10l7 5" stroke={INK} strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path
        d="M34 18c4-6 28-6 32 0"
        stroke="#7c5ce6"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="26" cy="86" r="3" fill="#7c5ce6" />
      <circle cx="74" cy="86" r="3" fill="#7c5ce6" />
    </>
  ),
  'star-compass': (
    <>
      <circle cx="50" cy="50" r="36" fill="#173f63" />
      <circle cx="50" cy="50" r="28" fill="none" stroke="#3c8ee0" strokeWidth="3" />
      <path d="m50 18 8 32-8 32-8-32z" fill="#ffd34d" />
      <path d="m18 50 32-8 32 8-32 8z" fill="#fff" />
      <circle cx="50" cy="50" r="5" fill="#e2574c" />
      <path
        d="m24 24 2 4 4 2-4 2-2 4-2-4-4-2 4-2zm52 40 1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5z"
        fill="#ffd34d"
      />
    </>
  ),
}

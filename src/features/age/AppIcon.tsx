import clsx from 'clsx'
import type { ReactNode } from 'react'
import { useAgeLevel } from '@/store/familyStore'

export type AppIconName =
  | 'find-letter'
  | 'find-picture'
  | 'memory'
  | 'trace'
  | 'alphabet'
  | 'numbers'
  | 'shop'
  | 'exam'
  | 'lock'
  | 'homework'
  | 'rest'

interface AppIconProps {
  name: AppIconName
  className?: string
}

/**
 * One icon, two looks. Four-year-olds get glossy, toy-like pictures; children of
 * five and six get calmer two-tone drawings, closer to a school workbook, but still
 * round and friendly.
 */
export function AppIcon({ name, className }: AppIconProps) {
  const level = useAgeLevel()
  if (level === 4) {
    return (
      <img
        src={`/icons/play/${name}.svg`}
        alt=""
        aria-hidden="true"
        draggable={false}
        className={clsx('pointer-events-none select-none', className)}
      />
    )
  }
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      fill="none"
      stroke="var(--icon-ink, var(--color-primary-ink))"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {SCHOOL_ICONS[name]}
    </svg>
  )
}

const FILL = 'var(--icon-fill, var(--color-primary-soft))'
const ACCENT = 'var(--color-coin)'

const SCHOOL_ICONS: Record<AppIconName, ReactNode> = {
  'find-letter': (
    <>
      <circle cx="20" cy="20" r="13" fill={FILL} />
      <path d="M15 26 20 13l5 13M16.8 21.5h6.4" />
      <path d="m30 30 10 10" strokeWidth={5} />
    </>
  ),
  'find-picture': (
    <>
      <rect x="6" y="9" width="36" height="30" rx="6" fill={FILL} />
      <circle cx="32" cy="18" r="4" fill={ACCENT} stroke="none" />
      <path d="m8 35 11-12 8 8 5-5 8 8" />
    </>
  ),
  memory: (
    <>
      <rect x="5" y="11" width="21" height="28" rx="5" fill={FILL} transform="rotate(-10 15 25)" />
      <rect
        x="22"
        y="9"
        width="21"
        height="28"
        rx="5"
        fill="var(--color-surface)"
        transform="rotate(8 32 23)"
      />
      <path
        d="m32 17 2 4.2 4.6.6-3.4 3.2.9 4.5L32 27.3l-4.1 2.2.9-4.5-3.4-3.2 4.6-.6z"
        fill={ACCENT}
        strokeWidth={2}
      />
      <path d="M12.5 21a3.5 3.5 0 1 1 5 3.2c-1.3.6-2 1.4-2 2.8M15.5 31v.5" />
    </>
  ),
  trace: (
    <>
      <path d="M6 38c6-10 10-14 14-10s8 4 12-4" strokeDasharray="1 6" />
      <path d="m28 30 12-20 4 2.4-12 20-5 3z" fill={ACCENT} />
      <path d="m38 13.5 4 2.4" />
    </>
  ),
  alphabet: (
    <>
      <rect x="5" y="7" width="38" height="34" rx="8" fill={FILL} />
      <path d="m10 33 7-19 7 19M12.6 26.5h8.8" />
      <circle cx="33" cy="28" r="5" />
      <path d="M38 23v10" />
    </>
  ),
  numbers: (
    <>
      <rect x="5" y="7" width="38" height="34" rx="8" fill={FILL} />
      <path d="M10 18l3-2.5V33M10 33h6" />
      <path d="M20 19a3.5 3.5 0 1 1 6 2.5L20 33h7" />
      <path d="M31 17h6l-4 6a4.6 4.6 0 1 1-3.8 7.4" />
    </>
  ),
  shop: (
    <>
      <path d="M9 17h30l-2.5 23h-25z" fill={FILL} />
      <path d="M17 21v-6a7 7 0 0 1 14 0v6" />
      <path
        d="m24 26 1.8 3.6 4 .6-2.9 2.8.7 4L24 35.1 20.4 37l.7-4-2.9-2.8 4-.6z"
        fill={ACCENT}
        strokeWidth={2}
      />
    </>
  ),
  exam: (
    <>
      <path d="M15 7h18v10a9 9 0 0 1-18 0z" fill={ACCENT} />
      <path d="M15 11H8a6 6 0 0 0 7 8M33 11h7a6 6 0 0 1-7 8" />
      <path d="M24 26v7M16 41h16l-2-8H18z" fill={FILL} />
    </>
  ),
  lock: (
    <>
      <path d="M15 21v-6a9 9 0 0 1 18 0v6" />
      <rect x="9" y="21" width="30" height="21" rx="6" fill={ACCENT} />
      <path d="M24 29v5" />
    </>
  ),
  homework: (
    <>
      <rect x="9" y="5" width="30" height="38" rx="5" fill={FILL} />
      <path d="M16 15h16M16 22h16M16 29h8" />
      <path d="m27 33 4 4 8-9" stroke="var(--color-primary)" strokeWidth={4} />
    </>
  ),
  rest: (
    <>
      <path d="M32 33A15 15 0 0 1 20 8a16 16 0 1 0 20 20 15 15 0 0 1-8 5z" fill={FILL} />
      <path d="M33 10h6l-6 7h6" strokeWidth={2.5} />
    </>
  ),
}

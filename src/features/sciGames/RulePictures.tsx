import type { ReactNode } from 'react'
import { Img3D } from '@/components/ui/Img3D'

/*
 * Pictures for the rule cards (Phase 70) that show exactly what the child will see
 * in the game – the real blocks, coins, arrows, tiles and buttons – instead of a
 * symbol a four-year-old has to guess.
 */

const tile = 'flex items-center justify-center rounded-2xl font-display font-extrabold'

function row(children: ReactNode) {
  return (
    <span aria-hidden="true" className="flex items-center justify-center gap-2">
      {children}
    </span>
  )
}

export const RULE_PICTURES: Readonly<Record<string, () => ReactNode>> = {
  'magnet.tap': () =>
    row(
      <>
        <span className="text-7xl leading-none">🧲</span>
        <Img3D name="key" className="size-20 -rotate-12" eager />
      </>,
    ),
  'float.guess': () =>
    row(
      <>
        <span className={`${tile} h-14 bg-primary px-4 text-xl text-white`}>🛟</span>
        <span className={`${tile} h-14 bg-oops-soft px-4 text-xl text-oops-ink`}>⚓</span>
      </>,
    ),
  'scale.blocks': () =>
    row(
      <>
        {[
          [1, 'bg-sky'],
          [2, 'bg-primary'],
          [3, 'bg-oops'],
        ].map(([n, colour]) => (
          <span key={n} className={`${tile} size-16 text-3xl text-white ${colour}`}>
            {n}
          </span>
        ))}
      </>,
    ),
  'robot.arrows': () =>
    row(
      <>
        {['⬆️', '➡️', '➡️'].map((arrow, i) => (
          <span key={i} className={`${tile} size-16 bg-lilac-soft text-4xl`}>
            {arrow}
          </span>
        ))}
      </>,
    ),
  'robot.go': () => (
    <span
      aria-hidden="true"
      className={`${tile} h-16 bg-primary px-8 text-3xl text-white shadow-[0_6px_0_var(--color-primary-shadow)]`}
    >
      ▶
    </span>
  ),
  'train.letters': () =>
    row(
      <>
        {['o', 'l', 'm', 'a'].map((letter) => (
          <span
            key={letter}
            className={`${tile} size-14 bg-surface text-3xl shadow-[0_4px_0_var(--color-line)]`}
          >
            {letter}
          </span>
        ))}
      </>,
    ),
  'shop.price': () =>
    row(
      <>
        <Img3D name="lollipop" className="size-24" eager />
        <span className={`${tile} rotate-6 bg-oops px-4 py-1 text-3xl text-white`}>3</span>
      </>,
    ),
  'shop.coins': () =>
    row(
      <>
        {[1, 2, 5].map((n) => (
          <span
            key={n}
            className={`${tile} rounded-full border-4 border-coin-shadow bg-coin text-ink ${
              n === 5 ? 'size-20 text-3xl' : n === 2 ? 'size-16 text-2xl' : 'size-14 text-xl'
            }`}
          >
            {n}
          </span>
        ))}
      </>,
    ),
  'shapes.tray': () => (
    <svg viewBox="0 0 220 60" className="h-20 w-56" aria-hidden="true">
      <circle cx="28" cy="30" r="24" fill="#ffc93c" />
      <rect x="62" y="8" width="44" height="44" rx="4" fill="#ff8a4c" />
      <path d="M140 6 L164 54 L116 54 Z" fill="#d93d78" />
      <rect x="172" y="18" width="46" height="24" rx="4" fill="#2f7fc4" />
    </svg>
  ),
  'shapes.glow': () => (
    <svg viewBox="0 0 100 100" className="size-28" aria-hidden="true">
      <path
        d="M50 10 L90 86 L10 86 Z"
        fill="none"
        stroke="#13917e"
        strokeWidth="5"
        strokeDasharray="10 7"
      />
    </svg>
  ),
}

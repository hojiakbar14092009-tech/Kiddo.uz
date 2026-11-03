import clsx from 'clsx'
import type { CSSProperties } from 'react'
import { fitSize } from './fitSize'

/**
 * A short label (a card title, a tab, a chip) that wraps only between words, never
 * inside one ("Пингвинёно / к"): the text keeps its size from `className`, and
 * shrinks only as far as the box needs for its longest word to fit on one line,
 * in every language, but never below 13 px: a box too narrow even then should get
 * a roomier layout. A word that still cannot fit (very large system text) breaks as
 * a last resort instead of running out of its card.
 *
 * The outer span is a size container, so it takes the width its parent gives it
 * and never sizes itself to the text: give it a box with a width (a grid cell, a
 * stretched flex item).
 */
export function FitWords({
  text,
  className,
  minLetters,
}: {
  text: string
  /** Size, weight, alignment and line height of the text at its largest. */
  className?: string
  /** Treat words as at least this long (keeps short names from growing past `className`). */
  minLetters?: number
}) {
  return (
    <span className={clsx('@container block w-full', className)}>
      <span
        style={{ '--fit': fitSize(text, minLetters) } as CSSProperties}
        // the floor is 13 px, not 0.8125 rem: the young children's look enlarges rem
        // (18 px), and a 14.6 px floor broke "Открывай" in a 320 px tab bar
        className="block text-[length:max(min(1em,13px),min(1em,var(--fit)))] [overflow-wrap:break-word] [word-break:normal] hyphens-none"
      >
        {text}
      </span>
    </span>
  )
}

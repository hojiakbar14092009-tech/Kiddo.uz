import clsx from 'clsx'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FitWords } from '@/components/ui/FitWords'

export interface Tile {
  to: string
  label: string
  picture: ReactNode
  tint: string
  testId?: string
}

/**
 * The most needed places of a section as big picture buttons at the very top
 * (Phase 75), so a child who cannot read yet finds them without scrolling: four
 * as two rows of wide buttons on a phone (the picture over the name below 380px,
 * where a name like "Узбекистан" needs the whole width), one row on a tablet; three or six
 * in rows of three.
 */
export function QuickTiles({ tiles, label }: { tiles: readonly Tile[]; label: string }) {
  // four long names do not fit side by side on a phone: two wide buttons per row there
  const wide = tiles.length === 4
  return (
    <nav aria-label={label} className="w-full max-w-4xl">
      <ul
        className={clsx(
          'grid gap-2 min-[380px]:gap-3 sm:gap-4',
          wide ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3',
        )}
      >
        {tiles.map((tile) => (
          <li key={tile.to}>
            <Link
              to={tile.to}
              aria-label={tile.label}
              data-testid={tile.testId}
              className={clsx(
                'flex h-full items-center rounded-3xl bg-surface shadow-[0_6px_0_var(--color-line)] transition-transform active:translate-y-1 sm:min-h-36 sm:flex-col sm:justify-center sm:gap-2 sm:p-3',
                wide
                  ? 'min-h-18 flex-col justify-center gap-1 p-1.5 min-[380px]:flex-row min-[380px]:justify-start min-[380px]:gap-2 min-[380px]:p-2'
                  : 'min-h-28 flex-col justify-center gap-1.5 p-1.5',
              )}
            >
              <span
                aria-hidden="true"
                className={clsx(
                  'flex shrink-0 items-center justify-center rounded-2xl sm:size-20',
                  wide ? 'size-11 min-[380px]:size-14' : 'size-14 min-[380px]:size-16',
                  tile.tint,
                )}
              >
                {tile.picture}
              </span>
              <FitWords
                text={tile.label}
                className={clsx(
                  'font-display leading-tight font-bold sm:text-center sm:text-xl',
                  wide
                    ? 'w-full min-w-0 text-center text-sm min-[380px]:w-auto min-[380px]:flex-1 min-[380px]:text-left min-[380px]:text-base sm:w-full sm:flex-none sm:text-center'
                    : 'w-full min-w-0 text-center text-sm min-[380px]:text-base',
                )}
              />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

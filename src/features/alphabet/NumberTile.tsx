import { LockIcon } from '@/components/icons'
import type { NumberEntry } from '@/content/numbers'
import type { TilePalette } from './letterPalette'

interface NumberTileProps {
  entry: NumberEntry
  word: string
  palette: TilePalette
  onSelect: (entry: NumberEntry) => void
  /** Not open yet (numbers open five at a time): a calm lock, not a button that does nothing. */
  locked?: string
}

export function NumberTile({ entry, word, palette, onSelect, locked }: NumberTileProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(entry)}
      disabled={locked !== undefined}
      aria-label={locked ?? `${entry.value} — ${word}`}
      style={{
        backgroundColor: palette.background,
        color: palette.ink,
        boxShadow: `0 5px 0 ${palette.shadow}`,
      }}
      className="relative flex aspect-[6/5] w-full items-center justify-center rounded-3xl font-display text-[clamp(2.25rem,7vw,3.5rem)] leading-none font-extrabold transition-transform active:translate-y-1 disabled:opacity-55 disabled:active:translate-y-0"
    >
      {entry.value}
      {locked !== undefined && (
        <LockIcon aria-hidden="true" size={22} className="absolute top-2 right-2 opacity-80" />
      )}
    </button>
  )
}

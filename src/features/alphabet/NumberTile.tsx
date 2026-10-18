import type { NumberEntry } from '@/content/numbers'
import type { TilePalette } from './letterPalette'

interface NumberTileProps {
  entry: NumberEntry
  word: string
  palette: TilePalette
  onSelect: (entry: NumberEntry) => void
}

export function NumberTile({ entry, word, palette, onSelect }: NumberTileProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(entry)}
      aria-label={`${entry.value} — ${word}`}
      style={{
        backgroundColor: palette.background,
        color: palette.ink,
        boxShadow: `0 5px 0 ${palette.shadow}`,
      }}
      className="flex aspect-[6/5] w-full items-center justify-center rounded-3xl font-display text-[clamp(2.25rem,7vw,3.5rem)] leading-none font-extrabold transition-transform active:translate-y-1"
    >
      {entry.value}
    </button>
  )
}

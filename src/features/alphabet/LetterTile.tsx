import { StarIcon } from '@/components/icons'
import type { LetterEntry } from '@/content/alphabet'
import type { TilePalette } from './letterPalette'

interface LetterTileProps {
  letter: LetterEntry
  palette: TilePalette
  learned?: boolean
  onSelect: (letter: LetterEntry) => void
}

export function LetterTile({ letter, palette, learned = false, onSelect }: LetterTileProps) {
  const showLower = letter.lower !== letter.upper

  return (
    <button
      type="button"
      onClick={() => onSelect(letter)}
      aria-label={`${letter.upper} — ${letter.word}`}
      style={{
        backgroundColor: palette.background,
        color: palette.ink,
        boxShadow: `0 5px 0 ${palette.shadow}`,
      }}
      className="relative flex aspect-[6/5] w-full items-center justify-center gap-1 rounded-3xl font-display font-extrabold transition-transform active:translate-y-1"
    >
      <span className="text-[clamp(2rem,6vw,3.25rem)] leading-none">{letter.upper}</span>
      {showLower && (
        <span className="text-[clamp(1.25rem,3.6vw,2rem)] leading-none">{letter.lower}</span>
      )}
      {learned && (
        <span className="absolute -top-2 -right-2 flex size-8 items-center justify-center rounded-full border-[3px] border-cream bg-coin text-white">
          <StarIcon size={16} />
        </span>
      )}
    </button>
  )
}

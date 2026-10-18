import clsx from 'clsx'
import { splitWordByLetter, type LetterEntry } from '@/content/alphabet'

interface HighlightedWordProps {
  letter: LetterEntry
  className?: string
}

/** Shows the example word with the letter coloured and underlined inside it. */
export function HighlightedWord({ letter, className }: HighlightedWordProps) {
  const { before, match, after } = splitWordByLetter(letter.word, letter)

  return (
    <span className={clsx('font-display font-extrabold', className)}>
      {before}
      <mark className="bg-transparent text-highlight underline decoration-[0.09em] underline-offset-[0.14em]">
        {match}
      </mark>
      {after}
    </span>
  )
}

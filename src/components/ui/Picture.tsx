import clsx from 'clsx'
import { PICTURE_FILES } from '@/content/pictures'

interface PictureProps {
  /** The emoji that names the picture, e.g. `🐝`. */
  emoji: string
  /** Accessible name; leave empty when the picture only repeats nearby text. */
  alt?: string
  className?: string
}

/**
 * A detailed illustration for a word, letter or sticker (Fluent Emoji, MIT).
 * Falls back to the plain emoji if a picture file is missing.
 */
export function Picture({ emoji, alt = '', className }: PictureProps) {
  const file = PICTURE_FILES[emoji]
  if (!file) {
    return (
      <span
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className={className}
      >
        {emoji}
      </span>
    )
  }
  return (
    <img
      src={`/pictures/${file}.svg`}
      alt={alt}
      draggable={false}
      loading="lazy"
      decoding="async"
      className={clsx('pointer-events-none select-none object-contain', className)}
    />
  )
}

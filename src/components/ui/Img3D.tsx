import clsx from 'clsx'
import { useState, type CSSProperties } from 'react'

/**
 * A 3D-rendered illustration (public/3d/<name>.webp: Fluent Emoji 3D, MIT;
 * planets: Kiddo's own 3D models rendered by scripts/render-planets.mjs).
 * This is a picture of a 3D object, not an interactive model – scenes that
 * need turning use real three.js models instead.
 *
 * A picture that cannot load (offline before it was ever seen, a failed request)
 * shows a soft star instead, never an empty coloured square (MVP stage 1).
 */
export function Img3D({
  name,
  alt = '',
  className,
  style,
  eager = false,
}: {
  name: string
  alt?: string
  className?: string
  style?: CSSProperties
  eager?: boolean
}) {
  const [failedName, setFailedName] = useState<string | null>(null)
  if (failedName === name) {
    return (
      <svg
        viewBox="0 0 24 24"
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        data-fallback="img3d"
        className={clsx('pointer-events-none text-ink-soft/50', className)}
        style={style}
      >
        <path
          fill="currentColor"
          d="M12 2.5c.5 0 .9.3 1.1.8l2 4.6 5 .5c1 .1 1.4 1.3.6 2l-3.8 3.3 1.1 4.9c.2 1-.8 1.7-1.7 1.2L12 17.2l-4.3 2.6c-.9.5-1.9-.2-1.7-1.2l1.1-4.9-3.8-3.3c-.8-.7-.4-1.9.6-2l5-.5 2-4.6c.2-.5.6-.8 1.1-.8Z"
        />
      </svg>
    )
  }
  return (
    <img
      src={`/3d/${name}.webp`}
      alt={alt}
      draggable={false}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailedName(name)}
      className={clsx('pointer-events-none object-contain select-none', className)}
      style={style}
    />
  )
}

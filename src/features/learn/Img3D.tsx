import clsx from 'clsx'
import type { CSSProperties } from 'react'

/**
 * A 3D-rendered illustration (public/3d/<name>.webp: Fluent Emoji 3D, MIT;
 * planets: Kiddo's own 3D models rendered by scripts/render-planets.mjs).
 * This is a picture of a 3D object, not an interactive model – scenes that
 * need turning use real three.js models instead.
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
  return (
    <img
      src={`/3d/${name}.webp`}
      alt={alt}
      draggable={false}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={clsx('pointer-events-none object-contain select-none', className)}
      style={style}
    />
  )
}

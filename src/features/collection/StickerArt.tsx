import { useId } from 'react'
import { STICKER_DRAWINGS } from './stickerDrawings'

/*
 * Drawings of the Kiddo Universe stickers (Phase 30): flat shapes with a thick
 * white die-cut edge, so each one reads as a sticker on any card. A locked
 * sticker is drawn as its own silhouette (the same shapes in one soft ink),
 * so the child sees what they are working towards.
 */

/** One Universe sticker; `locked` draws its silhouette. Decorative: label it outside. */
export function StickerArt({
  id,
  locked = false,
  className,
}: {
  id: string
  locked?: boolean
  className?: string
}) {
  const edge = `sticker-edge-${useId().replace(/:/g, '')}`
  const art = STICKER_DRAWINGS[id]
  if (!art) return null
  return (
    <svg viewBox="-8 -8 116 116" className={className} aria-hidden="true" focusable="false">
      <defs>
        {/* the die-cut edge: the drawing's outline grown and filled white */}
        <filter id={edge} filterUnits="userSpaceOnUse" x="-8" y="-8" width="116" height="116">
          <feMorphology in="SourceAlpha" operator="dilate" radius="5" result="grown" />
          <feFlood floodColor="#fff" />
          <feComposite in2="grown" operator="in" result="cut" />
          <feMerge>
            <feMergeNode in="cut" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g
        filter={locked ? undefined : `url(#${edge})`}
        style={locked ? { filter: 'grayscale(1)', opacity: 0.42 } : undefined}
      >
        {art}
      </g>
    </svg>
  )
}

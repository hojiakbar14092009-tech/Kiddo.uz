import clsx from 'clsx'
import type { ReactNode } from 'react'
import { Img3D } from '@/components/ui/Img3D'
import {
  FOODS,
  OTHERS,
  isFood,
  stillName,
  type FoodId,
  type MotifId,
  type Picture,
  type TableItemId,
} from './content'

/*
 * Flat pictures of "My Uzbekistan": suzani / atlas motifs, the dishes of the
 * dasturxon and a helper that draws any content picture. Decorative only
 * (`aria-hidden`); the controls around them carry the names.
 */

const INK = '#3a2e4d'

/** One motif of a suzani / atlas border. Shape and colour both differ, so colour is never the only clue. */
export function MotifArt({ id, className }: { id: MotifId; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      data-motif={id}
      className={clsx('block', className)}
    >
      {MOTIFS[id]}
    </svg>
  )
}

const MOTIFS: Record<MotifId, ReactNode> = {
  rosette: (
    <g>
      {Array.from({ length: 8 }, (_, index) => {
        const angle = (index / 8) * Math.PI * 2
        return (
          <circle
            key={index}
            cx={32 + Math.cos(angle) * 15}
            cy={32 + Math.sin(angle) * 15}
            r="9"
            fill="#d1453b"
          />
        )
      })}
      <circle cx="32" cy="32" r="12" fill="#f2b84b" />
      <circle cx="32" cy="32" r="5" fill="#d1453b" />
    </g>
  ),
  leaf: (
    <g>
      <path d="M32 6 C50 18 52 40 32 58 C12 40 14 18 32 6 Z" fill="#3f9a4d" />
      <path
        d="M32 14 V52 M32 28 L22 22 M32 28 L42 22 M32 40 L23 34 M32 40 L41 34"
        stroke="#d9f0c8"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </g>
  ),
  pomegranate: (
    <g>
      <path d="M24 14 L27 6 L32 11 L37 6 L40 14 Z" fill="#a8263c" />
      <circle cx="32" cy="36" r="22" fill="#c2304a" />
      <circle cx="26" cy="34" r="3.5" fill="#ffd2dc" />
      <circle cx="36" cy="31" r="3.5" fill="#ffd2dc" />
      <circle cx="33" cy="42" r="3.5" fill="#ffd2dc" />
      <circle cx="41" cy="40" r="3" fill="#ffd2dc" />
    </g>
  ),
  pepper: (
    <g>
      <path
        d="M36 8 C30 14 22 26 22 40 C22 52 30 58 36 56 C42 54 44 44 42 32 C40 22 38 16 36 8 Z"
        fill="#2b2730"
      />
      <path
        d="M36 8 C38 4 44 4 46 8"
        stroke="#2b2730"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M31 24 C28 32 28 42 31 48"
        stroke="#f6efdf"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </g>
  ),
  ikat: (
    <g>
      <path d="M32 4 L58 32 L32 60 L6 32 Z" fill="#7a3fa0" />
      <path d="M32 14 L48 32 L32 50 L16 32 Z" fill="#f2b84b" />
      <path d="M32 24 L40 32 L32 40 L24 32 Z" fill="#7a3fa0" />
    </g>
  ),
  star: (
    <g>
      <rect x="13" y="13" width="38" height="38" rx="3" fill="#2f64b0" />
      <rect
        x="13"
        y="13"
        width="38"
        height="38"
        rx="3"
        fill="#2f64b0"
        transform="rotate(45 32 32)"
      />
      <circle cx="32" cy="32" r="9" fill="#ddeefc" />
    </g>
  ),
}

/** A dish of the dasturxon (svg), or a 3D picture for fruit and things that do not belong. */
export function TableItemArt({ id, className }: { id: TableItemId; className?: string }) {
  if (isFood(id)) {
    const img = FOODS[id].img
    if (img) return <Img3D name={img} eager className={className} />
    return <FoodArt id={id} className={className} />
  }
  return <Img3D name={OTHERS[id].img} eager className={className} />
}

export function FoodArt({ id, className }: { id: FoodId; className?: string }) {
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true" data-food={id} className={clsx('block', className)}>
      {FOOD_ART[id] ?? null}
    </svg>
  )
}

const FOOD_ART: Partial<Record<FoodId, ReactNode>> = {
  non: (
    <g>
      <ellipse cx="40" cy="44" rx="34" ry="28" fill="#b86f2a" />
      <ellipse cx="40" cy="40" rx="34" ry="28" fill="#d38b3a" />
      <ellipse cx="40" cy="40" rx="20" ry="16" fill="#f0c27a" />
      {[
        [40, 40],
        [32, 36],
        [48, 36],
        [32, 45],
        [48, 45],
        [40, 31],
        [40, 49],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" fill="#8a5a2b" />
      ))}
    </g>
  ),
  palov: (
    <g>
      <ellipse cx="40" cy="52" rx="36" ry="18" fill="#2f64b0" />
      <ellipse cx="40" cy="50" rx="36" ry="18" fill="#ddeefc" />
      <path d="M12 50 C14 30 66 30 68 50 Z" fill="#f6e2b0" />
      <path
        d="M18 44 L28 40 M30 46 L40 41 M44 44 L54 40 M50 48 L60 44 M24 49 L32 46"
        stroke="#f08a2c"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="36" cy="36" r="4" fill="#8a5a2b" />
      <circle cx="48" cy="38" r="3.5" fill="#8a5a2b" />
    </g>
  ),
  somsa: (
    <g>
      <path d="M40 10 L72 64 Q74 68 70 68 L10 68 Q6 68 8 64 Z" fill="#c9792e" />
      <path d="M40 14 L68 62 L12 62 Z" fill="#e8a64e" />
      {[
        [34, 40],
        [44, 36],
        [40, 50],
        [30, 54],
        [52, 52],
      ].map(([x, y]) => (
        <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="2" ry="1.2" fill="#fff4dc" />
      ))}
    </g>
  ),
  choy: (
    <g>
      <path
        d="M30 18 C26 12 34 10 30 4 M42 18 C38 12 46 10 42 4"
        stroke="#9fb3c8"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M8 30 H72 C72 52 58 66 40 66 C22 66 8 52 8 30 Z"
        fill="#ffffff"
        stroke={INK}
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <ellipse cx="40" cy="30" rx="32" ry="7" fill="#b5651d" />
      <path d="M14 42 H66" stroke="#2f64b0" strokeWidth="5" />
      {[22, 34, 46, 58].map((x) => (
        <circle key={x} cx={x} cy="52" r="3" fill="#2f64b0" />
      ))}
    </g>
  ),
  anor: (
    <g>
      <path d="M31 14 L34 5 L40 11 L46 5 L49 14 Z" fill="#a8263c" />
      <circle cx="40" cy="44" r="30" fill="#c2304a" />
      <circle cx="30" cy="36" r="7" fill="#e05a72" opacity="0.6" />
    </g>
  ),
  qovun: (
    <g>
      <ellipse cx="40" cy="42" rx="34" ry="24" fill="#f2c94c" />
      <path
        d="M12 34 Q40 20 68 34 M8 44 Q40 30 72 44 M12 54 Q40 40 68 54"
        stroke="#d9a425"
        strokeWidth="2.5"
        fill="none"
      />
      <path
        d="M22 26 Q30 44 22 62 M40 18 Q46 42 40 66 M58 26 Q50 44 58 62"
        stroke="#d9a425"
        strokeWidth="2.5"
        fill="none"
      />
      <path
        d="M72 40 Q78 36 76 30"
        stroke="#6b8e23"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
    </g>
  ),
}

/** Any content picture: a 3D picture, a landmark still, or a motif. */
export function PictureView({ picture, className }: { picture: Picture; className?: string }) {
  if (picture.kind === 'img') return <Img3D name={picture.name} eager className={className} />
  if (picture.kind === 'still')
    return <Img3D name={stillName(picture.id)} eager className={className} />
  return <MotifArt id={picture.id} className={className} />
}

/** A strip of the dasturxon cloth: a red band with small white motifs. */
export function ClothBorder({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 12" preserveAspectRatio="none" aria-hidden="true" className={className}>
      <rect width="120" height="12" fill="#c8443a" />
      {Array.from({ length: 12 }, (_, index) => (
        <path
          key={index}
          d={`M${index * 10 + 5} 2 L${index * 10 + 9} 6 L${index * 10 + 5} 10 L${index * 10 + 1} 6 Z`}
          fill="#f6efdf"
        />
      ))}
    </svg>
  )
}

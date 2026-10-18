import { OUTFIT_COLORS as C, type OutfitId } from '@/features/shop/outfits'

/*
 * Robot clothes for the 2D robot, drawn in the robot's 200×240 viewBox.
 * Each part is drawn inside the body part it belongs to, so it moves with it.
 */

/** On top of the head (inside the head group, after the shell). */
export function HeadOutfit({ id }: { id: OutfitId | undefined }) {
  if (id === 'cap') {
    return (
      <g>
        <path d="M44 58 Q44 14 100 12 Q156 14 156 58 Z" fill={C.cap.main} />
        <path
          d="M58 30 Q100 8 142 30"
          stroke="#FFFFFF"
          strokeOpacity="0.3"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="100" cy="58" rx="64" ry="9" fill={C.cap.dark} />
        <circle cx="100" cy="12" r="6" fill={C.cap.dark} />
      </g>
    )
  }
  if (id === 'crown') {
    return (
      <g>
        <path
          d="M64 44 L70 6 L86 26 L100 0 L114 26 L130 6 L136 44 Z"
          fill={C.crown.main}
          stroke={C.crown.dark}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <circle cx="100" cy="32" r="5" fill={C.crown.gem} />
        <circle cx="80" cy="35" r="3.5" fill="#FFFFFF" />
        <circle cx="120" cy="35" r="3.5" fill="#FFFFFF" />
      </g>
    )
  }
  if (id === 'flower') {
    const petals = [0, 72, 144, 216, 288]
    return (
      <g transform="translate(62 32)">
        {petals.map((angle) => (
          <ellipse
            key={angle}
            cx="0"
            cy="-10"
            rx="7"
            ry="10"
            fill={C.flower.petal}
            transform={`rotate(${angle})`}
          />
        ))}
        <circle r="6.5" fill={C.flower.centre} />
      </g>
    )
  }
  return null
}

/** Over the eyes (inside the head group, after the face). */
export function FaceOutfit({ id }: { id: OutfitId | undefined }) {
  if (id !== 'glasses') return null
  return (
    <g fill="#FFFFFF" fillOpacity="0.14" stroke={C.glasses.frame} strokeWidth="4.5">
      <circle cx="79" cy="88" r="17" />
      <circle cx="121" cy="88" r="17" />
      <path d="M96 86 Q100 81 104 86" fill="none" />
      <path d="M62 84 L52 80 M138 84 L148 80" fill="none" strokeLinecap="round" />
    </g>
  )
}

/** Around the neck (drawn after the head so it wraps over the chin). */
export function NeckOutfit({ id }: { id: OutfitId | undefined }) {
  if (id === 'scarf') {
    return (
      <g>
        <rect
          x="114"
          y="146"
          width="15"
          height="34"
          rx="6"
          fill={C.scarf.dark}
          transform="rotate(-12 121 146)"
        />
        <rect x="66" y="138" width="68" height="17" rx="8.5" fill={C.scarf.main} />
        <path
          d="M76 142 L76 151 M90 142 L90 151 M104 142 L104 151 M118 142 L118 151"
          stroke={C.scarf.dark}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
    )
  }
  if (id === 'bowtie') {
    return (
      <g>
        <path d="M100 150 L80 139 L80 161 Z" fill={C.bowtie.main} strokeLinejoin="round" />
        <path d="M100 150 L120 139 L120 161 Z" fill={C.bowtie.main} strokeLinejoin="round" />
        <rect x="93" y="144" width="14" height="12" rx="4" fill={C.bowtie.dark} />
      </g>
    )
  }
  return null
}

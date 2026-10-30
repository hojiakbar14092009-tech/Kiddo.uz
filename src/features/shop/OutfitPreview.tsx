import { FaceOutfit, HeadOutfit, NeckOutfit } from '@/features/mascot/RobotOutfits'
import type { Outfit, OutfitSlot, OutfitTone } from './outfits'

/** Each slot framed close, so a small pendant reads as well as a hat. */
const FRAME: Record<OutfitSlot, string> = {
  head: '14 -16 172 150',
  ear: '4 -12 192 160',
  face: '30 36 140 104',
  neck: '46 112 108 86',
}

/**
 * The item itself on a plain robot bust (Phase 31): the shop shows exactly
 * what the robot will wear, in the colours of the learner's stage.
 * Decorative: the card names the item.
 */
export function OutfitPreview({
  outfit,
  tone,
  className,
}: {
  outfit: Outfit
  tone: OutfitTone
  className?: string
}) {
  return (
    <svg
      viewBox={FRAME[outfit.slot]}
      className={className}
      aria-hidden="true"
      focusable="false"
      data-outfit-preview={outfit.id}
      data-tone={tone}
    >
      {/* the bust: shoulders, neck, ears, head and visor, in soft neutral tones */}
      <rect x="54" y="146" width="92" height="44" rx="22" fill="#E7E3EF" />
      <rect x="88" y="136" width="24" height="14" rx="6" fill="#D9D3E4" />
      <ellipse cx="32" cy="88" rx="14" ry="26" fill="#D9D3E4" />
      <ellipse cx="168" cy="88" rx="14" ry="26" fill="#D9D3E4" />
      <rect x="34" y="26" width="132" height="118" rx="56" fill="#F4F2F8" stroke="#D9D3E4" />
      {outfit.slot !== 'neck' && (
        <>
          <rect x="50" y="48" width="100" height="80" rx="34" fill="#4C4566" />
          <circle cx="79" cy="88" r="7" fill="#9FE9F5" />
          <circle cx="121" cy="88" r="7" fill="#9FE9F5" />
        </>
      )}
      {outfit.slot === 'head' || outfit.slot === 'ear' ? (
        <HeadOutfit id={outfit.id} tone={tone} />
      ) : outfit.slot === 'face' ? (
        <FaceOutfit id={outfit.id} tone={tone} />
      ) : (
        <NeckOutfit id={outfit.id} tone={tone} />
      )}
    </svg>
  )
}

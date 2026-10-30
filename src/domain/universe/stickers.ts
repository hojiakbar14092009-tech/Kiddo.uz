import { tierRank } from './achievements'
import type { Tier } from './types'

/*
 * Kiddo Universe stickers (Phase 30). Each one belongs to a learning
 * milestone: a medal tier. A sticker is never bought, drawn at random or
 * granted twice; it is simply there once the child's recorded medal reaches
 * its tier, so unlocking is idempotent by construction (no state of its own,
 * no ledger entry) and per child like the medals it reads.
 *
 * The task stickers of the parent's tasks (features/stickers) are a separate,
 * older album and stay as they are.
 */

export interface UniverseStickerDef {
  id: string
  /** The medal whose tier unlocks it. */
  achievement: string
  tier: Tier
}

export const UNIVERSE_STICKERS: readonly UniverseStickerDef[] = [
  { id: 'discovery-map', achievement: 'first-steps', tier: 'silver' },
  { id: 'living-alphabet', achievement: 'letter-friend', tier: 'silver' },
  { id: 'galaxy-book', achievement: 'bookworm', tier: 'silver' },
  { id: 'scale-portal', achievement: 'counter', tier: 'silver' },
  { id: 'thought-lantern', achievement: 'thinker', tier: 'silver' },
  { id: 'magic-pencil', achievement: 'artist', tier: 'silver' },
  { id: 'cosmic-garden', achievement: 'scientist', tier: 'silver' },
  { id: 'crystal-rocket', achievement: 'explorer', tier: 'silver' },
  { id: 'science-crystal', achievement: 'crystal-keeper', tier: 'silver' },
  { id: 'observatory', achievement: 'star-collector', tier: 'gold' },
  { id: 'time-capsule', achievement: 'regular', tier: 'gold' },
  { id: 'star-compass', achievement: 'many-paths', tier: 'silver' },
]

export const stickerTitleKey = (id: string) => `universe.stickers.${id}.title`

/** Is this sticker unlocked by the recorded medal tiers? */
export function stickerUnlocked(
  sticker: UniverseStickerDef,
  achievements: Readonly<Record<string, Tier>>,
): boolean {
  return tierRank(achievements[sticker.achievement]) >= tierRank(sticker.tier)
}

/** Stickers a newly reached medal tier unlocks (for the result screen). */
export function stickersForTier(achievement: string, tier: Tier): UniverseStickerDef[] {
  return UNIVERSE_STICKERS.filter(
    (sticker) => sticker.achievement === achievement && sticker.tier === tier,
  )
}

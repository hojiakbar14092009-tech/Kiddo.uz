import type { WalletId } from '@/domain/universe'

/**
 * What the city and the collection show: stars (a measure) and yong‘oq, the
 * one currency (Phase 39). Crystals, parts and scrolls were changed into nuts.
 */
export const SHOWN_RESOURCES = ['star', 'nut'] as const
export type ShownResource = (typeof SHOWN_RESOURCES)[number]

/** Soft background of each resource's chip. */
export const RESOURCE_TINT: Record<WalletId, string> = {
  nut: 'bg-coin-soft',
  star: 'bg-coin-soft',
  crystal: 'bg-lilac-soft',
  part: 'bg-sky-soft',
  scroll: 'bg-oops-soft',
  seed: 'bg-primary-soft',
  key: 'bg-coin-soft',
}

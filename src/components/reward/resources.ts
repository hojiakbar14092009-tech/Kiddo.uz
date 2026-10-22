import type { ResourceId } from '@/domain/universe'

/** The resources the city and the collection show (seeds and keys come later). */
export const SHOWN_RESOURCES = ['star', 'crystal', 'part', 'scroll'] as const
export type ShownResource = (typeof SHOWN_RESOURCES)[number]

/** Soft background of each resource's chip. */
export const RESOURCE_TINT: Record<ResourceId, string> = {
  star: 'bg-coin-soft',
  crystal: 'bg-lilac-soft',
  part: 'bg-sky-soft',
  scroll: 'bg-oops-soft',
  seed: 'bg-primary-soft',
  key: 'bg-coin-soft',
}

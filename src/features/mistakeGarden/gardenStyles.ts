import type { PlantStage } from '@/domain/garden'

/** The stage chip's colours (positive at every stage). */
export const STAGE_CHIP: Record<PlantStage, string> = {
  seed: 'bg-coin-soft text-ink',
  sprout: 'bg-primary-soft text-primary-ink',
  plant: 'bg-primary-soft text-primary-ink',
  bloom: 'bg-girl-soft text-girl-ink',
}

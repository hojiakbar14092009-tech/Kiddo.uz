import { ACHIEVEMENTS, type MedalCollection, type Tier } from '@/domain/universe'

/** The tier's own name in its collection: Bronze/Silver/Gold or Spark/Star/Constellation. */
export function tierLabelKey(collection: MedalCollection, tier: Tier): string {
  return collection === 'stars' ? `collection.starTiers.${tier}` : `collection.tiers.${tier}`
}

/** The tier name of a medal by its id (classic when the id is unknown). */
export function medalTierLabelKey(id: string, tier: Tier): string {
  const collection = ACHIEVEMENTS.find((achievement) => achievement.id === id)?.collection
  return tierLabelKey(collection ?? 'classic', tier)
}

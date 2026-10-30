import { useMemo } from 'react'
import { useChildKey } from '@/store/progressStore'
import {
  ACHIEVEMENTS,
  metricValue,
  nextTarget,
  tierRank,
  type MedalCollection,
} from './achievements'
import { stickerUnlocked, UNIVERSE_STICKERS, type UniverseStickerDef } from './stickers'
import { EMPTY_BALANCES, EMPTY_UNIVERSE_CHILD, useUniverseStore } from './store'
import type { ResourceId, Tier } from './types'

/** Resource balances of the active child. */
export function useResources(): Record<ResourceId, number> {
  const childKey = useChildKey()
  return useUniverseStore((s) => s.byChild[childKey]?.balances ?? EMPTY_BALANCES)
}

export interface AchievementView {
  id: string
  titleKey: string
  descKey: string
  icon3d: string
  collection: MedalCollection
  /** Highest tier recorded (null: none yet). */
  tier: Tier | null
  current: number
  /** The next tier's target, or null after gold. */
  next: number | null
}

/** Every achievement of the active child with its tier and progress. */
export function useAchievements(): AchievementView[] {
  const childKey = useChildKey()
  const child = useUniverseStore((s) => s.byChild[childKey] ?? EMPTY_UNIVERSE_CHILD)
  return useMemo(
    () =>
      ACHIEVEMENTS.map((achievement) => {
        const tier = child.achievements[achievement.id] ?? null
        return {
          id: achievement.id,
          titleKey: achievement.titleKey,
          descKey: achievement.descKey,
          icon3d: achievement.icon3d,
          collection: achievement.collection,
          tier: tierRank(tier) > 0 ? tier : null,
          current: metricValue(child, achievement.metric),
          next: nextTarget(achievement, tier),
        }
      }),
    [child],
  )
}

/** The Kiddo Universe stickers of the active child, each unlocked or not (derived from medals). */
export function useUniverseStickers(): { sticker: UniverseStickerDef; unlocked: boolean }[] {
  const childKey = useChildKey()
  const achievements = useUniverseStore(
    (s) => s.byChild[childKey]?.achievements ?? EMPTY_UNIVERSE_CHILD.achievements,
  )
  return useMemo(
    () =>
      UNIVERSE_STICKERS.map((sticker) => ({
        sticker,
        unlocked: stickerUnlocked(sticker, achievements),
      })),
    [achievements],
  )
}

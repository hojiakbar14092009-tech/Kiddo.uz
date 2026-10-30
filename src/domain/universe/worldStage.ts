import type { AdventureWorld } from './adventure'

/*
 * World Card Evolution (Phase 28): a world's card on the Adventure Map grows
 * with what the child has done there — a new card, an explorer's, an
 * expert's, a master's. Derived only from the best stars of the world's own
 * activities (deterministic; stars are never spent, so for the same world a
 * stage never drops — a world given a new activity in a later release can show
 * a lower stage until that one is played too; the "new stage" news never repeats).
 */

export const WORLD_STAGES = ['new', 'explorer', 'expert', 'master'] as const
export type WorldStage = (typeof WORLD_STAGES)[number]

/** Best stars a world's activities give at most. */
export const STARS_PER_ACTIVITY = 3

export interface WorldStars {
  have: number
  max: number
}

/** The child's best stars in this world's activities, of the most there are. */
export function worldStars(world: Pick<AdventureWorld, 'activities'>): WorldStars {
  const have = world.activities.reduce(
    (sum, item) => sum + Math.min(STARS_PER_ACTIVITY, Math.max(0, item.bestStars)),
    0,
  )
  return { have, max: world.activities.length * STARS_PER_ACTIVITY }
}

/**
 * The card's stage: new (nothing yet), explorer (a first star), expert (half
 * of the world's stars), master (every activity with three stars). A world
 * still coming soon is always new.
 */
export function worldStage(world: Pick<AdventureWorld, 'activities' | 'comingSoon'>): WorldStage {
  if (world.comingSoon) return 'new'
  const { have, max } = worldStars(world)
  if (max === 0 || have === 0) return 'new'
  if (have >= max) return 'master'
  if (have * 2 >= max) return 'expert'
  return 'explorer'
}

/** Stars still to collect in this world for its next stage, or null at master. */
export function starsToNextStage(world: Pick<AdventureWorld, 'activities' | 'comingSoon'>) {
  const stage = worldStage(world)
  const { have, max } = worldStars(world)
  if (stage === 'master' || world.comingSoon || max === 0) return null
  if (stage === 'new') return 1
  if (stage === 'explorer') return Math.ceil(max / 2) - have
  return max - have
}

export function stageIndex(stage: WorldStage): number {
  return WORLD_STAGES.indexOf(stage)
}

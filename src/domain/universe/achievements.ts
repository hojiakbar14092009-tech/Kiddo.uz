import { climbedOf, type LearnerStrands, type StrandState } from '@/domain/learner/profile'
import { STRANDS, TIERS, type ResourceId, type Strand, type Tier } from './types'

/*
 * Medals, data-driven. Each achievement watches one metric of the child's
 * universe stats and has three tiers. A tier is recorded once (the store
 * keeps the highest tier reached) and pays coins once through `grantReward`
 * (reason 'achievement', refId `${id}|${tier}`). Pure: no store imports.
 *
 * Two collections (Phase 30): the classic medals count what the child did;
 * the Star Paths count how far the child's learning reached (the strand's
 * level and mastery steps, measured by the LearnerProfile), so they cannot
 * be farmed by repeating easy content.
 */

export type MedalCollection = 'classic' | 'stars'

export type AchievementMetric =
  | 'activities'
  | 'stars'
  | 'crystals'
  | 'tales'
  | 'days'
  | `strand:${Strand}`
  | `path:${Strand}`
  | 'paths'

export interface AchievementDef {
  id: string
  titleKey: string
  descKey: string
  /** public/3d/<icon3d>.webp */
  icon3d: string
  metric: AchievementMetric
  tiers: Record<Tier, number>
  collection: MedalCollection
}

/** Coins paid when a tier is reached. */
export const ACHIEVEMENT_COINS: Record<Tier, number> = { bronze: 5, silver: 10, gold: 20 }

function def(
  id: string,
  icon3d: string,
  metric: AchievementMetric,
  bronze: number,
  silver: number,
  gold: number,
  collection: MedalCollection = 'classic',
): AchievementDef {
  return {
    id,
    titleKey: `universe.achievements.${id}.title`,
    descKey: `universe.achievements.${id}.desc`,
    icon3d,
    metric,
    tiers: { bronze, silver, gold },
    collection,
  }
}

/*
 * Star Paths: a path's value is how high the learner's own runs promoted the
 * strand (`StrandState.climbed`: level, plus mastery steps above level 5).
 * The age prior and a placement never count, only climbing above them: spark
 * at level 4 (above the easy practice content, so only assessment reaches
 * it), star at level 5, constellation at two mastery steps.
 */
const PATH = { bronze: 4, silver: 5, gold: 7 } as const
/** Strands climbed at least this far (a spark) count for "many paths". */
export const PATH_SPARK = PATH.bronze

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  def('first-steps', 'trophy', 'activities', 3, 25, 100),
  def('star-collector', 'glowing-star', 'stars', 10, 40, 100),
  def('crystal-keeper', 'gift', 'crystals', 3, 10, 25),
  def('bookworm', 'book', 'tales', 1, 5, 15),
  def('regular', 'sun', 'days', 3, 10, 30),
  def('letter-friend', 'pencil', 'strand:letters', 5, 20, 50),
  def('reader', 'notebook', 'strand:reading', 5, 20, 50),
  def('counter', 'clock', 'strand:number', 5, 20, 50),
  def('thinker', 'lamp', 'strand:logic', 5, 20, 50),
  def('explorer', 'rocket', 'strand:space', 3, 10, 30),
  def('scientist', 'seedling', 'strand:science', 3, 10, 30),
  def('artist', 'paintbrush', 'strand:art', 3, 10, 30),
  def('number-path', 'ringed-planet', 'path:number', PATH.bronze, PATH.silver, PATH.gold, 'stars'),
  def('word-path', 'parrot', 'path:language', PATH.bronze, PATH.silver, PATH.gold, 'stars'),
  def('letter-path', 'feather', 'path:letters', PATH.bronze, PATH.silver, PATH.gold, 'stars'),
  def('story-path', 'owl', 'path:reading', PATH.bronze, PATH.silver, PATH.gold, 'stars'),
  def('nature-path', 'telescope', 'path:science', PATH.bronze, PATH.silver, PATH.gold, 'stars'),
  def('heart-path', 'sun-face', 'path:social', PATH.bronze, PATH.silver, PATH.gold, 'stars'),
  def('many-paths', 'shooting-star', 'paths', 2, 4, 6, 'stars'),
]

/** What the medals read: the run counts and the LearnerProfile strands. */
export interface MedalSource {
  stats: UniverseStats
  strands?: LearnerStrands
}

/** What the metrics read; the store keeps this per child. */
export interface UniverseStats {
  /** Finished activity runs (each id once). */
  activities: number
  byStrand: Partial<Record<Strand, number>>
  /** Resources earned in total (spending does not lower these). */
  earned: Partial<Record<ResourceId, number>>
  /** Distinct local days with a finished activity. */
  daysActive: number
  lastDay: string | null
  /** The last day an art-strand run counted (art counts once a day). */
  artDay?: string | null
}

export const EMPTY_STATS: UniverseStats = Object.freeze({
  activities: 0,
  byStrand: Object.freeze({}),
  earned: Object.freeze({}),
  daysActive: 0,
  lastDay: null,
}) as UniverseStats

/** Art (studio pictures, traced shapes) counts towards medals at most once a day. */
export const ART_RUNS_PER_DAY = 1

/**
 * Pure: the stats after one counted run on `day`. Art-strand runs never count
 * as `activities` (so saving pictures cannot farm "first steps" and the like)
 * and count for the art strand once a day; every run marks the day active.
 */
export function countRun(stats: UniverseStats, strand: Strand, day: string): UniverseStats {
  const newDay = stats.lastDay !== day
  const art = strand === 'art'
  const strandCounts = !art || stats.artDay !== day
  return {
    ...stats,
    activities: stats.activities + (art ? 0 : 1),
    byStrand: strandCounts
      ? { ...stats.byStrand, [strand]: (stats.byStrand[strand] ?? 0) + 1 }
      : stats.byStrand,
    daysActive: stats.daysActive + (newDay ? 1 : 0),
    lastDay: newDay ? day : stats.lastDay,
    ...(art ? { artDay: day } : {}),
  }
}

/** How high one strand was climbed by the learner's own runs (0: not yet). */
export function pathValue(state: StrandState | undefined): number {
  return climbedOf(state)
}

export function metricValue(source: MedalSource, metric: AchievementMetric): number {
  const { stats } = source
  if (metric === 'paths')
    return STRANDS.filter((strand) => pathValue(source.strands?.[strand]) >= PATH_SPARK).length
  if (metric.startsWith('path:'))
    return pathValue(source.strands?.[metric.slice('path:'.length) as Strand])
  switch (metric) {
    case 'activities':
      return stats.activities
    case 'stars':
      return stats.earned.star ?? 0
    case 'crystals':
      return stats.earned.crystal ?? 0
    case 'tales':
      return stats.earned.scroll ?? 0
    case 'days':
      return stats.daysActive
    default:
      return stats.byStrand[metric.slice('strand:'.length) as Strand] ?? 0
  }
}

/** The highest tier this value reaches (null: none yet). */
export function tierFor(achievement: AchievementDef, value: number): Tier | null {
  let reached: Tier | null = null
  for (const tier of TIERS) if (value >= achievement.tiers[tier]) reached = tier
  return reached
}

export function tierRank(tier: Tier | null | undefined): number {
  return tier ? TIERS.indexOf(tier) + 1 : 0
}

/** The next tier's target, or null when gold is reached. */
export function nextTarget(achievement: AchievementDef, tier: Tier | null): number | null {
  const next = TIERS[tierRank(tier)]
  return next ? achievement.tiers[next] : null
}

/**
 * Tiers reached now that are not recorded yet (several when a value jumps),
 * as [id, tier] pairs in order.
 */
export function newTiers(
  source: MedalSource,
  recorded: Readonly<Record<string, Tier>>,
): [string, Tier][] {
  const fresh: [string, Tier][] = []
  for (const achievement of ACHIEVEMENTS) {
    const reached = tierRank(tierFor(achievement, metricValue(source, achievement.metric)))
    for (let rank = tierRank(recorded[achievement.id]); rank < reached; rank++) {
      fresh.push([achievement.id, TIERS[rank]!])
    }
  }
  return fresh
}

export const achievementKey = (id: string, tier: Tier) => `${id}|${tier}`

export function parseAchievementKey(key: string): { id: string; tier: Tier } | null {
  const [id, tier] = key.split('|')
  return id && tier && (TIERS as readonly string[]).includes(tier)
    ? { id, tier: tier as Tier }
    : null
}

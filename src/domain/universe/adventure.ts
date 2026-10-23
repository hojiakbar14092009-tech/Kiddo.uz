import { useMemo } from 'react'
import { useChildKey } from '@/store/progressStore'
import { activityBase } from './rules'
import { EMPTY_UNIVERSE_CHILD, useUniverseStore } from './store'

/*
 * The Adventure Map: worlds in order, each opening at a number of stars
 * earned. Opening a world only changes the map (decorations, the next world
 * to visit); the learning routes themselves are never blocked.
 *
 * An adventure activity matches finished activities by their base id (the
 * part before ':'), e.g. `words` matches `words:4` and `words:6-cvc`.
 */

export interface AdventureActivityDef {
  activity: string
  route: string
  labelKey: string
  /** Activity bases whose best stars this entry shows (default: [activity]). */
  matches?: readonly string[]
  /** Also activity ids starting with one of these, e.g. `uzbekistan:map:` (all its tiers). */
  prefixes?: readonly string[]
}

export interface WorldDef {
  id: string
  nameKey: string
  /** public/3d/<icon3d>.webp */
  icon3d: string
  starsNeeded: number
  /** A world that is drawn on the map but whose routes do not exist yet. */
  comingSoon?: boolean
  activities: readonly AdventureActivityDef[]
}

const label = (activity: string) => `universe.activities.${activity}`

function act(activity: string, route: string, matches?: readonly string[]): AdventureActivityDef {
  return { activity, route, labelKey: label(activity), ...(matches ? { matches } : {}) }
}

/** A game of the "My Uzbekistan" world: its best over every tier (`uzbekistan:<kind>:<tier>`). */
function uzGame(kind: 'map' | 'table' | 'patterns'): AdventureActivityDef {
  return {
    activity: `uzbekistan-${kind}`,
    route: `/worlds/uzbekistan/${kind}`,
    labelKey: `uzbekistan.games.${kind}.title`,
    matches: [],
    prefixes: [`uzbekistan:${kind}:`],
  }
}

export const WORLDS: readonly WorldDef[] = [
  {
    id: 'forest',
    nameKey: 'universe.worlds.forest',
    icon3d: 'tree',
    starsNeeded: 0,
    activities: [
      act('alphabet', '/alphabet', ['find-letter', 'find-picture', 'exam']),
      act('words', '/learn/words'),
      act('garden', '/learn/garden'),
      // the Story Engine: best stars over every story (`story:<id>`)
      act('stories', '/stories', ['story']),
      // the Friendship House: its label is the section's own title
      { activity: 'feelings', route: '/feelings', labelKey: 'feelings.title' },
    ],
  },
  {
    id: 'ocean',
    nameKey: 'universe.worlds.ocean',
    icon3d: 'whale',
    starsNeeded: 6,
    activities: [
      act('math', '/learn/math'),
      act('math-lab', '/math-lab'),
      act('memory', '/tasks/memory'),
      act('trace', '/trace'),
    ],
  },
  {
    id: 'dinosaur',
    nameKey: 'universe.worlds.dinosaur',
    icon3d: 'dinosaur',
    starsNeeded: 14,
    activities: [act('dino', '/worlds/dino')],
  },
  {
    id: 'space',
    nameKey: 'universe.worlds.space',
    icon3d: 'rocket',
    starsNeeded: 24,
    activities: [act('space', '/learn/space')],
  },
  {
    id: 'science',
    nameKey: 'universe.worlds.science',
    icon3d: 'telescope',
    starsNeeded: 36,
    activities: [act('help', '/learn/help')],
  },
  {
    id: 'uzbekistan',
    nameKey: 'universe.worlds.uzbekistan',
    icon3d: 'castle',
    starsNeeded: 50,
    activities: [
      act('uzbekistan', '/worlds/uzbekistan'),
      uzGame('map'),
      uzGame('table'),
      uzGame('patterns'),
    ],
  },
]

export interface AdventureWorld {
  id: string
  nameKey: string
  icon3d: string
  starsNeeded: number
  comingSoon: boolean
  unlocked: boolean
  /** The newest unlocked world that is not 'coming soon': where the child is on the map. */
  current: boolean
  activities: {
    activity: string
    route: string
    labelKey: string
    bestStars: number
    /**
     * The route can be played now. Always true for existing learning routes,
     * also in a world not unlocked yet (they are open from the City); false
     * only in 'coming soon' worlds, whose routes do not exist yet.
     */
    open: boolean
  }[]
}

/** Best stars per activity base (`math:4` and `math:6` → `math`). */
export function bestByBase(best: Readonly<Record<string, number>>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [activity, stars] of Object.entries(best)) {
    const base = activityBase(activity)
    out[base] = Math.max(out[base] ?? 0, stars)
  }
  return out
}

/** Best stars of the activities whose id starts with `prefix`. */
function bestWithPrefix(best: Readonly<Record<string, number>>, prefix: string): number {
  let out = 0
  for (const [activity, stars] of Object.entries(best)) {
    if (activity.startsWith(prefix)) out = Math.max(out, stars)
  }
  return out
}

/** Pure: the map for a number of stars earned and the child's best stars. */
export function adventureState(
  stars: number,
  best: Readonly<Record<string, number>>,
): AdventureWorld[] {
  const byBase = bestByBase(best)
  let currentIndex = 0
  WORLDS.forEach((world, index) => {
    if (stars >= world.starsNeeded && !world.comingSoon) currentIndex = index
  })
  return WORLDS.map((world, index) => ({
    id: world.id,
    nameKey: world.nameKey,
    icon3d: world.icon3d,
    starsNeeded: world.starsNeeded,
    comingSoon: world.comingSoon ?? false,
    unlocked: stars >= world.starsNeeded,
    current: index === currentIndex,
    activities: world.activities.map((item) => ({
      activity: item.activity,
      route: item.route,
      labelKey: item.labelKey,
      bestStars: Math.max(
        0,
        ...(item.matches ?? [item.activity]).map((base) => byBase[base] ?? 0),
        ...(item.prefixes ?? []).map((prefix) => bestWithPrefix(best, prefix)),
      ),
      open: !world.comingSoon,
    })),
  }))
}

/** The Adventure Map of the active child. Stars = star resource earned. */
export function useAdventure(): AdventureWorld[] {
  const childKey = useChildKey()
  const child = useUniverseStore((s) => s.byChild[childKey] ?? EMPTY_UNIVERSE_CHILD)
  return useMemo(
    () => adventureState(child.stats.earned.star ?? 0, child.best),
    [child.stats.earned.star, child.best],
  )
}

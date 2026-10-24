import type { DomainEvent } from '@/domain/universe/progression'
import { PLANT_STAGES } from '@/domain/universe/progression/content'
import type { MascotMood } from '../types'
import { PRIORITY, type Performance } from './director'
import { MASCOTS, type Gesture, type MascotId } from './registry'

/*
 * The reaction resolver: what a mascot does when something happens. Pure:
 * (signal, mascot, state) in, one performance (or nothing) out. Pages never
 * decide a mascot's reactions; they report what happened (useMascot moods)
 * and the universe reports world events (Phase 18 domain events).
 *
 * Rules a child feels:
 * - a wrong answer makes the mascot think or encourage, never sad or cross;
 * - rewards and quests get a short positive moment; the big ones (a world
 *   opened, a find, a finished quest) a celebration;
 * - mascots react to events, they never decide them: nothing here pays,
 *   unlocks or completes anything.
 */

export type Signal =
  { kind: 'mood'; mood: MascotMood } | { kind: 'domain'; event: DomainEvent } | { kind: 'tap' }

export interface ReactionState {
  mascot: MascotId
  /** Right answers in a row, recently (a streak earns a celebration). */
  streak: number
  reducedMotion: boolean
}

const reaction = (
  gesture: string,
  emotion: Performance['emotion'],
  rank: number,
  extra: Partial<Performance> = {},
): Performance => ({ gesture, emotion, priority: PRIORITY.reaction, rank, ...extra })

const celebrate = (rank = 3) => reaction('celebrate', 'celebrate', rank)

/** look → surprised → celebrate (a find, a new world). */
const wow = (critical = false): Performance =>
  reaction('surprised', 'surprised', 4, {
    priority: critical ? PRIORITY.critical : PRIORITY.reaction,
    holdMs: 700,
    then: {
      ...celebrate(4),
      emotion: 'excited',
      priority: critical ? PRIORITY.critical : PRIORITY.reaction,
    },
  })

export function resolveReaction(signal: Signal, state: ReactionState): Performance | null {
  const perf = resolve(signal, state)
  return perf && state.reducedMotion ? calm(perf, state.mascot) : perf
}

function resolve(signal: Signal, state: ReactionState): Performance | null {
  if (signal.kind === 'tap') {
    return { gesture: 'wave', emotion: 'happy', priority: PRIORITY.interaction, rank: 1 }
  }
  if (signal.kind === 'mood') return fromMood(signal.mood, state)
  return fromEvent(signal.event, state)
}

function fromMood(mood: MascotMood, state: ReactionState): Performance | null {
  switch (mood) {
    case 'happy':
      // a right answer: a nod; a streak of them: a celebration
      return state.streak >= 3
        ? reaction('celebrate', 'excited', 3)
        : reaction('encourage', 'happy', 1)
    case 'oops':
      // a wrong answer: thinking together, never disappointment
      return reaction('think', 'encouraging', 1, { holdMs: 1600 })
    case 'celebrate':
      return celebrate()
    case 'wave':
      return reaction('wave', 'happy', 1, { priority: PRIORITY.interaction })
    // idle, talk (a speaking layer) and sleepy (a base pose) are states, not moments
    default:
      return null
  }
}

function fromEvent(event: DomainEvent, state: ReactionState): Performance | null {
  const { mascot } = state
  switch (event.type) {
    case 'activity.completed':
      return event.award.stars >= 3 ? celebrate(2) : reaction('encourage', 'happy', 1)
    case 'resource.changed': {
      const { amount, resource } = event.entry
      if (amount <= 0) return null // spending is the child's choice, not a moment
      if (resource === 'star') return reaction('nod', 'happy', 1)
      return reaction('surprised', 'surprised', 2, {
        holdMs: 600,
        then: reaction(
          mascot === 'pixel' && resource === 'part' ? 'thumbs_up' : 'celebrate',
          'excited',
          2,
        ),
      })
    }
    case 'quest.completed':
    case 'quest.claimed':
    case 'achievement.reached':
    case 'skill.mastered':
      return celebrate()
    case 'journey.step':
      // the journey moved on: show the way to the next place
      return reaction('point', 'encouraging', 2, { holdMs: 1400 })
    case 'world.unlocked':
      return wow(true)
    case 'artifact.discovered':
      return wow()
    case 'building.upgraded':
      return mascot === 'pixel'
        ? reaction('wrench', 'happy', 3, { then: reaction('thumbs_up', 'excited', 3) })
        : celebrate(2)
    case 'seed.planted':
      return mascot === 'leafy'
        ? reaction('gardening', 'happy', 2)
        : reaction('encourage', 'happy', 1)
    case 'plant.grew':
      if (event.stage >= PLANT_STAGES)
        return mascot === 'leafy' ? reaction('bloom', 'celebrate', 3) : celebrate(3)
      return mascot === 'leafy' ? reaction('leaf_flutter', 'happy', 2) : reaction('nod', 'happy', 1)
    case 'mistake.confirmed':
      // a new seed in the Practice Garden: something to grow, said kindly
      return mascot === 'leafy' ? reaction('encourage', 'encouraging', 1) : null
    case 'mistake.resolved':
      // a plant bloomed: a skill came back by itself
      return mascot === 'leafy'
        ? reaction('bloom', 'celebrate', 3)
        : reaction('encourage', 'happy', 2)
    // a single slip and level changes are not moments for a mascot
    case 'mistake.made':
    case 'adaptation.updated':
      return null
  }
}

/** Reduced motion: no jumps, spins or dances; a pose and a face instead. */
const MOVING = new Set([
  'celebrate',
  'jump',
  'turn',
  'run',
  'walk',
  'dance',
  'happy_hop',
  'bloom',
  'hover',
  'float',
  'illuminate',
  'stomp',
])

export function calm(perf: Performance, mascot?: MascotId): Performance {
  // judge by the clip the mascot really plays (Lumi encourages by rising and shining)
  const own = mascot ? MASCOTS[mascot].style[perf.gesture as Gesture]?.[0] : undefined
  const moving = MOVING.has(perf.gesture) || (own !== undefined && MOVING.has(own))
  const gesture = moving ? 'celebrate_calm' : perf.gesture
  return { ...perf, gesture, ...(perf.then ? { then: calm(perf.then, mascot) } : {}) }
}

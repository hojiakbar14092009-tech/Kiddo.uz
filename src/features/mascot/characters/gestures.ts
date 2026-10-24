import type { Gesture, MascotContext, MascotDefinition } from './registry'

/*
 * Shared animation semantics: `play('celebrate')` means a celebration for
 * every mascot, and each one performs it its own way (KidoBot throws its arms
 * up, Dinoo hops and wags its tail, Lumi rises and shines, Leafy blooms).
 */

/** Clips that loop until something else plays; the rest play once. */
export const LOOPING: ReadonlySet<string> = new Set([
  'idle',
  'talk',
  'listen',
  'walk',
  'run',
  'sleep',
  'float',
  'hover',
  'dance',
  'rhythm',
  'tail_wag',
  'read',
  'headphone_listen',
])

/** The clip a mascot plays for a gesture (or one of its own clips); 'idle' if it has none. */
export function clipFor(
  def: MascotDefinition,
  gesture: string,
  available: ReadonlySet<string>,
): string {
  const own = def.style[gesture as Gesture] ?? []
  for (const name of [...own, gesture]) if (available.has(name)) return name
  return 'idle'
}

/** What the mascot does when nothing happens on this page. */
export function baseGesture(def: MascotDefinition, context: MascotContext): string {
  return def.idleIn?.[context] ?? 'idle'
}

/** Spontaneous idle gestures, in turn (never on calm, focused pages). */
export const IDLE_VARIATIONS = ['idle_alt', 'look_around'] as const

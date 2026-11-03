/*
 * The science games' content and scoring (Phase 59), pure so it is tested
 * without a browser. What sticks to a magnet and what floats is real physics,
 * kept to things a four-year-old has held.
 */
import type { ActivityCompleted } from '@/domain/universe/types'
import type { SciGame } from './games'

export type MagnetThing = 'key' | 'spoon' | 'bolt' | 'clip' | 'apple' | 'pencil' | 'ball' | 'leaf'

export const MAGNET_THINGS: readonly { id: MagnetThing; emoji: string; iron: boolean }[] = [
  { id: 'apple', emoji: '🍎', iron: false },
  { id: 'key', emoji: '🔑', iron: true },
  { id: 'pencil', emoji: '✏️', iron: false },
  { id: 'clip', emoji: '📎', iron: true },
  { id: 'ball', emoji: '⚽', iron: false },
  { id: 'spoon', emoji: '🥄', iron: true },
  { id: 'leaf', emoji: '🍃', iron: false },
  { id: 'bolt', emoji: '🔩', iron: true },
]

export const IRON_COUNT = MAGNET_THINGS.filter((thing) => thing.iron).length

export type FloatThing = 'duck' | 'stone' | 'apple' | 'key' | 'leaf' | 'coin'

/** Light things float, heavy (dense) things sink; an apple floats (it holds air). */
export const FLOAT_THINGS: readonly { id: FloatThing; emoji: string; floats: boolean }[] = [
  { id: 'duck', emoji: '🦆', floats: true },
  { id: 'stone', emoji: '🪨', floats: false },
  { id: 'apple', emoji: '🍎', floats: true },
  { id: 'key', emoji: '🔑', floats: false },
  { id: 'leaf', emoji: '🍃', floats: true },
  { id: 'coin', emoji: '🪙', floats: false },
]

/** The water game's steps, in order; the child moves each one on with a tap. */
export const WATER_STEPS = ['sun', 'steam', 'cloud', 'rain', 'flower', 'river', 'done'] as const
export type WaterStep = (typeof WATER_STEPS)[number]

/** Taps on the cloud before it is heavy enough to rain. */
export const CLOUD_TAPS = 3

export function nextWaterStep(step: WaterStep): WaterStep {
  const index = WATER_STEPS.indexOf(step)
  return WATER_STEPS[Math.min(index + 1, WATER_STEPS.length - 1)]!
}

/** The universe's run for a finished game (strand science, counted once a day). */
export function sciRun(
  game: SciGame,
  id: string,
  childKey: string,
  total: number,
  firstTry: number,
): ActivityCompleted {
  return {
    id,
    childKey,
    activity: game.activity,
    strand: game.strand,
    correct: total,
    total,
    independent: Math.max(0, Math.min(total, firstTry)),
    oncePerDay: true,
  }
}

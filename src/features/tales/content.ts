import type { AnimalId } from './animals'

/*
 * The 3D scene's vocabulary (places, characters, moods), shared by the Story Engine and "My story".
 * The nine classic tales that first used it were removed in the MVP (git history: features/tales).
 */

export type AgeLevel = 4 | 5 | 6

/** The place a scene happens in (sky, ground and decorations of the 3D scene). */
export type Backdrop =
  'meadow' | 'garden' | 'pond' | 'night' | 'autumn' | 'winter' | 'rain' | 'farm'

export interface Actor {
  /** A picture in public/3d. */
  asset: string
  /** Left (-3) to right (3) along the path. */
  x: number
  /** Back (-2) to front (1). */
  z?: number
  /** Height above the ground (things in the sky). */
  y?: number
  /** Size (1 = a character). */
  size?: number
  /** Walks (hops) along the path from `x` to this point. */
  toX?: number
  /** Keeps hopping gently in place. */
  hop?: boolean
  /** A story animal with a real 3D model (Phase 78): played rigged on the 3D stage. */
  model?: AnimalId
}

/**
 * A task in a scene. `options` are pictures; for find/choose the first one is
 * the right answer (shown in a mixed order), for order they are in the right
 * order (shown mixed, the child puts them back).
 */
export interface TaskSpec {
  kind: 'find' | 'choose' | 'order'
  options: readonly string[]
}

export interface SceneSpec {
  backdrop: Backdrop
  actors: readonly Actor[]
  task?: TaskSpec
}

/** An end-of-tale question: answer pictures, the first one right. */
export interface CheckSpec {
  /** What it practises, for review (e.g. "who", "sequence", "cause", "predict"). */
  skill: string
  options: readonly string[]
}

export interface TaleSpec {
  id: string
  age: AgeLevel
  cover: string
  scenes: readonly SceneSpec[]
  checks: readonly CheckSpec[]
}

export interface SceneText {
  lines: readonly string[]
  /** The task's question and the labels of its pictures (same order as the spec). */
  task?: { prompt: string; options: readonly string[] }
}

export interface TaleText {
  title: string
  scenes: readonly SceneText[]
  checks: readonly { prompt: string; options: readonly string[] }[]
}

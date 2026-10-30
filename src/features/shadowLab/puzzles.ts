import type { PuzzleDepth } from '@/domain/adaptive'
import {
  shadowOf,
  SHAPES,
  type Light,
  type Placement,
  type Polygon,
  type ShapeId,
} from './geometry'
import type { SolidId, View } from './solids'

/*
 * The Shadow Lab missions (Phase 34): five puzzles, one per mode, built for
 * the learner's PuzzleDepth (one object and one light → turning and moving
 * the light → several constraints and viewpoints). Fixed data, so a mission
 * is the same every time and every target is reachable with the controls'
 * own steps.
 */

export const CONTROLS = ['distance', 'rotate', 'tilt', 'lightX', 'lightY', 'lightZ'] as const
export type Control = (typeof CONTROLS)[number]

/** Each control's range and step (the targets sit on these steps). */
export const CONTROL_RANGE: Record<Control, { min: number; max: number; step: number }> = {
  distance: { min: 2, max: 8, step: 0.5 },
  rotate: { min: -180, max: 180, step: 15 },
  tilt: { min: -60, max: 60, step: 15 },
  lightX: { min: -4, max: 4, step: 0.5 },
  lightY: { min: -3, max: 3, step: 0.5 },
  lightZ: { min: 0, max: 1.5, step: 0.5 },
}

export interface Scene {
  at: Placement
  light: Light
}

export const PIECES = ['square', 'triangle', 'circle'] as const
export type PieceId = (typeof PIECES)[number]

export type Puzzle =
  /** Mode 1 (match): change the object (and maybe the light) until its shadow fits the target. */
  | { mode: 'match'; shape: ShapeId; start: Scene; target: Scene; controls: Control[] }
  /** Mode 4 (light): the object stays, only the light moves. */
  | { mode: 'light'; shape: ShapeId; start: Scene; target: Scene; controls: Control[] }
  /** Mode 3 (build): put pieces in the slots so the shadows make the target. */
  | { mode: 'build'; slots: readonly (readonly [number, number])[]; target: (PieceId | null)[] }
  /** Mode 2 (views): which solid has these views? */
  | { mode: 'views'; solid: SolidId; views: View[]; options: SolidId[] }
  /** Mode 5 (detective): which set-up made this shadow? */
  | { mode: 'detective'; shape: ShapeId; scenes: Scene[]; answer: number }

export type Mode = Puzzle['mode']
export const MODES: readonly Mode[] = ['match', 'views', 'build', 'light', 'detective']

const at = (z: number, extra: Partial<Placement> = {}): Placement => ({
  z,
  x: 0,
  y: 0,
  rotate: 0,
  tilt: 0,
  ...extra,
})
const light = (x = 0, y = 0, z = 0): Light => ({ x, y, z })

/** How close a shadow must be (overlap of the two shadows) to count as a match. */
export const MATCH_AT: Record<PuzzleDepth, number> = { simple: 0.72, spatial: 0.8, multi: 0.85 }

export const MISSIONS: Record<PuzzleDepth, Puzzle[]> = {
  simple: [
    {
      mode: 'match',
      shape: 'square',
      start: { at: at(7), light: light() },
      target: { at: at(3.5), light: light() },
      controls: ['distance'],
    },
    { mode: 'views', solid: 'cylinder', views: ['top'], options: ['cube', 'cylinder'] },
    {
      mode: 'build',
      slots: [
        [0, 0.9],
        [0, -0.9],
      ],
      target: ['triangle', 'square'],
    },
    {
      mode: 'light',
      shape: 'triangle',
      start: { at: at(5), light: light() },
      target: { at: at(5), light: light(-2) },
      controls: ['lightX'],
    },
    {
      mode: 'detective',
      shape: 'square',
      scenes: [
        { at: at(5), light: light(3) },
        { at: at(5), light: light(-3) },
      ],
      answer: 1,
    },
  ],
  spatial: [
    {
      mode: 'match',
      shape: 'arrow',
      start: { at: at(6), light: light() },
      target: { at: at(4, { rotate: 90 }), light: light() },
      controls: ['distance', 'rotate'],
    },
    {
      mode: 'views',
      solid: 'cone',
      views: ['front', 'top'],
      options: ['pyramid', 'cone', 'cylinder'],
    },
    {
      mode: 'build',
      slots: [
        [0, 0.9],
        [-0.9, -0.9],
        [0.9, -0.9],
      ],
      target: ['circle', 'square', 'square'],
    },
    {
      mode: 'light',
      shape: 'ell',
      start: { at: at(5), light: light() },
      target: { at: at(5), light: light(2, -1.5) },
      controls: ['lightX', 'lightY'],
    },
    {
      mode: 'detective',
      shape: 'arrow',
      scenes: [
        { at: at(4), light: light(-1.5) },
        { at: at(6), light: light(-1.5) },
        { at: at(4), light: light(1.5) },
      ],
      answer: 2,
    },
  ],
  multi: [
    {
      mode: 'match',
      shape: 'ell',
      start: { at: at(6), light: light() },
      target: { at: at(4.5, { rotate: -90, tilt: 45 }), light: light(-1) },
      controls: ['distance', 'rotate', 'tilt', 'lightX'],
    },
    {
      mode: 'views',
      solid: 'pyramid',
      views: ['front', 'top', 'side'],
      options: ['cone', 'cube', 'pyramid', 'prism'],
    },
    {
      mode: 'build',
      slots: [
        [-0.9, 0.9],
        [0.9, 0.9],
        [-0.9, -0.9],
        [0.9, -0.9],
      ],
      target: ['triangle', 'triangle', 'square', 'circle'],
    },
    {
      mode: 'light',
      shape: 'arrow',
      start: { at: at(5, { rotate: 30 }), light: light() },
      target: { at: at(5, { rotate: 30 }), light: light(1, 0.5, 1) },
      controls: ['lightX', 'lightY', 'lightZ'],
    },
    {
      mode: 'detective',
      shape: 'ell',
      scenes: [
        { at: at(5, { tilt: 60 }), light: light(-2) },
        { at: at(5), light: light(-2) },
        { at: at(5, { tilt: 60 }), light: light(2) },
        { at: at(3), light: light(-2) },
      ],
      answer: 0,
    },
  ],
}

/** The pieces of a build puzzle sit in the object's plane at this depth. */
export const BUILD_Z = 5
const PIECE_SCALE = 0.8

/** The shadows of a build: one polygon per filled slot. */
export function buildShadow(
  slots: readonly (readonly [number, number])[],
  pieces: readonly (PieceId | null)[],
): Polygon[] {
  return slots.flatMap(([x, y], index) => {
    const piece = pieces[index]
    if (!piece) return []
    const shape: Polygon = SHAPES[piece].map(
      ([px, py]) => [px * PIECE_SCALE, py * PIECE_SCALE] as const,
    )
    return [shadowOf(shape, at(BUILD_Z, { x, y }), light())]
  })
}

/** A scene's shadow (one polygon). */
export function sceneShadow(shape: ShapeId, scene: Scene): Polygon {
  return shadowOf(SHAPES[shape], scene.at, scene.light)
}

/** Reads a control's value from a scene. */
export function controlValue(scene: Scene, control: Control): number {
  switch (control) {
    case 'distance':
      return scene.at.z
    case 'rotate':
      return scene.at.rotate
    case 'tilt':
      return scene.at.tilt
    case 'lightX':
      return scene.light.x
    case 'lightY':
      return scene.light.y
    case 'lightZ':
      return scene.light.z ?? 0
  }
}

/** A scene with one control changed (clamped to its range and step). */
export function withControl(scene: Scene, control: Control, value: number): Scene {
  const { min, max, step } = CONTROL_RANGE[control]
  const v = Math.min(max, Math.max(min, Math.round(value / step) * step))
  switch (control) {
    case 'distance':
      return { ...scene, at: { ...scene.at, z: v } }
    case 'rotate':
      return { ...scene, at: { ...scene.at, rotate: v } }
    case 'tilt':
      return { ...scene, at: { ...scene.at, tilt: v } }
    case 'lightX':
      return { ...scene, light: { ...scene.light, x: v } }
    case 'lightY':
      return { ...scene, light: { ...scene.light, y: v } }
    case 'lightZ':
      return { ...scene, light: { ...scene.light, z: v } }
  }
}

/** One finished mission (the central progression counts it). */
export const SHADOW_ACTIVITY = 'shadow-lab'

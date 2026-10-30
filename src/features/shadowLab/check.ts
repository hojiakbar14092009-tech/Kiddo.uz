import type { PuzzleDepth } from '@/domain/adaptive'
import { overlap } from './geometry'
import {
  controlValue,
  MATCH_AT,
  sceneShadow,
  type Control,
  type PieceId,
  type Puzzle,
  type Scene,
} from './puzzles'

/*
 * Checking an answer (Phase 34): shadows are compared by overlap with a
 * tolerance by depth (never pixel perfect); a miss gets one hint about the
 * first control that is still off, and in which direction to move it.
 */

export interface Hint {
  control: Control
  /** Move the control up (true) or down (false). */
  up: boolean
}

export function matches(
  puzzle: Extract<Puzzle, { mode: 'match' | 'light' }>,
  scene: Scene,
  depth: PuzzleDepth,
): boolean {
  return (
    overlap([sceneShadow(puzzle.shape, scene)], [sceneShadow(puzzle.shape, puzzle.target)]) >=
    MATCH_AT[depth]
  )
}

export function hintFor(
  puzzle: Extract<Puzzle, { mode: 'match' | 'light' }>,
  scene: Scene,
): Hint | null {
  for (const control of puzzle.controls) {
    const now = controlValue(scene, control)
    const goal = controlValue(puzzle.target, control)
    if (Math.abs(now - goal) > 1e-6) return { control, up: goal > now }
  }
  return null
}

/**
 * A build is a discrete choice per place, so it is right when every place
 * holds the target's piece (the shadows then match exactly); two different
 * pieces can throw shadows too alike for an overlap test to tell apart.
 */
export function buildMatches(
  puzzle: Extract<Puzzle, { mode: 'build' }>,
  pieces: readonly (PieceId | null)[],
): boolean {
  return puzzle.target.every((piece, index) => pieces[index] === piece)
}

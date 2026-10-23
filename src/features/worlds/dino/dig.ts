import type { ChallengeLevel } from '@/domain/learner'
import { DINO_IDS, type DinoId } from './content'
import { shuffle } from './quiz'

/*
 * The Fossil dig: a square of sand over a bone. Every touch (a tap or a
 * drag, or the keyboard) clears the cells around it; once most of the sand
 * is gone, the child says whose bone it is. Pure grid logic, tested.
 */

export interface DigLevel {
  bones: number
  /** Cells per side. */
  grid: number
  /** Brush radius in cells. */
  brush: number
  /** Pictures to choose from. */
  choices: number
}

export const DIG_LEVELS: Record<ChallengeLevel, DigLevel> = {
  1: { bones: 2, grid: 6, brush: 1.3, choices: 2 },
  2: { bones: 2, grid: 7, brush: 1.3, choices: 3 },
  3: { bones: 3, grid: 7, brush: 1.1, choices: 3 },
  4: { bones: 3, grid: 8, brush: 1.1, choices: 4 },
  5: { bones: 3, grid: 8, brush: 1.0, choices: 4 },
}

/** Share of the sand that must be gone before the bone counts as found. */
export const UNCOVERED = 0.7

export interface DigBone {
  dino: DinoId
  options: DinoId[]
}

export function planDig(level: ChallengeLevel, random: () => number = Math.random): DigBone[] {
  const { bones, choices } = DIG_LEVELS[level]
  return shuffle(DINO_IDS, random)
    .slice(0, bones)
    .map((dino) => ({
      dino,
      options: shuffle(
        [
          dino,
          ...shuffle(
            DINO_IDS.filter((id) => id !== dino),
            random,
          ).slice(0, choices - 1),
        ],
        random,
      ),
    }))
}

export function newSand(grid: number): boolean[] {
  return Array.from({ length: grid * grid }, () => false)
}

/** Clears the cells whose centres are within `radius` cells of (x, y) (in cells). */
export function brushAt(
  cleared: readonly boolean[],
  grid: number,
  x: number,
  y: number,
  radius: number,
): boolean[] {
  return cleared.map((done, index) => {
    if (done) return true
    const cx = (index % grid) + 0.5
    const cy = Math.floor(index / grid) + 0.5
    return Math.hypot(cx - x, cy - y) <= radius
  })
}

/** The keyboard way: clears the next row that still has sand. */
export function brushNextRow(cleared: readonly boolean[], grid: number): boolean[] {
  for (let row = 0; row < grid; row += 1) {
    const cells = cleared.slice(row * grid, row * grid + grid)
    if (cells.some((done) => !done)) {
      return cleared.map((done, index) => done || Math.floor(index / grid) === row)
    }
  }
  return [...cleared]
}

export function clearedShare(cleared: readonly boolean[]): number {
  if (cleared.length === 0) return 1
  return cleared.filter(Boolean).length / cleared.length
}

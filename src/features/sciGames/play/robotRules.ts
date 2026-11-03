/*
 * The robot programmer (Phase 65): the child lays out arrows, then presses
 * "Go"; the robot follows them one by one on a small grid to its battery.
 * Sequencing and planning ahead – a first taste of programming. Pure.
 */

export type Move = 'up' | 'down' | 'left' | 'right'
export const MOVES: readonly Move[] = ['up', 'left', 'right', 'down']

export interface Cell {
  x: number
  y: number
}

export interface RobotLevel {
  size: number
  start: Cell
  battery: Cell
  rocks: readonly Cell[]
}

/** The longest program a level takes. */
export const MAX_PROGRAM = 8

export const ROBOT_LEVELS: readonly RobotLevel[] = [
  { size: 4, start: { x: 0, y: 3 }, battery: { x: 2, y: 3 }, rocks: [] },
  { size: 4, start: { x: 1, y: 3 }, battery: { x: 1, y: 0 }, rocks: [] },
  { size: 4, start: { x: 0, y: 3 }, battery: { x: 2, y: 1 }, rocks: [{ x: 1, y: 3 }] },
  {
    size: 4,
    start: { x: 0, y: 0 },
    battery: { x: 3, y: 3 },
    rocks: [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ],
  },
  {
    size: 4,
    start: { x: 3, y: 3 },
    battery: { x: 0, y: 0 },
    rocks: [
      { x: 2, y: 3 },
      { x: 1, y: 1 },
      { x: 2, y: 0 },
    ],
  },
]

const STEP: Record<Move, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

export type RunOutcome = 'win' | 'bump' | 'short'

export interface RunResult {
  /** Every cell the robot stands on, the start first (a bump ends where it stood). */
  path: Cell[]
  outcome: RunOutcome
  /** The step that bumped (into a rock or the edge), if any. */
  bumpedAt?: number
}

const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y

export function runProgram(level: RobotLevel, program: readonly Move[]): RunResult {
  const path: Cell[] = [level.start]
  let here = level.start
  for (let index = 0; index < program.length; index += 1) {
    const step = STEP[program[index]!]
    const next = { x: here.x + step.x, y: here.y + step.y }
    const outside = next.x < 0 || next.y < 0 || next.x >= level.size || next.y >= level.size
    if (outside || level.rocks.some((rock) => same(rock, next))) {
      return { path, outcome: 'bump', bumpedAt: index }
    }
    here = next
    path.push(here)
    // reaching the battery ends the run, even with arrows left
    if (same(here, level.battery)) return { path, outcome: 'win' }
  }
  return { path, outcome: 'short' }
}

/** The fewest moves that solve a level (null: none within MAX_PROGRAM). */
export function shortestSolution(level: RobotLevel): number | null {
  const seen = new Set([`${level.start.x},${level.start.y}`])
  let frontier: Cell[] = [level.start]
  for (let depth = 1; depth <= MAX_PROGRAM; depth += 1) {
    const next: Cell[] = []
    for (const cell of frontier)
      for (const move of MOVES) {
        const result = runProgram({ ...level, start: cell }, [move])
        if (result.outcome === 'win') return depth
        if (result.outcome === 'bump') continue
        const to = result.path[1]!
        const key = `${to.x},${to.y}`
        if (!seen.has(key)) {
          seen.add(key)
          next.push(to)
        }
      }
    frontier = next
  }
  return null
}

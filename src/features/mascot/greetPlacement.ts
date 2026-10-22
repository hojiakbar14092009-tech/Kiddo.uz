/**
 * Where a roaming robot stands while it says hello, and where its bubble goes:
 * always fully inside the visible area, and never on top of buttons, cards or
 * headings (`obstacles`) when there is any free spot for it.
 *
 * Pure geometry (page coordinates), so it is easy to test.
 */
import type { Point } from './roamSpace'

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

export interface Size {
  width: number
  height: number
}

export interface GreetPlacement {
  robot: Point
  bubble: Point
  /** Which side of the bubble the robot's head is on (as `MascotThoughtBubble` expects). */
  side: 'left' | 'right'
  /** How much of the bubble (and, less important, the robot) covers obstacles; 0 is a free spot. */
  cost: number
  /** True when it stands in the page's own greeting spot. */
  inStage: boolean
}

interface PlaceGreetingInput {
  /** The visible part of the page, already without safe areas and the top bar. */
  area: Box
  robot: Size
  bubble: Size
  /** Things the bubble must not cover. */
  obstacles: Box[]
  /** A spot the page keeps free for the greeting, if any. */
  stage?: Box | null
  /** Space between the robot and its bubble. */
  gap?: number
  /** How far apart the tried heights are. */
  step?: number
}

export function overlapArea(a: Box, b: Box): number {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
  return w > 0 && h > 0 ? w * h : 0
}

/** Moves a box of `size` at `point` so it lies inside `area` (left/top win if it is too big). */
export function clampInto(point: Point, size: Size, area: Box): Point {
  const x = Math.min(point.x, area.x + area.width - size.width)
  const y = Math.min(point.y, area.y + area.height - size.height)
  return { x: Math.max(area.x, x), y: Math.max(area.y, y) }
}

/** Clamps only horizontally: a robot on its way to a card may be above or below the view. */
export function clampX(x: number, width: number, left: number, right: number): number {
  return Math.max(left, Math.min(x, right - width))
}

/** The widest the bubble may be next to the robot, so both fit side by side. */
export function bubbleMaxWidth(space: Box, robot: Size, gap = 8, cap = 320): number {
  return Math.max(120, Math.min(cap, space.width - robot.width - gap))
}

const box = (at: Point, size: Size): Box => ({ ...at, ...size })

function cost(robot: Box, bubble: Box, obstacles: Box[]): number {
  let total = 0
  for (const obstacle of obstacles) {
    // The bubble hides text, the robot only peeks over things: the bubble counts much more.
    total += overlapArea(bubble, obstacle) * 10 + overlapArea(robot, obstacle)
  }
  return total
}

/** The robot at one place and its bubble beside (or above) it, all kept inside `area`. */
function candidate(
  robotAt: Point,
  input: Required<Omit<PlaceGreetingInput, 'stage'>>,
  bubbleWhere: 'beside' | 'above',
  inStage: boolean,
): GreetPlacement {
  const { area, robot, bubble, obstacles, gap } = input
  const at = clampInto(robotAt, robot, area)
  // the bubble goes on the side with more room
  const roomLeft = at.x - area.x
  const roomRight = area.x + area.width - (at.x + robot.width)
  const toLeft = roomLeft >= roomRight
  let bubbleAt: Point
  if (bubbleWhere === 'beside') {
    bubbleAt = {
      x: toLeft ? at.x - gap - bubble.width : at.x + robot.width + gap,
      // level with the robot's head
      y: at.y + robot.height * 0.45 - bubble.height / 2,
    }
  } else {
    bubbleAt = {
      x: toLeft ? at.x + robot.width - bubble.width : at.x,
      y: at.y - gap - bubble.height,
    }
  }
  bubbleAt = clampInto(bubbleAt, bubble, area)
  return {
    robot: at,
    bubble: bubbleAt,
    side: toLeft ? 'right' : 'left',
    cost: cost(box(at, robot), box(bubbleAt, bubble), obstacles),
    inStage,
  }
}

/**
 * Picks the greeting spot. The page's own greeting spot (`stage`) comes first;
 * otherwise it tries both screen edges at many heights, the bubble beside or
 * above the robot, and takes the first spot that covers nothing (or the one
 * that covers least).
 */
export function placeGreeting(input: PlaceGreetingInput): GreetPlacement {
  const { area, robot, bubble, stage } = input
  const full = { ...input, gap: input.gap ?? 8, step: input.step ?? 12 }
  const { gap, step } = full
  const tries: GreetPlacement[] = []

  if (stage && overlapArea(stage, area) >= stage.width * stage.height * 0.9) {
    // right end of the stage, both vertically centred in it
    const robotAt = {
      x: stage.x + stage.width - robot.width,
      y: stage.y + Math.max(0, stage.height - robot.height) / 2,
    }
    const pick = candidate(robotAt, full, 'beside', true)
    // centre the bubble on the stage's height too, and keep it within the stage
    const y = stage.y + (stage.height - bubble.height) / 2
    const x = Math.max(stage.x, pick.robot.x - gap - bubble.width)
    const bubbleAt = clampInto({ x, y }, bubble, area)
    const inStage = {
      ...pick,
      bubble: bubbleAt,
      side: 'right' as const,
      cost: cost(box(pick.robot, robot), box(bubbleAt, bubble), input.obstacles),
    }
    if (inStage.cost === 0) return inStage
    tries.push(inStage)
  }

  const edges = [area.x + area.width - robot.width, area.x]
  for (let y = area.y + area.height - robot.height; y >= area.y; y -= step) {
    for (const x of edges) {
      for (const where of ['beside', 'above'] as const) {
        const pick = candidate({ x, y }, full, where, false)
        if (pick.cost === 0) return pick
        tries.push(pick)
      }
    }
  }

  if (tries.length === 0) {
    // the view is smaller than the robot: just keep it inside
    return candidate({ x: area.x + area.width - robot.width, y: area.y }, full, 'beside', false)
  }
  return tries.reduce((best, next) => (next.cost < best.cost ? next : best))
}

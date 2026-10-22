import { describe, expect, it } from 'vitest'
import {
  bubbleMaxWidth,
  clampInto,
  clampX,
  overlapArea,
  placeGreeting,
  type Box,
} from './greetPlacement'

const inside = (inner: Box, outer: Box) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height

const robot = { width: 84, height: 105 }
const bubble = { width: 196, height: 100 }

describe('greeting placement', () => {
  it('measures overlap and clamps boxes into an area', () => {
    expect(
      overlapArea({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 5, width: 10, height: 10 }),
    ).toBe(25)
    expect(
      overlapArea({ x: 0, y: 0, width: 10, height: 10 }, { x: 10, y: 0, width: 5, height: 5 }),
    ).toBe(0)
    const area = { x: 8, y: 72, width: 304, height: 488 }
    expect(clampInto({ x: 300, y: 600 }, robot, area)).toEqual({ x: 228, y: 455 })
    expect(clampInto({ x: -50, y: 0 }, robot, area)).toEqual({ x: 8, y: 72 })
    // a robot at the right edge of a 320px phone is pulled fully inside
    expect(clampX(320 - 84 * 0.55, 84 * 1.1, 8, 312)).toBeCloseTo(312 - 92.4)
  })

  it('keeps the bubble narrow enough to stand beside the robot on a 320px phone', () => {
    expect(bubbleMaxWidth({ x: 16, y: 0, width: 288, height: 128 }, robot)).toBe(196)
    expect(bubbleMaxWidth({ x: 0, y: 0, width: 1200, height: 160 }, robot)).toBe(320)
  })

  it('uses the page’s greeting spot when it is on screen and free', () => {
    const area = { x: 8, y: 72, width: 304, height: 488 }
    const stage = { x: 16, y: 150, width: 288, height: 128 }
    const journeyStop = { x: 16, y: 380, width: 90, height: 120 }
    const spot = placeGreeting({ area, robot, bubble, obstacles: [journeyStop], stage })
    expect(spot.inStage).toBe(true)
    expect(spot.cost).toBe(0)
    expect(inside({ ...spot.robot, ...robot }, stage)).toBe(true)
    expect(inside({ ...spot.bubble, ...bubble }, stage)).toBe(true)
    // the robot stands on the right, the bubble to its left, pointing at it
    expect(spot.bubble.x + bubble.width).toBeLessThanOrEqual(spot.robot.x)
    expect(spot.side).toBe('right')
  })

  it('finds a free spot inside the view when there is no greeting spot', () => {
    const area = { x: 8, y: 72, width: 804, height: 1000 }
    // cards fill the lower half, a heading at the top
    const obstacles = [
      { x: 300, y: 100, width: 220, height: 60 },
      { x: 16, y: 600, width: 788, height: 470 },
    ]
    const spot = placeGreeting({ area, robot, bubble, obstacles })
    expect(spot.cost).toBe(0)
    expect(inside({ ...spot.robot, ...robot }, area)).toBe(true)
    expect(inside({ ...spot.bubble, ...bubble }, area)).toBe(true)
    for (const obstacle of obstacles) {
      expect(overlapArea({ ...spot.bubble, ...bubble }, obstacle)).toBe(0)
    }
  })

  it('ignores a greeting spot that is scrolled out of view', () => {
    const area = { x: 8, y: 1000, width: 304, height: 488 }
    const stage = { x: 16, y: 150, width: 288, height: 128 }
    const spot = placeGreeting({ area, robot, bubble, obstacles: [], stage })
    expect(spot.inStage).toBe(false)
    expect(inside({ ...spot.robot, ...robot }, area)).toBe(true)
    expect(inside({ ...spot.bubble, ...bubble }, area)).toBe(true)
  })

  it('stays inside the view and covers as little as possible when nothing is free', () => {
    const area = { x: 8, y: 72, width: 304, height: 488 }
    const everything = [{ x: 0, y: 0, width: 320, height: 568 }]
    const spot = placeGreeting({ area, robot, bubble, obstacles: everything })
    expect(inside({ ...spot.robot, ...robot }, area)).toBe(true)
    expect(inside({ ...spot.bubble, ...bubble }, area)).toBe(true)
  })
})

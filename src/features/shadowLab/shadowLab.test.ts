import { describe, expect, it } from 'vitest'
import { buildMatches, hintFor, matches } from './check'
import { overlap, shadowOf, SHAPES, sizeOf, WALL_HALF, type Placement } from './geometry'
import {
  buildShadow,
  CONTROL_RANGE,
  controlValue,
  MATCH_AT,
  MISSIONS,
  MODES,
  sceneShadow,
  withControl,
  type Puzzle,
} from './puzzles'
import { SOLID_IDS, viewOf, VIEWS } from './solids'

/* Phase 34: shadows come from the light and the object, checked with a tolerance. */

const at = (z: number, extra: Partial<Placement> = {}): Placement => ({
  z,
  x: 0,
  y: 0,
  rotate: 0,
  tilt: 0,
  ...extra,
})
const centre = (polygon: readonly (readonly [number, number])[]) => [
  polygon.reduce((s, [x]) => s + x, 0) / polygon.length,
  polygon.reduce((s, [, y]) => s + y, 0) / polygon.length,
]

describe('the projection', () => {
  it('nearer the lamp, bigger the shadow (and exactly by the ratio of distances)', () => {
    const near = sizeOf(shadowOf(SHAPES.square, at(2.5), { x: 0, y: 0 }))
    const far = sizeOf(shadowOf(SHAPES.square, at(5), { x: 0, y: 0 }))
    expect(near.width).toBeCloseTo(8, 6) // 2 × 10 / 2.5
    expect(far.width).toBeCloseTo(4, 6) // 2 × 10 / 5
  })

  it('the shadow falls away from the lamp', () => {
    const [x] = centre(shadowOf(SHAPES.square, at(5), { x: -2, y: 0 }))
    expect(x).toBeCloseTo(2, 6)
    const [, y] = centre(shadowOf(SHAPES.square, at(5), { x: 0, y: 1 }))
    expect(y).toBeCloseTo(-1, 6)
  })

  it('turning turns the shadow; tilting narrows it; a lamp nearer the wall grows it', () => {
    const turned = shadowOf(SHAPES.arrow, at(5, { rotate: 90 }), { x: 0, y: 0 })
    const flat = sizeOf(shadowOf(SHAPES.arrow, at(5), { x: 0, y: 0 }))
    expect(sizeOf(turned).height).toBeCloseTo(flat.width, 6)
    const tilted = sizeOf(shadowOf(SHAPES.square, at(5, { tilt: 60 }), { x: 0, y: 0 }))
    expect(tilted.width).toBeLessThan(sizeOf(shadowOf(SHAPES.square, at(5), { x: 0, y: 0 })).width)
    const nearerWall = sizeOf(shadowOf(SHAPES.square, at(5), { x: 0, y: 0, z: 1 }))
    expect(nearerWall.width).toBeCloseTo((2 * 9) / 4, 6)
  })

  it('overlap is 1 for the same shadow and tolerant of small differences', () => {
    const a = [shadowOf(SHAPES.square, at(5), { x: 0, y: 0 })]
    expect(overlap(a, a)).toBe(1)
    const close = [shadowOf(SHAPES.square, at(5.2), { x: 0, y: 0 })]
    expect(overlap(a, close)).toBeGreaterThan(MATCH_AT.simple)
    const far = [shadowOf(SHAPES.square, at(3), { x: 0, y: 0 })]
    expect(overlap(a, far)).toBeLessThan(MATCH_AT.simple)
  })
})

describe('missions', () => {
  it('every depth has all five modes, in order', () => {
    for (const mission of Object.values(MISSIONS)) {
      expect(mission.map((p) => p.mode)).toEqual([...MODES])
    }
  })

  it('every target is reachable with the controls and the start is not already right', () => {
    for (const [depth, mission] of Object.entries(MISSIONS) as [
      keyof typeof MATCH_AT,
      Puzzle[],
    ][]) {
      for (const puzzle of mission) {
        if (puzzle.mode !== 'match' && puzzle.mode !== 'light') continue
        expect(matches(puzzle, puzzle.start, depth)).toBe(false)
        let scene = puzzle.start
        for (const control of puzzle.controls) {
          const goal = controlValue(puzzle.target, control)
          const { min, max, step } = CONTROL_RANGE[control]
          expect(goal).toBeGreaterThanOrEqual(min)
          expect(goal).toBeLessThanOrEqual(max)
          expect(Math.abs(goal / step - Math.round(goal / step))).toBeLessThan(1e-9)
          // following the hints step by step reaches it
          let guard = 0
          while (hintFor({ ...puzzle, controls: [control] }, scene) && guard < 100) {
            const hint = hintFor({ ...puzzle, controls: [control] }, scene)!
            scene = withControl(
              scene,
              control,
              controlValue(scene, control) + (hint.up ? step : -step),
            )
            guard += 1
          }
        }
        expect(matches(puzzle, scene, depth)).toBe(true)
        // the target shadow stays on the wall
        for (const [x, y] of sceneShadow(puzzle.shape, puzzle.target)) {
          expect(Math.abs(x)).toBeLessThanOrEqual(WALL_HALF + 0.5)
          expect(Math.abs(y)).toBeLessThanOrEqual(WALL_HALF + 0.5)
        }
        // the light-only puzzle never moves the object
        if (puzzle.mode === 'light') {
          expect(puzzle.controls.every((c) => c.startsWith('light'))).toBe(true)
          expect(puzzle.target.at).toEqual(puzzle.start.at)
        }
      }
    }
  })

  it('a build is right only with the right pieces in the right places', () => {
    for (const mission of Object.values(MISSIONS)) {
      const build = mission.find((p) => p.mode === 'build')!
      if (build.mode !== 'build') continue
      expect(buildMatches(build, build.target)).toBe(true)
      expect(
        buildMatches(
          build,
          build.target.map(() => null),
        ),
      ).toBe(false)
      const swapped = [...build.target].reverse()
      if (JSON.stringify(swapped) !== JSON.stringify(build.target)) {
        expect(buildMatches(build, swapped)).toBe(false)
      }
      expect(buildShadow(build.slots, build.target)).toHaveLength(build.target.length)
    }
  })

  it('a detective case has exactly one set-up that makes the shown shadow', () => {
    for (const mission of Object.values(MISSIONS)) {
      const puzzle = mission.find((p) => p.mode === 'detective')!
      if (puzzle.mode !== 'detective') continue
      const shown = [sceneShadow(puzzle.shape, puzzle.scenes[puzzle.answer]!)]
      const fits = puzzle.scenes.filter(
        (scene) => overlap([sceneShadow(puzzle.shape, scene)], shown) > 0.9,
      )
      expect(fits).toHaveLength(1)
    }
  })

  it('views: the shown views tell the answer apart from every other option', () => {
    for (const mission of Object.values(MISSIONS)) {
      const puzzle = mission.find((p) => p.mode === 'views')!
      if (puzzle.mode !== 'views') continue
      expect(puzzle.options).toContain(puzzle.solid)
      for (const other of puzzle.options.filter((o) => o !== puzzle.solid)) {
        const same = puzzle.views.every(
          (view) => overlap([viewOf(other, view)], [viewOf(puzzle.solid, view)]) > 0.95,
        )
        expect(same).toBe(false)
      }
    }
    // every solid has a silhouette from every side
    for (const solid of SOLID_IDS)
      for (const view of VIEWS) expect(viewOf(solid, view).length).toBeGreaterThan(2)
  })
})

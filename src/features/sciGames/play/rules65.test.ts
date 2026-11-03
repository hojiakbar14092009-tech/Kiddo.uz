import { describe, expect, it } from 'vitest'
import { MAX_PROGRAM, ROBOT_LEVELS, runProgram, shortestSolution } from './robotRules'
import { balance, MAX_TILT, SCALE_ROUNDS, tilt, total } from './scaleRules'

describe('the magic scale', () => {
  it('levels out only at the same weight, leaning towards the heavier side', () => {
    expect(balance(5, [2, 3])).toBe('even')
    expect(balance(5, [2])).toBe('left')
    expect(balance(5, [3, 3])).toBe('right')
    expect(tilt(5, [2])).toBeGreaterThan(0)
    expect(tilt(5, [3, 3])).toBeLessThan(0)
    expect(tilt(9, [])).toBe(MAX_TILT)
    expect(total([1, 2, 3])).toBe(6)
  })

  it('asks for totals a young child can build', () => {
    for (const target of SCALE_ROUNDS) expect(target).toBeGreaterThanOrEqual(2)
    expect(Math.max(...SCALE_ROUNDS)).toBeLessThanOrEqual(10)
  })
})

describe('the robot programmer', () => {
  it('follows the arrows to the battery', () => {
    const level = ROBOT_LEVELS[0]!
    expect(runProgram(level, ['right', 'right']).outcome).toBe('win')
    expect(runProgram(level, ['right']).outcome).toBe('short')
    expect(runProgram(level, ['down'])).toMatchObject({ outcome: 'bump', bumpedAt: 0 })
  })

  it('bumps into rocks and stops on the battery', () => {
    const level = ROBOT_LEVELS[2]!
    expect(runProgram(level, ['right']).outcome).toBe('bump')
    expect(runProgram(level, ['up', 'up', 'right', 'right', 'right']).outcome).toBe('win')
  })

  it('every level can be solved, and they get longer', () => {
    const lengths = ROBOT_LEVELS.map(shortestSolution)
    for (const length of lengths) {
      expect(length).not.toBeNull()
      expect(length!).toBeLessThanOrEqual(MAX_PROGRAM)
    }
    expect(lengths[0]!).toBeLessThan(lengths[lengths.length - 1]!)
  })
})

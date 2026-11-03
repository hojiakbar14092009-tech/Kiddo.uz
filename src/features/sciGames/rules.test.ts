import { describe, expect, it } from 'vitest'
import { SCI_GAMES, sciGame } from './games'
import {
  FLOAT_THINGS,
  IRON_COUNT,
  MAGNET_THINGS,
  nextWaterStep,
  sciRun,
  WATER_STEPS,
} from './rules'

describe('science games', () => {
  it('has three games, each found by its id', () => {
    expect(SCI_GAMES.map((game) => game.id)).toEqual([
      'water',
      'magnet',
      'float',
      'scale',
      'robot',
      'train',
      'shop',
    ])
    expect(sciGame('magnet')?.path).toBe('/sci/magnet')
    expect(sciGame('nope')).toBeNull()
  })

  it('keeps real physics: iron sticks, light things float', () => {
    expect(IRON_COUNT).toBe(4)
    expect(MAGNET_THINGS.find((thing) => thing.id === 'apple')?.iron).toBe(false)
    expect(FLOAT_THINGS.find((thing) => thing.id === 'stone')?.floats).toBe(false)
    expect(FLOAT_THINGS.find((thing) => thing.id === 'duck')?.floats).toBe(true)
    // half float and half sink, so guessing one answer never wins
    expect(FLOAT_THINGS.filter((thing) => thing.floats)).toHaveLength(FLOAT_THINGS.length / 2)
  })

  it('walks the water cycle in order and stops at the end', () => {
    expect(nextWaterStep('sun')).toBe('steam')
    expect(nextWaterStep('river')).toBe('done')
    expect(nextWaterStep('done')).toBe('done')
    expect(WATER_STEPS[0]).toBe('sun')
  })

  it('records a run once a day, never more first tries than questions', () => {
    const run = sciRun(SCI_GAMES[2]!, 'r1', 'k', 6, 9)
    expect(run).toMatchObject({ activity: 'sci:float', strand: 'science', independent: 6 })
    expect(run.oncePerDay).toBe(true)
    expect(sciRun(SCI_GAMES[1]!, 'r2', 'k', 4, -2).independent).toBe(0)
  })
})

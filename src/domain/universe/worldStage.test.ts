import { describe, expect, it } from 'vitest'
import { stageIndex, starsToNextStage, worldStage, worldStars } from './worldStage'

const world = (stars: number[], comingSoon = false) => ({
  comingSoon,
  activities: stars.map((bestStars, index) => ({
    activity: `a${index}`,
    route: '/',
    labelKey: 'x',
    bestStars,
    open: true,
  })),
})

describe('world card stages', () => {
  it('grows from new to explorer, expert and master with the world’s own stars', () => {
    expect(worldStage(world([0, 0]))).toBe('new')
    expect(worldStage(world([1, 0]))).toBe('explorer')
    expect(worldStage(world([3, 0]))).toBe('expert') // half of 6
    expect(worldStage(world([3, 2]))).toBe('expert')
    expect(worldStage(world([3, 3]))).toBe('master')
    expect(worldStars(world([3, 2]))).toEqual({ have: 5, max: 6 })
  })

  it('a world coming soon (or without activities) stays new', () => {
    expect(worldStage(world([3, 3], true))).toBe('new')
    expect(worldStage(world([]))).toBe('new')
    expect(starsToNextStage(world([3, 3], true))).toBeNull()
  })

  it('says how many stars the next stage needs', () => {
    expect(starsToNextStage(world([0, 0, 0]))).toBe(1)
    expect(starsToNextStage(world([1, 0, 0]))).toBe(4) // 5 of 9 is half
    expect(starsToNextStage(world([3, 2, 0]))).toBe(4)
    expect(starsToNextStage(world([3, 3, 3]))).toBeNull()
    expect(stageIndex('master')).toBe(3)
  })

  it('counts at most three stars per activity', () => {
    expect(worldStars(world([7, -1]))).toEqual({ have: 3, max: 6 })
  })
})

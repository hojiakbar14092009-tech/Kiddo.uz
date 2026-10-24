import { afterEach, describe, expect, it } from 'vitest'
import { endGardenTrip, isOnGardenTrip, startGardenTrip } from './gardenTrip'

afterEach(() => endGardenTrip())

describe('garden trip', () => {
  it('belongs to the practice it started (and its reward screen), nowhere else', () => {
    const now = 1_000_000
    startGardenTrip('/learn/tales?from=garden', now)
    expect(isOnGardenTrip('/learn/tales', now)).toBe(true)
    expect(isOnGardenTrip('/learn/tales/rabbit-carrot', now)).toBe(true)
    expect(isOnGardenTrip('/learn/words', now)).toBe(false)
    expect(isOnGardenTrip('/reward', now)).toBe(false)
    startGardenTrip('/tasks/find-letter?from=garden', now)
    expect(isOnGardenTrip('/reward', now)).toBe(true)
    expect(isOnGardenTrip('/tasks/find-letter', now + 3 * 60 * 60 * 1000)).toBe(false)
    endGardenTrip()
    expect(isOnGardenTrip('/tasks/find-letter', now)).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { claim, crossesAnother, freeTargets, release } from './roamSpace'

describe('roaming robots', () => {
  it('never stand on the same card at the same time', () => {
    const a = document.createElement('li')
    const b = document.createElement('li')
    const c = document.createElement('li')
    const girl = Symbol('girl')
    const boy = Symbol('boy')

    claim(a, girl)
    expect(freeTargets([a, b, c], boy)).toEqual([b, c])
    // the girl moves on to another card, not the one she is on
    expect(freeTargets([a, b, c], girl)).toEqual([b, c])

    claim(b, boy)
    expect(freeTargets([a, b, c], girl)).toEqual([c])
    // with only two cards and both taken, the other one waits
    expect(freeTargets([a, b], girl)).toEqual([a])
    expect(freeTargets([b], girl)).toEqual([])

    release(boy)
    expect(freeTargets([a, b, c], girl)).toEqual([b, c])
    release(girl)
  })
})

describe('hopping past the other robot', () => {
  it('is avoided, in a row (desktop) and in a column (phone)', () => {
    const size = 100
    // in a row: the other robot stands between here and there
    expect(
      crossesAnother(
        { x: 0, y: 0 },
        { x: 600, y: 0 },
        [
          [
            { x: 300, y: 10 },
            { x: 300, y: 10 },
          ],
        ],
        size,
      ),
    ).toBe(true)
    // in a column: the other robot stands on the middle card
    expect(
      crossesAnother(
        { x: 0, y: 0 },
        { x: 0, y: 600 },
        [
          [
            { x: 20, y: 300 },
            { x: 20, y: 300 },
          ],
        ],
        size,
      ),
    ).toBe(true)
    // nobody in the way
    expect(
      crossesAnother(
        { x: 0, y: 0 },
        { x: 0, y: 600 },
        [
          [
            { x: 400, y: 300 },
            { x: 400, y: 300 },
          ],
        ],
        size,
      ),
    ).toBe(false)
    // two robots setting off towards each other would meet on the way
    expect(
      crossesAnother(
        { x: 0, y: 0 },
        { x: 600, y: 0 },
        [
          [
            { x: 600, y: 40 },
            { x: 0, y: 40 },
          ],
        ],
        size,
      ),
    ).toBe(true)
    // ending where the other one is counts too
    expect(
      crossesAnother(
        { x: 0, y: 0 },
        { x: 300, y: 0 },
        [
          [
            { x: 300, y: 0 },
            { x: 300, y: 0 },
          ],
        ],
        size,
      ),
    ).toBe(true)
  })
})

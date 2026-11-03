import { describe, expect, it } from 'vitest'
import { gazeOf } from './cameraWatcher'

const eyes = { leftEye: { x: 100, y: 100 }, rightEye: { x: 160, y: 100 } }

describe('gazeOf', () => {
  it('sees a face turned to the screen', () => {
    expect(gazeOf({ ...eyes, nose: { x: 132, y: 148 } })).toBe('screen')
  })

  it('sees no face, or a head turned aside, as looking away', () => {
    expect(gazeOf(null)).toBe('away')
    expect(gazeOf({ ...eyes, nose: { x: 160, y: 148 } })).toBe('away')
    expect(gazeOf({ ...eyes, nose: { x: 100, y: 148 } })).toBe('away')
  })

  it('sees a head bent far down (at the table) as looking away', () => {
    expect(gazeOf({ ...eyes, nose: { x: 130, y: 190 } })).toBe('away')
  })

  it('never divides by a face too small to measure', () => {
    expect(
      gazeOf({ leftEye: { x: 5, y: 5 }, rightEye: { x: 5, y: 5 }, nose: { x: 5, y: 9 } }),
    ).toBe('away')
  })
})

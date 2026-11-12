import { describe, expect, it } from 'vitest'
import {
  AWAY_FRAMES,
  CALIBRATION_FRAMES,
  FACE_LOST_MS,
  GazeFilter,
  gazeOf,
  nearestFace,
  type FacePoints,
} from './cameraWatcher'
import { allowsLookingDown } from './routes'

const eyes = { leftEye: { x: 100, y: 100 }, rightEye: { x: 160, y: 100 } }
/** A face whose nose tip sits `down` eye distances below the eyes and `side` to one side. */
const face = (down: number, side = 0): FacePoints => ({
  ...eyes,
  nose: { x: 130 + side * 60, y: 100 + down * 60 },
})
const free = { baseline: null, allowDown: false }

describe('gazeOf', () => {
  it('sees a face turned to the screen', () => {
    expect(gazeOf(face(0.6), free)).toBe('screen')
  })

  it('sees no face, or a head turned aside, as looking away', () => {
    expect(gazeOf(null, free)).toBe('away')
    expect(gazeOf(face(0.6, 0.5), free)).toBe('away')
    expect(gazeOf(face(0.6, -0.5), free)).toBe('away')
  })

  it('a head bent far down is away, except on a drawing screen', () => {
    expect(gazeOf(face(1.2), free)).toBe('away')
    expect(gazeOf(face(1.2), { baseline: null, allowDown: true })).toBe('screen')
    expect(allowsLookingDown('/trace/numbers/3')).toBe(true)
    expect(allowsLookingDown('/tasks/trace')).toBe(true)
    expect(allowsLookingDown('/math-lab')).toBe(false)
  })

  it('measures the tilt from the child’s own usual position (a tablet on the table)', () => {
    // seen from below, the nose sits high: away by the typical rule, fine for this child
    expect(gazeOf(face(0.2), free)).toBe('away')
    expect(gazeOf(face(0.2), { baseline: 0.2, allowDown: false })).toBe('screen')
  })

  it('never divides by a face too small to measure', () => {
    const tiny = { leftEye: { x: 5, y: 5 }, rightEye: { x: 5, y: 5 }, nose: { x: 5, y: 9 } }
    expect(gazeOf(tiny, free)).toBe('away')
  })
})

describe('GazeFilter', () => {
  it('learns the usual position from the first straight frames', () => {
    const filter = new GazeFilter(false)
    for (let n = 0; n < CALIBRATION_FRAMES; n += 1) filter.push(face(0.25), n * 350)
    expect(filter.baseline).toBeCloseTo(0.25)
    // from now on this child's straight look is "screen"
    expect(filter.push(face(0.25), 5_000)).toBe('screen')
  })

  it('a lost face waits before it counts (bad light, a hand in front)', () => {
    const filter = new GazeFilter(false)
    filter.push(face(0.6), 0)
    const lost = 350
    for (let at = lost; at < lost + FACE_LOST_MS; at += 350)
      expect(filter.push(null, at)).toBe('screen')
    let gaze: string = 'screen'
    for (let n = 0; n < AWAY_FRAMES; n += 1) gaze = filter.push(null, lost + FACE_LOST_MS + n * 350)
    expect(gaze).toBe('away')
  })

  it('needs several frames in a row to change its answer (one glance is not a drift)', () => {
    const filter = new GazeFilter(false)
    expect(filter.push(face(0.6, 0.6), 0)).toBe('screen')
    expect(filter.push(face(0.6), 350)).toBe('screen')
    expect(filter.push(face(0.6, 0.6), 700)).toBe('screen')
    expect(filter.push(face(0.6, 0.6), 1_050)).toBe('screen')
    expect(filter.push(face(0.6, 0.6), 1_400)).toBe('away')
  })
})

describe('nearestFace', () => {
  const landmarks = (scale: number) => {
    const points = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }))
    points[33] = points[133] = { x: 0.5 - 0.05 * scale, y: 0.4 }
    points[362] = points[263] = { x: 0.5 + 0.05 * scale, y: 0.4 }
    points[1] = { x: 0.5, y: 0.45 }
    return points
  }
  it('takes the closest face (the child, not a parent behind) in pixels', () => {
    const points = nearestFace([landmarks(1), landmarks(2)], 320, 240)
    expect(points!.rightEye.x - points!.leftEye.x).toBeCloseTo(-64)
    expect(nearestFace([], 320, 240)).toBeNull()
  })
})

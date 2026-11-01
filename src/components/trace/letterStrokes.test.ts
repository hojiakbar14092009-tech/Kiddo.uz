import { describe, expect, it } from 'vitest'
import { enAlphabet } from '@/content/alphabet/en'
import { ruAlphabet } from '@/content/alphabet/ru'
import { uzAlphabet } from '@/content/alphabet/uz'
import { letterTracePasses } from './letterScoring'
import { letterStrokes, STROKED_LETTERS } from './letterStrokes'
import { boardMetrics, guidePoints, scorePath } from './pathScoring'
import { densify, type Point } from './traceScoring'
import { resample, scaleStroke, type Stroke } from './paths'

const SIZE = 320
const { radius } = boardMetrics(SIZE)

/** A child's line along these strokes (pixels), a little wobbly. */
function drawAlong(strokes: readonly Stroke[], wobble = 0): Point[] {
  return strokes.flatMap((stroke, s) =>
    resample(scaleStroke(stroke, SIZE), 3).map((point, i) => ({
      x: point.x + Math.sin(i + s) * wobble,
      y: point.y + Math.cos(i * 1.3 + s) * wobble,
    })),
  )
}

const score = (letter: string, drawn: Point[]) =>
  scorePath(guidePoints(letterStrokes(letter)!, SIZE), drawn, radius)
const passes = (letter: string, drawn: Point[]) =>
  letterTracePasses(score(letter, drawn), letterStrokes(letter)!.length, 'done')

describe('letter strokes (Phase 42b)', () => {
  it('every capital of the Uzbek, Russian and English alphabets has strokes, inside the box', () => {
    for (const alphabet of [uzAlphabet, ruAlphabet, enAlphabet]) {
      for (const letter of alphabet.letters) {
        const strokes = letterStrokes(letter.upper)
        expect(strokes, `${alphabet.language} ${letter.upper}`).not.toBeNull()
        for (const stroke of strokes!) {
          expect(stroke.length).toBeGreaterThanOrEqual(2)
          for (const point of stroke) {
            expect(point.x).toBeGreaterThanOrEqual(0)
            expect(point.x).toBeLessThanOrEqual(100)
            expect(point.y).toBeGreaterThanOrEqual(0)
            expect(point.y).toBeLessThanOrEqual(100)
          }
        }
      }
    }
    expect(STROKED_LETTERS.length).toBeGreaterThan(60)
  })

  it('a letter written along its strokes counts, even a bit wobbly', () => {
    for (const letter of STROKED_LETTERS) {
      expect(passes(letter, drawAlong(letterStrokes(letter)!, radius * 0.4)), letter).toBe(true)
    }
  })

  it('another letter drawn on the board does not count (the D drawn as an A)', () => {
    const pairs: [string, string][] = [
      ['D', 'A'],
      ['R', 'L'],
      ['E', 'C'],
      ['B', 'V'],
      ['Ш', 'Н'],
      ['Ж', 'Х'],
      // close letters: one is part of the other, or nearly
      ['O', 'C'],
      ['C', 'O'],
      ['С', 'О'],
      ['P', 'R'],
      ['F', 'E'],
      ['L', 'E'],
    ]
    for (const [target, drawn] of pairs) {
      expect(passes(target, drawAlong(letterStrokes(drawn)!)), `${drawn} on ${target}`).toBe(false)
    }
  })

  it('half a letter does not count; a scribble over the whole board does not either', () => {
    const r = letterStrokes('R')!
    expect(passes('R', drawAlong(r.slice(0, 2)))).toBe(false)
    // a zigzag across the whole board covers much but lies mostly off the letter
    const zigzag: Point[] = []
    for (let row = 0; row < 12; row += 1) {
      const y = 20 + row * 25
      const from = { x: row % 2 ? SIZE - 10 : 10, y }
      const to = { x: row % 2 ? 10 : SIZE - 10, y: y + 25 }
      zigzag.push(from, ...densify(from, to, 3))
    }
    expect(passes('R', zigzag)).toBe(false)
  })

  it('a scribble kept inside the letter’s own box does not pass for a dense letter', () => {
    for (const letter of ['Ш', 'W', 'M', 'B', 'Ж', 'Sh']) {
      const scribble: Point[] = []
      for (let row = 0; row < 16; row += 1) {
        const y = SIZE * (0.12 + row * 0.048)
        const from = { x: row % 2 ? SIZE * 0.8 : SIZE * 0.2, y }
        const to = { x: row % 2 ? SIZE * 0.2 : SIZE * 0.8, y: y + SIZE * 0.048 }
        scribble.push(from, ...densify(from, to, 3))
      }
      expect(passes(letter, scribble), letter).toBe(false)
    }
  })
})

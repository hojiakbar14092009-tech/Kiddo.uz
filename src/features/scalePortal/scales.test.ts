import { describe, expect, it } from 'vitest'
import i18n, { loadLanguage } from '@/i18n'
import { railOf, viewOf } from './camera'
import { comparisonText, everydaySize, powerText, sizeText } from './describe'
import { SCALE_DRAWINGS } from './drawings'
import { JUMPS, questionFor } from './questions'
import {
  AU_M,
  findStop,
  frameOf,
  LY_M,
  ratio,
  roundRatio,
  SCALE_STOPS,
  scientific,
  shownPower,
  tenSteps,
} from './scales'

/* Phase 33: one home for the science values, honest rounding, a fair guess every portal. */

describe('scale values', () => {
  it('follow the journey micro → galaxy, each bigger than the last, with a source', () => {
    expect(SCALE_STOPS.map((stop) => stop.step)).toEqual([
      'micro',
      'tiny object',
      'human',
      'building',
      'city',
      'Earth',
      'planets',
      'Sun',
      'Solar System',
      'galaxy',
    ])
    for (let i = 1; i < SCALE_STOPS.length; i += 1) {
      expect(SCALE_STOPS[i]!.sizeM).toBeGreaterThan(SCALE_STOPS[i - 1]!.sizeM)
    }
    for (const stop of SCALE_STOPS) {
      expect(stop.source.length).toBeGreaterThan(10)
      expect(SCALE_DRAWINGS[stop.id]).toBeTruthy()
    }
  })

  it('uses the exact astronomical unit and light-year', () => {
    expect(AU_M).toBe(149_597_870_700)
    expect(LY_M).toBe(9_460_730_472_580_800)
    expect(findStop('solar-system').sizeM / AU_M).toBeCloseTo(60.14, 1)
    expect(findStop('earth').sizeM).toBe(12_742_000)
    expect(findStop('tower').sizeM).toBe(375)
  })

  it('never says a ratio more precisely than the data', () => {
    expect(roundRatio(10.6)).toBe(11)
    expect(roundRatio(613.4)).toBe(600)
    expect(roundRatio(2_345_678)).toBe(2_000_000)
    expect(roundRatio(3.4)).toBe(3)
    expect(scientific(12_742_000)).toEqual({ mantissa: 1.3, exponent: 7 })
    expect(scientific(9.96e6)).toEqual({ mantissa: 1, exponent: 7 })
    expect(tenSteps(findStop('earth'), findStop('sun'))).toBe(2)
    expect(roundRatio(ratio(findStop('earth'), findStop('jupiter')))).toBe(11)
  })
})

describe('the rail', () => {
  it('maps evenly spaced stops onto the logarithmic camera and back', () => {
    SCALE_STOPS.forEach((stop, index) => {
      expect(viewOf(index)).toBeCloseTo(frameOf(stop), 6)
      expect(railOf(frameOf(stop))).toBeCloseTo(index, 6)
    })
    expect(railOf(viewOf(3.5))).toBeCloseTo(3.5, 6)
    expect(railOf(-100)).toBe(0)
    expect(railOf(100)).toBe(SCALE_STOPS.length - 1)
  })
})

describe('guess-first questions by age detail', () => {
  it('always include the right answer once, with distinct choices', () => {
    for (const detail of ['compare', 'ratio', 'magnitude', 'scientific'] as const) {
      for (let step = 0; step < JUMPS; step += 1) {
        const question = questionFor(step, detail)
        const keys = question.choices.map((choice) => JSON.stringify(choice))
        expect(new Set(keys).size).toBe(keys.length)
        expect(question.answer).toBeGreaterThanOrEqual(0)
        const right = question.choices[question.answer]!
        if (right.kind === 'stop') {
          expect(right.id).toBe(question.kind === 'bigger' ? question.to.id : question.from.id)
        } else if (right.kind === 'times') {
          expect(right.value).toBe(roundRatio(ratio(question.from, question.to)))
        } else if (right.kind === 'steps') {
          expect(right.value).toBe(Math.max(1, tenSteps(question.from, question.to)))
        } else {
          // a size whose estimates differ is asked only as a power of ten
          expect(right.exponent).toBe(
            question.to.rangeM ? shownPower(question.to) : scientific(question.to.sizeM).exponent,
          )
        }
        // no choice that makes no sense ("≈ 1 times", "0 steps")
        for (const choice of question.choices) {
          if (choice.kind === 'times') expect(choice.value).toBeGreaterThanOrEqual(2)
          if (choice.kind === 'steps') expect(choice.value).toBeGreaterThanOrEqual(1)
        }
      }
    }
  })

  it('the right value is not always the middle (or any fixed) one of the choices', () => {
    for (const detail of ['ratio', 'magnitude', 'scientific'] as const) {
      const rank = Array.from({ length: JUMPS }, (_, step) => {
        const q = questionFor(step, detail)
        const values = q.choices.map((c) =>
          c.kind === 'times' || c.kind === 'steps' ? c.value : c.kind === 'power' ? c.exponent : 0,
        )
        const sorted = [...values].sort((a, b) => a - b)
        return sorted.indexOf(values[q.answer]!)
      })
      expect(new Set(rank).size).toBeGreaterThan(1)
    }
  })

  it('steps of ten match the powers the screen shows', () => {
    for (let step = 0; step < JUMPS; step += 1) {
      const q = questionFor(step, 'magnitude')
      expect(tenSteps(q.from, q.to)).toBe(shownPower(q.to) - shownPower(q.from))
    }
    expect(tenSteps(findStop('child'), findStop('tower'))).toBe(3)
    expect(tenSteps(findStop('tower'), findStop('city'))).toBe(1)
  })

  it('the youngest compare pictures (no numbers); the right answer moves around', () => {
    const young = Array.from({ length: JUMPS }, (_, step) => questionFor(step, 'compare'))
    expect(young.every((q) => q.choices.every((c) => c.kind === 'stop'))).toBe(true)
    expect(new Set(young.map((q) => q.answer)).size).toBeGreaterThan(1)
  })
})

describe('how sizes are said', () => {
  it('everyday units, powers of ten and scientific notation', async () => {
    await loadLanguage('en')
    const t = i18n.getFixedT('en')
    expect(everydaySize(t, findStop('cell'), 'en')).toBe('≈ 8 micrometres')
    expect(everydaySize(t, findStop('earth'), 'en')).toBe('≈ 13\u202f000 km')
    expect(everydaySize(t, findStop('galaxy'), 'en')).toBe(
      '≈ 100\u202f000–200\u202f000 light-years',
    )
    expect(sizeText(t, findStop('cell'), 'compare', 'en')).toBe('')
    expect(sizeText(t, findStop('earth'), 'magnitude', 'en')).toBe('≈ 10⁷ m (≈ 13\u202f000 km)')
    expect(sizeText(t, findStop('earth'), 'scientific', 'en')).toBe('≈ 1.3 × 10⁷ m')
    expect(sizeText(t, findStop('galaxy'), 'scientific', 'en')).toBe(
      '≈ 10²¹ m (≈ 100\u202f000–200\u202f000 light-years)',
    )
    expect(everydaySize(t, findStop('solar-system'), 'en')).toBe('≈ 9 billion km')
    expect(sizeText(t, findStop('solar-system'), 'scientific', 'en')).toBe(
      '≈ 9 × 10¹² m · ≈ 60 AU (astronomical units)',
    )
    expect(powerText(1.3, 7, 'uz')).toBe('1,3 × 10⁷')
    expect(comparisonText(t, findStop('earth'), findStop('jupiter'), 'ratio', 'en')).toBe(
      'Jupiter is about 11 times bigger than Earth.',
    )
  })
})

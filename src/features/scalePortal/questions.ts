import type { ScaleDetail } from '@/domain/adaptive'
import {
  ratio,
  roundRatio,
  scientific,
  SCALE_STOPS,
  shownPower,
  tenSteps,
  type ScaleStop,
} from './scales'

/*
 * The guess-first moment before each portal jump: what the learner guesses
 * depends on how sizes are spoken about at their age (ScaleDetail). Pure and
 * deterministic: the same journey always asks the same things.
 */

export type ScaleChoice =
  | { kind: 'stop'; id: ScaleStop['id'] }
  | { kind: 'times'; value: number }
  | { kind: 'steps'; value: number }
  | { kind: 'power'; mantissa: number; exponent: number }

export interface ScaleQuestion {
  /** Jump from this stop to the next one. */
  from: ScaleStop
  to: ScaleStop
  kind: 'bigger' | 'smaller' | 'times' | 'steps' | 'power'
  choices: ScaleChoice[]
  answer: number
}

/** Where the right answer sits, by step: fixed but without a simple pattern. */
const SPOTS = [0, 1, 1, 0, 2, 1, 0, 2, 1, 0]

function placed<T>(right: T, others: T[], step: number): { choices: T[]; answer: number } {
  const spot = SPOTS[step % SPOTS.length]! % (others.length + 1)
  const choices = [...others.slice(0, spot), right, ...others.slice(spot)]
  return { choices, answer: spot }
}

/**
 * Three neighbouring values with the right one at the bottom, middle or top
 * (by step), so the answer is never "always the middle one". `valid` drops
 * values that make no sense (a ratio below 2, zero steps).
 */
function around(
  right: number,
  step: number,
  next: (value: number, up: boolean) => number,
  valid: (value: number) => boolean,
): { values: number[]; answer: number } {
  const below = [next(right, false), next(next(right, false), false)]
  const above = [next(right, true), next(next(right, true), true)]
  const wanted = SPOTS[step % SPOTS.length]! % 3
  // the right answer's place: 0 lowest, 1 middle, 2 highest (as far as valid values allow)
  for (const place of [wanted, 1, 0, 2]) {
    const low = below.slice(0, place).reverse()
    const high = above.slice(0, 2 - place)
    const values = [...low, right, ...high]
    if (values.every(valid)) return { values, answer: place }
  }
  return { values: [right, ...above], answer: 0 }
}

/** The question before jumping from stop `step` to stop `step + 1`. */
export function questionFor(step: number, detail: ScaleDetail): ScaleQuestion {
  const from = SCALE_STOPS[step]!
  const to = SCALE_STOPS[step + 1]!
  if (detail === 'compare') {
    // bigger / smaller with two pictures, both asked, the right one not always in one place
    const smaller = step % 3 === 1
    const right: ScaleChoice = { kind: 'stop', id: smaller ? from.id : to.id }
    const other: ScaleChoice = { kind: 'stop', id: smaller ? to.id : from.id }
    return { from, to, kind: smaller ? 'smaller' : 'bigger', ...placed(right, [other], step) }
  }
  if (detail === 'ratio') {
    const { values, answer } = around(
      roundRatio(ratio(from, to)),
      step,
      (value, up) => roundRatio(up ? value * 10 : value / 10),
      (value) => value >= 2,
    )
    return {
      from,
      to,
      kind: 'times',
      choices: values.map((value) => ({ kind: 'times', value })),
      answer,
    }
  }
  if (detail === 'magnitude') {
    const { values, answer } = around(
      tenSteps(from, to),
      step,
      (value, up) => value + (up ? 1 : -1),
      (value) => value >= 1,
    )
    return {
      from,
      to,
      kind: 'steps',
      choices: values.map((value) => ({ kind: 'steps', value })),
      answer,
    }
  }
  const size = scientific(to.sizeM)
  const exponent = to.rangeM ? shownPower(to) : size.exponent
  const mantissa = to.rangeM ? 1 : size.mantissa
  const { values, answer } = around(
    exponent,
    step,
    (value, up) => value + (up ? 2 : -2),
    () => true,
  )
  return {
    from,
    to,
    kind: 'power',
    choices: values.map((value) => ({ kind: 'power', mantissa, exponent: value })),
    answer,
  }
}

/** How many jumps a journey has (one fewer than its stops). */
export const JUMPS = SCALE_STOPS.length - 1

/** One finished journey through every portal (the central progression counts it). */
export const SCALE_ACTIVITY = 'scale-portal'

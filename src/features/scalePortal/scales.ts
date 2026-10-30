/*
 * Scale Portal (Phase 33): every scientific value in one place.
 *
 * Sizes are typical or rounded on purpose (a learner compares orders of
 * magnitude, not decimals), with the source each comes from. Nothing else in
 * the feature may hold a size or a unit constant.
 */

/** One astronomical unit, exactly (IAU 2012 Resolution B2), in metres. */
export const AU_M = 149_597_870_700
/** One light-year (IAU: a Julian year of light travel), in metres. */
export const LY_M = 9_460_730_472_580_800

export const SCALE_STOP_IDS = [
  'cell',
  'ant',
  'child',
  'tower',
  'city',
  'earth',
  'jupiter',
  'sun',
  'solar-system',
  'galaxy',
] as const
export type ScaleStopId = (typeof SCALE_STOP_IDS)[number]

export interface ScaleStop {
  id: ScaleStopId
  /** The journey's step: micro → tiny object → human → building → city → Earth → planets → Sun → Solar System → galaxy. */
  step: string
  /** Typical size across (metres), as precise as the comparison needs. */
  sizeM: number
  /** When estimates differ a lot, the honest range (metres). */
  rangeM?: readonly [number, number]
  /** How the size is best said to older learners: metres, AU or light-years. */
  unit: 'm' | 'au' | 'ly'
  /** Where the value comes from. */
  source: string
}

export const SCALE_STOPS: readonly ScaleStop[] = [
  {
    id: 'cell',
    step: 'micro',
    // a red blood cell is about 7–8 µm across
    sizeM: 8e-6,
    unit: 'm',
    source: 'Typical human red blood cell, 7–8 µm (standard physiology texts)',
  },
  {
    id: 'ant',
    step: 'tiny object',
    sizeM: 5e-3,
    unit: 'm',
    source: 'A common small ant, about 5 mm long (typical size)',
  },
  {
    id: 'child',
    step: 'human',
    sizeM: 1.2,
    unit: 'm',
    source: 'A child of about seven, about 1.2 m tall (typical height)',
  },
  {
    id: 'tower',
    step: 'building',
    sizeM: 375,
    unit: 'm',
    source: 'Tashkent Tower, 375 m to the spire',
  },
  {
    id: 'city',
    step: 'city',
    // rounded: a big city like Tashkent is a few tens of kilometres across
    sizeM: 3e4,
    unit: 'm',
    source: 'A big city such as Tashkent, about 30 km across (rounded)',
  },
  {
    id: 'earth',
    step: 'Earth',
    sizeM: 12_742e3,
    unit: 'm',
    source: 'NASA Earth fact sheet: mean diameter 12 742 km',
  },
  {
    id: 'jupiter',
    step: 'planets',
    sizeM: 142_984e3,
    unit: 'm',
    source: 'NASA Jupiter fact sheet: equatorial diameter 142 984 km',
  },
  {
    id: 'sun',
    step: 'Sun',
    sizeM: 1.3927e9,
    unit: 'm',
    source: 'NASA Sun fact sheet: diameter about 1 392 700 km',
  },
  {
    id: 'solar-system',
    step: 'Solar System',
    // across Neptune's orbit: twice its mean distance of about 30.07 AU
    sizeM: 2 * 30.07 * AU_M,
    unit: 'au',
    source: 'NASA Neptune fact sheet: semi-major axis 30.07 AU (orbit across, rounded)',
  },
  {
    id: 'galaxy',
    step: 'galaxy',
    // estimates of the Milky Way's stellar disk differ: about 100 000 to 200 000 light-years
    sizeM: 1e5 * LY_M,
    rangeM: [1e5 * LY_M, 2e5 * LY_M],
    unit: 'ly',
    source: 'Milky Way disk about 100 000–200 000 light-years (estimates differ)',
  },
]

export function findStop(id: ScaleStopId): ScaleStop {
  return SCALE_STOPS.find((stop) => stop.id === id)!
}

/** Orders of magnitude of a size (log10 of metres). */
export const magnitude = (sizeM: number) => Math.log10(sizeM)

/** How many times bigger b is than a. */
export const ratio = (a: ScaleStop, b: ScaleStop) => b.sizeM / a.sizeM

/** The power of ten a size is shown as (10⁷ m for Earth). */
export const shownPower = (stop: ScaleStop) => Math.round(magnitude(stop.sizeM))

/**
 * Whole steps of ×10 between two stops: the difference of the powers the
 * screen shows, so a learner who subtracts them is right.
 */
export const tenSteps = (a: ScaleStop, b: ScaleStop) => shownPower(b) - shownPower(a)

/**
 * A ratio said the way a person would: one or two significant figures
 * ("about 600", "about 30", "about 2 000 000"). Never more precise than the
 * rounded sizes behind it.
 */
export function roundRatio(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0
  if (value < 10) return Math.round(value)
  const digits = Math.floor(Math.log10(value))
  const unit = 10 ** (digits - (value < 100 ? 1 : 0))
  return Math.round(value / unit) * unit
}

/** Mantissa and exponent with two significant figures (1.3 × 10⁷). */
export function scientific(value: number): { mantissa: number; exponent: number } {
  const exponent = Math.floor(Math.log10(value))
  let mantissa = Math.round((value / 10 ** exponent) * 10) / 10
  if (mantissa >= 10) return { mantissa: 1, exponent: exponent + 1 }
  if (mantissa < 1) mantissa = 1
  return { mantissa, exponent }
}

/** The camera range of the journey (log10 metres the view spans). */
export const VIEW_MIN = magnitude(SCALE_STOPS[0]!.sizeM) - 0.6
export const VIEW_MAX = magnitude(SCALE_STOPS[SCALE_STOPS.length - 1]!.sizeM) + 0.6
/** The view that frames a stop: it fills a bit more than half the screen. */
export const frameOf = (stop: ScaleStop) => magnitude(stop.sizeM) + 0.25

import type { TFunction } from 'i18next'
import type { ScaleDetail } from '@/domain/adaptive'
import { formatNumber } from '@/features/mathLab/format'
import { tDynamic } from '@/lib/tDynamic'
import { AU_M, LY_M, ratio, roundRatio, scientific, tenSteps, type ScaleStop } from './scales'

/*
 * How a size and a comparison are said at each ScaleDetail. All numbers come
 * from scales.ts and are rounded here to what the learner needs (one or two
 * significant figures), never more precise than the data.
 */

const SUPER: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '-': '⁻',
}

export const superscript = (n: number) =>
  String(n)
    .split('')
    .map((ch) => SUPER[ch] ?? ch)
    .join('')

/** "1.3 × 10⁷" (a decimal comma where the language writes one). */
export function powerText(mantissa: number, exponent: number, language: string): string {
  const m =
    mantissa === 1 ? '' : `${String(mantissa).replace('.', language === 'en' ? '.' : ',')} × `
  return `${m}10${superscript(exponent)}`
}

/** A size with two significant figures (13 000 km, 1.4 million km, 8 µm). */
const round2 = (n: number) => {
  if (n >= 100 && n < 1000) return Math.round(n)
  if (n >= 100) {
    const unit = 10 ** (Math.floor(Math.log10(n)) - 1)
    return Math.round(n / unit) * unit
  }
  return Math.round(n * 10) / 10 >= 10 ? Math.round(n) : Math.round(n * 10) / 10
}

/** A size in everyday units: µm, mm, m, km, million km, light-years. */
export function everydaySize(t: TFunction, stop: ScaleStop, language: string): string {
  const m = stop.sizeM
  const n = (value: number) =>
    formatNumber(round2(value)).replace('.', language === 'en' ? '.' : ',')
  if (stop.unit === 'ly') {
    const [low, high] = stop.rangeM ?? [m, m]
    return t('scalePortal.units.lyRange', { low: n(low / LY_M), high: n(high / LY_M) })
  }
  if (m < 1e-3) return t('scalePortal.units.um', { n: n(m * 1e6) })
  if (m < 1) return t('scalePortal.units.mm', { n: n(m * 1e3) })
  if (m < 1e3) return t('scalePortal.units.m', { n: n(m) })
  if (m < 1e9) return t('scalePortal.units.km', { n: n(m / 1e3) })
  if (m < 1e12) return t('scalePortal.units.mkm', { n: n(m / 1e9) })
  return t('scalePortal.units.bkm', { n: n(m / 1e12) })
}

/** What the rail and the stop card say about a size, by detail. */
export function sizeText(
  t: TFunction,
  stop: ScaleStop,
  detail: ScaleDetail,
  language: string,
): string {
  if (detail === 'compare') return ''
  if (detail === 'ratio') return everydaySize(t, stop, language)
  const { mantissa, exponent } = scientific(stop.sizeM)
  if (detail === 'magnitude' || stop.rangeM) {
    // a size whose estimates differ a lot is only given as a power of ten (no false precision)
    return t('scalePortal.units.power', {
      power: powerText(1, Math.round(Math.log10(stop.sizeM)), language),
      everyday: everydaySize(t, stop, language),
    })
  }
  const metres = t('scalePortal.units.sci', { power: powerText(mantissa, exponent, language) })
  if (stop.unit === 'au')
    return `${metres} · ${t('scalePortal.units.au', { n: Math.round(stop.sizeM / AU_M) })}`
  if (stop.unit === 'ly') return `${metres} · ${everydaySize(t, stop, language)}`
  return metres
}

/** The comparison after a jump: how much bigger the new place is. */
export function comparisonText(
  t: TFunction,
  from: ScaleStop,
  to: ScaleStop,
  detail: ScaleDetail,
  language: string,
): string {
  const big = tDynamic(t, `scalePortal.stops.${to.id}.name`)
  const small = tDynamic(t, `scalePortal.stops.${from.id}.name`)
  if (detail === 'compare') return t('scalePortal.compare.bigger', { big, small })
  const times = roundRatio(ratio(from, to))
  if (detail === 'ratio')
    return t('scalePortal.compare.times', { big, small, n: formatNumber(times) })
  const steps = tenSteps(from, to)
  if (detail === 'magnitude') return t('scalePortal.compare.steps', { big, small, k: steps })
  return t('scalePortal.compare.power', {
    big,
    small,
    n: formatNumber(times),
    // the ratio itself in scientific notation (80 → 8 × 10¹), like the cards
    power: powerText(scientific(times).mantissa, scientific(times).exponent, language),
  })
}

/**
 * Big numbers (mastery, Phase 22) are written in groups of three from 10 000
 * up, with a narrow no-break space ("12 345"), the way Uzbek and Russian
 * schools write them and readable in English too. Ids and answers stay raw.
 */
export function formatNumber(n: number): string {
  if (!Number.isInteger(n) || Math.abs(n) < 10_000) return String(n)
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/** Digits of the longest number, to size big-number text so it fits a 320 px phone. */
export function digitsOf(values: readonly unknown[]): number {
  return Math.max(0, ...values.map((v) => (typeof v === 'number' ? String(Math.abs(v)).length : 0)))
}

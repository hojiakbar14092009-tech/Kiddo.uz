export type RandomSource = () => number

export function randomBetween(
  min: number,
  max: number,
  random: RandomSource = Math.random,
): number {
  return min + (max - min) * random()
}

export function pickRandom<T>(items: readonly T[], random: RandomSource = Math.random): T {
  if (items.length === 0) throw new Error('pickRandom: the list is empty')
  return items[Math.floor(random() * items.length)]!
}

/** Fisher–Yates shuffle that returns a new array. */
export function shuffle<T>(items: readonly T[], random: RandomSource = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j]!, result[i]!]
  }
  return result
}

/** Small deterministic generator for tests and reproducible task sets. */
export function seededRandom(seed: number): RandomSource {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

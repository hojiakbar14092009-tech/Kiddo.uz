/** Small randomness helpers for question generators. Pass `rng` in tests for repeatable results. */

export type Rng = () => number

/** A repeatable random generator (mulberry32) for tests. */
export function seeded(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randomInt(min: number, max: number, rng: Rng = Math.random): number {
  return min + Math.floor(rng() * (max - min + 1))
}

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

export function pick<T>(items: readonly T[], rng: Rng = Math.random): T {
  if (items.length === 0) throw new Error('pick from an empty list')
  return items[Math.floor(rng() * items.length)]!
}

/** `count` different items (or all of them when there are fewer). */
export function sample<T>(items: readonly T[], count: number, rng: Rng = Math.random): T[] {
  return shuffle(items, rng).slice(0, count)
}

/**
 * Answer options for a question: exactly one correct answer, the rest
 * different from it and from each other, in a random order (so the right one
 * is not always in the same place). Throws when there are not enough
 * distractors – a generator bug, never something to show a child.
 */
export function makeOptions<T>(
  correct: T,
  distractors: readonly T[],
  count: number,
  rng: Rng = Math.random,
  key: (value: T) => string = (value) => String(value),
): T[] {
  const seen = new Set([key(correct)])
  const others: T[] = []
  for (const candidate of shuffle(distractors, rng)) {
    const id = key(candidate)
    if (seen.has(id)) continue
    seen.add(id)
    others.push(candidate)
    if (others.length === count - 1) break
  }
  if (others.length < count - 1) throw new Error('not enough different answer options')
  return shuffle([correct, ...others], rng)
}

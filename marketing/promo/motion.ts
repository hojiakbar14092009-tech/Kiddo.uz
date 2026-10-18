/** Pure timing helpers: every value on screen is a function of the clip time. */

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k

/** 0 → 1 as t goes from a to b. */
export const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a))

export const easeOutCubic = (k: number) => 1 - (1 - k) ** 3
export const easeInCubic = (k: number) => k ** 3
export const easeInOutCubic = (k: number) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2)
export const easeOutBack = (k: number, s = 1.9) => 1 + (s + 1) * (k - 1) ** 3 + s * (k - 1) ** 2
export const easeOutQuint = (k: number) => 1 - (1 - k) ** 5

/** A damped spring that settles at 1, starting at time `start`. */
export function spring(t: number, start: number, freq = 14, damping = 6) {
  const x = t - start
  if (x <= 0) return 0
  return 1 - Math.exp(-damping * x) * Math.cos(freq * x)
}

/** Deterministic pseudo-random numbers, so every render of a frame is identical. */
export function rand(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

/** A hop along a parabola from a to b, peaking `height` above the higher end. */
export function hop(k: number, a: [number, number], b: [number, number], height: number) {
  const x = lerp(a[0], b[0], k)
  const top = Math.min(a[1], b[1]) - height
  // quadratic through a (k=0), top (k=0.5) and b (k=1)
  const y = (1 - k) * (1 - 2 * k) * a[1] + 4 * k * (1 - k) * top + k * (2 * k - 1) * b[1]
  return [x, y] as const
}

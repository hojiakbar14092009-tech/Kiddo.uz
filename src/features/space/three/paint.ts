/*
 * Procedural planet surfaces painted on a canvas (equirectangular maps, so
 * they wrap a sphere with no seam). Everything is drawn from a fixed seed, so
 * the app and the rendered pictures always show the same planets.
 */

export type Painter = (width: number, height: number) => HTMLCanvasElement

type Rgb = readonly [number, number, number]

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Value noise that repeats every `period` cells across (so the map wraps). */
function periodicNoise(seed: number, period: number, rows: number) {
  const random = rng(seed)
  const grid = Array.from({ length: (rows + 1) * period }, random)
  const at = (x: number, y: number) =>
    grid[(Math.min(rows, Math.max(0, y)) * period + (((x % period) + period) % period)) | 0]!
  return (u: number, v: number) => {
    const x = u * period
    const y = v * rows
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const fx = x - x0
    const fy = y - y0
    const sx = fx * fx * (3 - 2 * fx)
    const sy = fy * fy * (3 - 2 * fy)
    const top = at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx
    const bottom = at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx
    return top * (1 - sy) + bottom * sy
  }
}

/** Fractal noise in 0..1, wrapping across u. */
function fbm(seed: number, base = 4, octaves = 5) {
  const layers = Array.from({ length: octaves }, (_, i) =>
    periodicNoise(seed + i * 101, base * 2 ** i, Math.max(2, (base * 2 ** i) / 2)),
  )
  return (u: number, v: number) => {
    let sum = 0
    let amp = 0.5
    let norm = 0
    for (const layer of layers) {
      sum += layer(u, v) * amp
      norm += amp
      amp *= 0.5
    }
    return sum / norm
  }
}

const mix = (a: Rgb, b: Rgb, t: number): Rgb => {
  const k = Math.min(1, Math.max(0, t))
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
}

const hex = (value: string): Rgb => [
  parseInt(value.slice(1, 3), 16),
  parseInt(value.slice(3, 5), 16),
  parseInt(value.slice(5, 7), 16),
]

/** A colour ramp: stops in 0..1. */
function ramp(stops: readonly (readonly [number, string])[]) {
  const parsed = stops.map(([at, color]) => [at, hex(color)] as const)
  return (t: number): Rgb => {
    if (t <= parsed[0]![0]) return parsed[0]![1]
    for (let i = 1; i < parsed.length; i += 1) {
      const [at, color] = parsed[i]!
      const [prevAt, prevColor] = parsed[i - 1]!
      if (t <= at) return mix(prevColor, color, (t - prevAt) / (at - prevAt))
    }
    return parsed[parsed.length - 1]![1]
  }
}

function canvas(width: number, height: number) {
  const element = document.createElement('canvas')
  element.width = width
  element.height = height
  return element
}

/** Paints every pixel from (u, v) → colour (+ alpha). */
function pixels(
  width: number,
  height: number,
  shade: (u: number, v: number) => Rgb | readonly [number, number, number, number],
) {
  const element = canvas(width, height)
  const context = element.getContext('2d')!
  const image = context.createImageData(width, height)
  for (let y = 0; y < height; y += 1) {
    const v = (y + 0.5) / height
    for (let x = 0; x < width; x += 1) {
      const color = shade((x + 0.5) / width, v)
      const i = (y * width + x) * 4
      image.data[i] = color[0]
      image.data[i + 1] = color[1]
      image.data[i + 2] = color[2]
      image.data[i + 3] = color.length === 4 ? color[3] : 255
    }
  }
  context.putImageData(image, 0, 0)
  return element
}

/** Round craters with a dark floor and a light rim, drawn in map space. */
function craters(element: HTMLCanvasElement, seed: number, count: number, maxSize: number) {
  const context = element.getContext('2d')!
  const random = rng(seed)
  const { width, height } = element
  for (let i = 0; i < count; i += 1) {
    const x = random() * width
    const y = height * (0.12 + random() * 0.76)
    const r = (0.25 + random() ** 2 * 0.75) * maxSize * width
    // map stretch near the poles: craters get wider there
    const stretch = 1 / Math.max(0.35, Math.sin((y / height) * Math.PI))
    for (const dx of [-width, 0, width]) {
      context.save()
      context.translate(x + dx, y)
      context.scale(stretch, 1)
      const floor = context.createRadialGradient(0, 0, 0, 0, 0, r)
      floor.addColorStop(0, 'rgba(0,0,0,0.26)')
      floor.addColorStop(0.72, 'rgba(0,0,0,0.18)')
      floor.addColorStop(0.86, 'rgba(255,255,255,0.22)')
      floor.addColorStop(1, 'rgba(255,255,255,0)')
      context.fillStyle = floor
      context.beginPath()
      context.arc(0, 0, r, 0, Math.PI * 2)
      context.fill()
      context.restore()
    }
  }
  return element
}

const latitude = (v: number) => Math.abs(v - 0.5) * 2

export const paintSun: Painter = (w, h) => {
  const n = fbm(11, 8, 5)
  const color = ramp([
    [0, '#F08A1C'],
    [0.45, '#FFB627'],
    [0.7, '#FFD55A'],
    [1, '#FFF2B0'],
  ])
  return pixels(w, h, (u, v) => color(n(u, v) * 1.15 - 0.05))
}

export const paintMercury: Painter = (w, h) => {
  const n = fbm(21, 6, 5)
  const color = ramp([
    [0, '#6E6863'],
    [0.5, '#9C958E'],
    [1, '#CFC8C0'],
  ])
  return craters(
    pixels(w, h, (u, v) => color(n(u, v))),
    22,
    90,
    0.035,
  )
}

export const paintVenus: Painter = (w, h) => {
  const warp = fbm(31, 3, 4)
  const n = fbm(32, 4, 5)
  const color = ramp([
    [0, '#C98E3F'],
    [0.4, '#E3B66C'],
    [0.75, '#F2D59B'],
    [1, '#FBEBC8'],
  ])
  return pixels(w, h, (u, v) => {
    const band = Math.sin((v + warp(u, v) * 0.35) * Math.PI * 7) * 0.5 + 0.5
    return color(band * 0.45 + n(u, v) * 0.55)
  })
}

export const paintEarth: Painter = (w, h) => {
  const land = fbm(41, 4, 6)
  const detail = fbm(42, 16, 3)
  const ocean = ramp([
    [0, '#0E3F8C'],
    [0.6, '#1E66C8'],
    [1, '#3E9BE6'],
  ])
  const ground = ramp([
    [0, '#3E9B3A'],
    [0.45, '#5DB847'],
    [0.75, '#8BAA4A'],
    [1, '#B59C62'],
  ])
  return pixels(w, h, (u, v) => {
    const lat = latitude(v)
    if (lat > 0.86 + detail(u, v) * 0.06) return [240, 248, 255]
    const height = land(u, v) - 0.04 * lat
    if (height > 0.575) return ground((height - 0.575) * 3.4 + detail(u, v) * 0.25)
    return ocean(height * 1.6 - 0.1)
  })
}

export const paintEarthClouds: Painter = (w, h) => {
  const n = fbm(43, 6, 5)
  return pixels(w, h, (u, v) => {
    const c = n(u, v)
    const alpha = Math.max(0, Math.min(1, (c - 0.58) * 4)) * 230
    return [255, 255, 255, alpha]
  })
}

export const paintMoon: Painter = (w, h) => {
  const n = fbm(51, 4, 5)
  const color = ramp([
    [0, '#7D7D86'],
    [0.5, '#A9A9B1'],
    [1, '#D9D9DE'],
  ])
  return craters(
    pixels(w, h, (u, v) => {
      // a few big dark "seas" like the real Moon
      const sea = n(u, v)
      return color(sea < 0.42 ? sea * 0.7 : sea)
    }),
    52,
    70,
    0.04,
  )
}

export const paintMars: Painter = (w, h) => {
  const n = fbm(61, 5, 5)
  const dark = fbm(62, 3, 3)
  const color = ramp([
    [0, '#8A2C12'],
    [0.4, '#C4461C'],
    [0.7, '#E0632A'],
    [1, '#F09058'],
  ])
  return pixels(w, h, (u, v) => {
    const lat = latitude(v)
    if (lat > 0.9 + n(u, v) * 0.05) return [250, 244, 238]
    return color(n(u, v) * 1.1 - Math.max(0, dark(u, v) - 0.55) * 1.6)
  })
}

export const paintJupiter: Painter = (w, h) => {
  const warp = fbm(71, 4, 4)
  const bands = ramp([
    [0, '#8A5A3C'],
    [0.2, '#C99B6D'],
    [0.35, '#F1DEC0'],
    [0.5, '#B07850'],
    [0.62, '#EBD3AE'],
    [0.78, '#A86E48'],
    [0.9, '#E7CDA4'],
    [1, '#9C6A4A'],
  ])
  const spot: Rgb = hex('#C8502E')
  return pixels(w, h, (u, v) => {
    const t = (v * 3.1 + warp(u, v) * 0.18) % 1
    let color = bands(t)
    // the Great Red Spot
    const dx = (u - 0.36) / 0.07
    const dy = (v - 0.6) / 0.04
    const d = dx * dx + dy * dy
    if (d < 1) color = mix(color, spot, (1 - d) * 1.4)
    return color
  })
}

export const paintSaturn: Painter = (w, h) => {
  const warp = fbm(81, 4, 3)
  const bands = ramp([
    [0, '#C9A86A'],
    [0.3, '#E8D2A0'],
    [0.5, '#D9BB7E'],
    [0.75, '#F2E2B8'],
    [1, '#C7A468'],
  ])
  return pixels(w, h, (u, v) => bands((v * 2.4 + warp(u, v) * 0.08) % 1))
}

/** Ring map: u runs from the inner edge (0) to the outer edge (1). */
export const paintSaturnRings: Painter = (w, h) => {
  const n = fbm(82, 32, 3)
  return pixels(w, h, (u) => {
    const gap = u > 0.6 && u < 0.66 // the Cassini gap
    const fade = Math.min(1, u * 6, (1 - u) * 8)
    const density = gap ? 0.08 : 0.55 + n(u, 0.5) * 0.45
    const color = mix(hex('#B79A6B'), hex('#F3E3BF'), n(u, 0.2))
    return [color[0], color[1], color[2], Math.round(255 * density * fade)]
  })
}

export const paintUranus: Painter = (w, h) => {
  const n = fbm(91, 3, 3)
  const color = ramp([
    [0, '#8FD3DE'],
    [0.5, '#A8E4EA'],
    [1, '#CDF3F4'],
  ])
  return pixels(w, h, (u, v) => color(n(u, v) * 0.5 + (1 - latitude(v)) * 0.35))
}

export const paintUranusRings: Painter = (w, h) =>
  pixels(w, h, (u) => {
    const line = Math.exp(-(((u - 0.55) / 0.05) ** 2)) + 0.6 * Math.exp(-(((u - 0.85) / 0.03) ** 2))
    return [210, 240, 245, Math.round(150 * Math.min(1, line))]
  })

export const paintNeptune: Painter = (w, h) => {
  const warp = fbm(101, 4, 4)
  const color = ramp([
    [0, '#1A2F8F'],
    [0.5, '#2D4FC4'],
    [1, '#5A86E8'],
  ])
  return pixels(w, h, (u, v) => {
    let c = color(Math.sin((v + warp(u, v) * 0.15) * Math.PI * 6) * 0.25 + 0.5)
    const dx = (u - 0.3) / 0.035
    const dy = (v - 0.62) / 0.022
    const d = dx * dx + dy * dy
    if (d < 1) c = mix(c, hex('#13205E'), (1 - d) * 0.9)
    return c
  })
}

/** Soft round glow (for the Sun's light). */
export const paintGlow: Painter = (w, h) => {
  const element = canvas(w, h)
  const context = element.getContext('2d')!
  const gradient = context.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
  gradient.addColorStop(0, 'rgba(255,224,120,1)')
  gradient.addColorStop(0.42, 'rgba(255,184,50,0.7)')
  gradient.addColorStop(0.62, 'rgba(255,150,40,0.25)')
  gradient.addColorStop(1, 'rgba(255,140,30,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, w, h)
  return element
}

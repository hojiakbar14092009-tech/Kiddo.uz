import type { Item, SceneDef, Story } from './story'

/*
 * The seven lessons of Phase 75, one scene per spoken line (see dialogue.json for the words).
 * Pictures are the app's own 3D art and a few emoji; shapes (a sack, a traffic light) are plain
 * rounded rectangles. Everything sits above y = 690, where the two storytellers stand.
 */

const A = (art: string, x: number, y: number, size: number, o: Partial<Item> = {}): Item => ({
  art,
  x,
  y,
  size,
  ...o,
})
const E = (emoji: string, x: number, y: number, size: number, o: Partial<Item> = {}): Item => ({
  emoji,
  x,
  y,
  size,
  ...o,
})
const R = (
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  o: Partial<Item> = {},
): Item => ({
  rect: { w, h, color, radius: Math.min(w, h) / 2 },
  x,
  y,
  size: 0,
  ...o,
})
const G = 'ground' as const
const ground = (items: Item[], extra: Partial<SceneDef> = {}): SceneDef => ({
  ground: G,
  groundTop: 900,
  items,
  ...extra,
})
const rain = (x: number, y: number, count = 5): Item[] =>
  Array.from({ length: count }, (_, i) => ({
    art: 'droplet',
    x: x - 60 + ((i * 53) % 120),
    y,
    to: [x - 60 + ((i * 53) % 120), y + 230] as [number, number],
    size: 38,
    loop: 40,
    at: i * 8,
    fade: true,
  }))
/** A round Uzbek tandoor bread (patir): golden rim, paler middle, the pressed pattern in the centre. */
const flat = (x: number, y: number, d: number, o: Partial<Item> = {}): Item[] => {
  const ring = (dd: number, color: string, extra: Partial<Item> = {}): Item =>
    R(x, y, dd, dd, color, { ...o, ...extra })
  const around = (n: number, r: number, dd: number, color: string, turn = 0) =>
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + turn
      return R(x + Math.cos(a) * d * r, y + Math.sin(a) * d * r, d * dd, d * dd, color, {
        ...o,
        grow: undefined,
      })
    })
  return [
    ring(d, '#c2791f'),
    ring(d * 0.9, '#e9ad4a'),
    ring(d * 0.5, '#f1c262'),
    ...around(12, 0.17, 0.035, '#b0691c'),
    ...around(14, 0.38, 0.03, '#fff1c9', 0.2),
    ...around(9, 0.29, 0.026, '#fff1c9', 0.5),
  ]
}

/** A combine harvester crossing the field (every part moves together). */
const combine = (x0: number, x1: number, y: number): Item[] => {
  const part = (item: Item): Item => ({ ...item, to: [item.x + (x1 - x0), item.y], loop: 120 })
  const r = (dx: number, dy: number, w: number, h: number, color: string, radius?: number) =>
    part({ ...R(x0 + dx, y + dy, w, h, color), ...(radius ? { rect: { w, h, color, radius } } : {}) })
  return [
    r(60, -10, 210, 120, '#f2b705', 28),
    r(100, -120, 100, 100, '#8fd3ff', 22),
    r(-70, 30, 36, 170, '#d9534f', 14),
    r(150, -90, 14, 150, '#c68a00', 6),
    r(0, 105, 100, 100, '#2f2f3a'),
    r(120, 120, 70, 70, '#2f2f3a'),
    r(0, 105, 40, 40, '#bdbdbd'),
    r(120, 120, 28, 28, '#bdbdbd'),
  ]
}
const ARROW = (x: number, y: number, delay = 0): Item => E('➡️', x, y, 90, { delay })

/** A traffic light: a dark box and three lamps, the lit one bright. */
const light = (x: number, y: number, lit: 'red' | 'yellow' | 'green', delay = 0): Item[] => [
  R(x, y, 150, 360, '#2b2b3a', { delay, rect: { w: 150, h: 360, color: '#2b2b3a', radius: 44 } }),
  E('🔴', x, y - 110, 100, { delay: delay + 4, opacity: lit === 'red' ? 1 : 0.22 }),
  E('🟡', x, y, 100, { delay: delay + 6, opacity: lit === 'yellow' ? 1 : 0.22 }),
  E('🟢', x, y + 110, 100, { delay: delay + 8, opacity: lit === 'green' ? 1 : 0.22 }),
]
const road = (items: Item[]): SceneDef => ({
  ground: 'none',
  items: [
    R(360, 800, 800, 180, '#4b4b58', { rect: { w: 800, h: 180, color: '#4b4b58', radius: 0 } }),
    ...[0, 1, 2, 3, 4].map((i) =>
      R(110 + i * 125, 800, 70, 14, '#f4f0e6', {
        rect: { w: 70, h: 14, color: '#f4f0e6', radius: 6 },
      }),
    ),
    ...items,
  ],
})

const CROSSING: SceneDef[] = [
  road([
    A('car', 80, 770, 150, { to: [640, 770], loop: 80 }),
    A('bus', 700, 840, 170, { to: [20, 840], loop: 110, at: 20 }),
    E('❓', 360, 400, 150, { delay: 6, float: 14 }),
  ]),
  ground([
    E('✋', 180, 420, 130),
    E('👀', 360, 420, 130, { delay: 10 }),
    E('👂', 540, 420, 130, { delay: 20 }),
  ]),
  ground([E('✋', 360, 440, 270, { grow: 1.12 }), A('sparkles', 560, 330, 90, { delay: 10 })]),
  ground([E('🤝', 360, 440, 230, { grow: 1.1 }), A('ball', 540, 800, 80, { delay: 8 })]),
  ground([
    E('👀', 300, 430, 240, { to: [420, 430], loop: 70 }),
    E('⬅️', 150, 560, 100, { delay: 4 }),
    E('➡️', 570, 560, 100, { delay: 30 }),
  ]),
  road([
    A('car', 40, 770, 150, { to: [700, 770], loop: 90 }),
    E('👀', 360, 420, 160, { delay: 4 }),
  ]),
  ground([E('👂', 360, 430, 250, { grow: 1.12 }), E('🔉', 540, 400, 110, { delay: 8 })]),
  road([
    E('👂', 250, 440, 170),
    A('car', 700, 790, 90, { to: [520, 790], loop: 90 }),
    E('🔉', 470, 640, 100, { delay: 6 }),
  ]),
  ground([...light(360, 440, 'red'), E('✋', 540, 460, 150, { delay: 14 })]),
  ground([...light(360, 440, 'green'), E('🚶', 540, 480, 150, { delay: 14 })]),
  ground([
    E('👀', 300, 430, 230, { to: [420, 430], loop: 60 }),
    E('⬅️', 150, 560, 90, { delay: 4 }),
    E('➡️', 570, 560, 90, { delay: 20 }),
  ]),
  road([
    E('🚶', 120, 740, 150, { to: [600, 740], loop: 120 }),
    E('🦓', 360, 560, 110, { delay: 8 }),
  ]),
  ground([
    E('✋', 150, 430, 130),
    E('👀', 300, 430, 130, { delay: 8 }),
    E('👂', 450, 430, 130, { delay: 16 }),
    E('🚶', 590, 430, 130, { delay: 24 }),
  ]),
  ground([...light(360, 430, 'red'), E('❓', 540, 360, 150, { delay: 10, float: 14 })]),
]

const BREAD: SceneDef[] = [
  ground([...flat(360, 420, 300), E('❓', 560, 280, 140, { delay: 8, float: 14 })]),
  ground([E('🌾', 360, 430, 300, { grow: 1.2 }), A('sparkles', 560, 300, 90, { delay: 10 })]),
  ground([
    E('🌾', 170, 650, 170),
    E('🌾', 360, 650, 170, { delay: 4 }),
    E('🌾', 550, 650, 170, { delay: 8 }),
    A('sun', 150, 230, 160),
    A('rain-cloud', 570, 240, 170),
    ...rain(570, 340),
  ]),
  ground([
    ...combine(140, 460, 560),
    E('🌾', 600, 690, 140, { delay: 6 }),
  ]),
  ground([
    E('🏭', 400, 420, 280),
    E('🌾', 100, 660, 100, { to: [300, 520], loop: 60, fade: true }),
  ]),
  ground([
    E('🌾', 200, 480, 140),
    ARROW(360, 480, 8),
    R(520, 480, 150, 190, '#f6efe0', {
      delay: 12,
      rect: { w: 150, h: 190, color: '#f6efe0', radius: 40 },
    }),
    E('🌾', 520, 480, 70, { delay: 16 }),
  ]),
  ground([
    E('🌾', 200, 480, 200),
    ARROW(360, 480, 8),
    R(520, 480, 150, 190, '#f6efe0', {
      delay: 12,
      rect: { w: 150, h: 190, color: '#f6efe0', radius: 40 },
    }),
    A('sparkles', 560, 330, 80, { delay: 18 }),
  ]),
  ground([
    R(210, 400, 130, 170, '#f6efe0', { rect: { w: 130, h: 170, color: '#f6efe0', radius: 36 } }),
    A('droplet', 360, 300, 70, { to: [360, 470], loop: 40, fade: true }),
    E('🥣', 470, 520, 240, { delay: 6 }),
  ]),
  ground([
    R(360, 520, 220, 220, '#f1dcb0', {
      grow: 1.15,
      rect: { w: 220, h: 220, color: '#f1dcb0', radius: 110 },
    }),
    E('🤲', 360, 680, 150, { delay: 6 }),
  ]),
  ground([
    R(360, 560, 280, 320, '#b5651d', { rect: { w: 280, h: 320, color: '#b5651d', radius: 120 } }),
    A('fire', 360, 640, 170, { delay: 6 }),
    E('👨‍🍳', 560, 400, 130, { delay: 12 }),
  ]),
  ground([
    R(360, 560, 280, 320, '#b5651d', { rect: { w: 280, h: 320, color: '#b5651d', radius: 120 } }),
    A('fire', 360, 650, 160),
    ...flat(360, 400, 180, { delay: 14, grow: 1.4 }),
    A('sparkles', 520, 320, 80, { delay: 24 }),
  ]),
  ground([
    E('🌾', 110, 480, 120),
    ARROW(215, 480, 6),
    R(320, 480, 100, 130, '#f6efe0', {
      delay: 10,
      rect: { w: 100, h: 130, color: '#f6efe0', radius: 30 },
    }),
    ARROW(425, 480, 14),
    E('🥣', 500, 480, 110, { delay: 18 }),
    ...flat(640, 480, 100, { delay: 26 }),
  ]),
  ground([
    ...flat(360, 420, 300, { grow: 1.08 }),
    A('sparkles', 180, 320, 90, { delay: 6 }),
    A('sparkles', 550, 300, 90, { delay: 10 }),
    E('💛', 360, 640, 110, { delay: 16, float: 10 }),
  ]),
  ground([...flat(360, 420, 260), E('❓', 360, 640, 150, { delay: 8, float: 14 })]),
]

const SOIL = '#8b5a2b'
const underground = (items: Item[]): SceneDef =>
  ground([
    R(360, 560, 520, 300, SOIL, { rect: { w: 520, h: 300, color: SOIL, radius: 34 } }),
    ...items,
  ])
const TREE: SceneDef[] = [
  ground([
    A('tree', 360, 400, 420, { grow: 1.1 }),
    E('❓', 580, 250, 130, { delay: 8, float: 14 }),
  ]),
  ground([A('chestnut', 360, 450, 150, { grow: 1.2 }), A('sparkles', 520, 330, 80, { delay: 8 })]),
  ground([
    A('chestnut', 360, 360, 110, { to: [360, 860], loop: 120 }),
    R(360, 905, 520, 50, SOIL, { rect: { w: 520, h: 50, color: SOIL, radius: 24 } }),
  ]),
  ground([
    A('sun', 170, 260, 200),
    A('rain-cloud', 550, 260, 200),
    ...rain(550, 370),
    A('chestnut', 360, 860, 70, { delay: 4 }),
  ]),
  underground([
    A('chestnut', 360, 470, 80),
    R(360, 590, 14, 170, '#eadcc0', {
      delay: 8,
      rect: { w: 14, h: 170, color: '#eadcc0', radius: 7 },
    }),
  ]),
  underground([
    A('chestnut', 360, 470, 80),
    R(360, 590, 14, 170, '#eadcc0', { rect: { w: 14, h: 170, color: '#eadcc0', radius: 7 } }),
    A('droplet', 360, 700, 44, { to: [360, 520], loop: 60, fade: true }),
    A('droplet', 400, 690, 40, { to: [400, 540], loop: 60, at: 28, fade: true }),
  ]),
  ground([E('🌱', 360, 560, 220, { grow: 1.35 }), A('sparkles', 540, 400, 80, { delay: 10 })]),
  ground([
    E('🌱', 300, 600, 240, { grow: 1.2 }),
    A('sun', 520, 260, 220),
    A('sparkles', 440, 380, 70, { delay: 10 }),
  ]),
  ground([
    E('🌱', 150, 740, 100),
    A('seedling', 340, 640, 190, { delay: 8 }),
    A('tree', 560, 520, 330, { delay: 16 }),
    E('⏳', 360, 290, 140, { delay: 4, float: 10 }),
  ]),
  ground([A('tree', 360, 400, 520, { delay: 2, grow: 1.08 })]),
  ground([
    A('tree', 360, 410, 470),
    A('bird', 230, 300, 110, { delay: 8, float: 16 }),
    A('nest', 460, 360, 90, { delay: 14 }),
  ]),
  ground([
    A('tree', 360, 410, 470),
    A('apple', 250, 430, 70, { delay: 6 }),
    A('apple', 440, 370, 70, { delay: 10 }),
    A('chestnut', 520, 600, 50, { to: [540, 860], loop: 70, fade: true }),
  ]),
  ground([
    A('chestnut', 110, 500, 100),
    ARROW(210, 500, 6),
    A('seedling', 320, 500, 130, { delay: 10 }),
    ARROW(430, 500, 14),
    A('tree', 580, 480, 200, { delay: 18 }),
  ]),
  ground([
    A('chestnut', 360, 450, 200, { grow: 1.1 }),
    E('❓', 360, 640, 150, { delay: 8, float: 14 }),
  ]),
]

const BAND = ['#ff4d4d', '#ff9f43', '#ffd43b', '#51cf66', '#5ec8ff', '#3b6cf6', '#9b5de5']
const stripes = (n: number): Item[] =>
  BAND.slice(0, n).map((color, i) =>
    R(360, 300 + i * 52, 480 - i * 14, 46, color, {
      delay: 4 + i * 5,
      rect: { w: 480 - i * 14, h: 46, color, radius: 23 },
    }),
  )
const RAINBOW: SceneDef[] = [
  ground([A('rainbow', 360, 420, 420), E('❓', 560, 250, 130, { delay: 8, float: 14 })]),
  ground([
    A('rain-cloud', 190, 300, 240),
    ...rain(190, 400),
    A('sun', 540, 260, 220, { delay: 20 }),
  ]),
  ground([
    A('sun', 360, 330, 300, { grow: 1.1 }),
    A('sparkles', 200, 250, 90, { delay: 8 }),
    A('sparkles', 520, 230, 90, { delay: 12 }),
  ]),
  ground([
    A('sun', 360, 400, 280),
    ...['🔴', '🟠', '🟡', '🟢', '🔵', '🟣'].map((c, i) =>
      E(
        c,
        360 + Math.cos((i / 6) * Math.PI * 2) * 210,
        400 + Math.sin((i / 6) * Math.PI * 2) * 210,
        70,
        { delay: 6 + i * 4 },
      ),
    ),
  ]),
  ground([A('sun', 130, 360, 170), ARROW(260, 440, 6), A('droplet', 450, 480, 260, { delay: 10 })]),
  ground([
    A('droplet', 270, 480, 250),
    ...['🔴', '🟠', '🟡', '🟢', '🔵', '🟣'].map((c, i) =>
      E(c, 520, 330 + i * 54, 60, { delay: 8 + i * 4 }),
    ),
  ]),
  ground(stripes(4)),
  ground(stripes(7)),
  ground([
    A('sun', 180, 290, 230),
    E('➕', 360, 300, 100, { delay: 6 }),
    A('rain-cloud', 540, 300, 230, { delay: 10 }),
    ...rain(540, 400),
  ]),
  ground([A('sun', 120, 650, 170), A('rainbow', 470, 400, 320, { delay: 8 })]),
  ground([
    A('rain-cloud', 480, 250, 220),
    ...rain(480, 350),
    A('rainbow', 470, 540, 190, { delay: 12 }),
  ]),
  ground([
    A('sun', 130, 480, 150),
    E('➕', 235, 480, 80, { delay: 6 }),
    A('droplet', 340, 480, 110, { delay: 10 }),
    ARROW(450, 480, 14),
    A('rainbow', 590, 470, 170, { delay: 18 }),
  ]),
  ground([
    A('rainbow', 360, 420, 440, { grow: 1.06 }),
    A('sparkles', 160, 280, 90, { delay: 6 }),
    A('sparkles', 570, 260, 90, { delay: 10 }),
    A('sparkles', 360, 190, 80, { delay: 14 }),
  ]),
  ground([A('rainbow', 360, 420, 360), E('❓', 360, 640, 150, { delay: 8, float: 14 })]),
]

const NIGHT = { dim: 0.7 }
const DAYCYCLE: SceneDef[] = [
  ground(
    [
      A('full-moon', 360, 300, 240),
      A('glowing-star', 150, 220, 70),
      A('glowing-star', 570, 260, 80, { delay: 6 }),
      E('❓', 360, 560, 130, { delay: 8, float: 14 }),
    ],
    NIGHT,
  ),
  ground([E('🌍', 360, 430, 320, { grow: 1.06 }), E('🔄', 540, 280, 100, { delay: 6, float: 8 })]),
  ground([E('🌍', 360, 420, 360, { grow: 1.08 })]),
  ground([E('🌍', 360, 430, 300), E('🔄', 360, 230, 100, { delay: 6, float: 8 })]),
  ground([
    A('sun', 360, 300, 300, { grow: 1.1 }),
    A('sparkles', 180, 450, 90, { delay: 8 }),
    A('sparkles', 560, 430, 90, { delay: 12 }),
  ]),
  ground([A('sun', 130, 440, 240), E('🌍', 450, 440, 300, { delay: 6 })]),
  ground([
    A('sun', 360, 260, 260),
    A('kite', 220, 400, 150, { delay: 6, float: 16 }),
    A('ball', 500, 800, 90, { delay: 10 }),
  ]),
  ground([E('🌍', 360, 440, 300)], { dim: 0.4 }),
  ground(
    [
      A('full-moon', 360, 300, 240),
      A('glowing-star', 160, 230, 70),
      A('glowing-star', 570, 250, 80, { delay: 6 }),
      E('💤', 360, 520, 150, { delay: 8, float: 12 }),
    ],
    NIGHT,
  ),
  ground([
    A('sun', 150, 420, 180),
    E('🔄', 360, 420, 110, { delay: 6 }),
    A('crescent-moon', 570, 420, 180, { delay: 10 }),
  ]),
  ground([A('clock', 360, 430, 300), E('2️⃣', 360, 640, 100), E('4️⃣', 440, 640, 100, { delay: 4 })]),
  ground([
    A('sun', 140, 420, 200),
    E('🌍', 500, 440, 260, { delay: 6 }),
    E('🔄', 500, 250, 90, { delay: 12 }),
  ]),
  ground([
    A('sun', 130, 480, 140),
    ARROW(235, 480, 6),
    A('crescent-moon', 340, 480, 140, { delay: 10 }),
    ARROW(445, 480, 14),
    A('sun', 560, 480, 140, { delay: 18 }),
  ]),
  ground([E('🌍', 360, 420, 300), E('❓', 360, 640, 150, { delay: 8, float: 14 })]),
]

const CALM: SceneDef[] = [
  ground([E('😠', 360, 420, 280), E('❓', 560, 280, 130, { delay: 8, float: 14 })]),
  ground([
    E('😠', 190, 430, 170),
    E('😢', 360, 430, 170, { delay: 6 }),
    E('😄', 530, 430, 170, { delay: 12 }),
    E('💛', 360, 260, 100, { delay: 16, float: 10 }),
  ]),
  ground([E('😡', 360, 400, 300), E('💓', 360, 620, 140, { delay: 6, float: 18 })]),
  ground([A('balloon', 360, 420, 260, { delay: 4 }), A('sparkles', 540, 300, 80, { delay: 12 })]),
  ground([E('🤚', 360, 480, 220), E('💚', 360, 300, 110, { delay: 8, float: 10 })]),
  ground([A('balloon', 360, 440, 150, { grow: 1.9, inPause: true }), E('👃', 560, 300, 100, { delay: 6 })]),
  ground([A('balloon', 360, 420, 400)]),
  ground([A('balloon', 360, 440, 400, { grow: 0.4, inPause: true }), E('👄', 560, 300, 100, { delay: 6 })]),
  ground([A('balloon', 360, 520, 150)]),
  ground([A('balloon', 360, 440, 150, { grow: 1.9, inPause: true })]),
  ground([A('balloon', 360, 440, 285, { grow: 0.53, inPause: true }), E('3️⃣', 570, 300, 110, { delay: 6 })]),
  ground([
    E('😊', 360, 420, 300, { grow: 1.06 }),
    A('sparkles', 180, 290, 90, { delay: 6 }),
    A('sparkles', 550, 280, 90, { delay: 10 }),
  ]),
  ground([E('🗣️', 360, 420, 230), E('❤️', 540, 330, 100, { delay: 8, float: 10 })]),
  ground([A('balloon', 360, 420, 260), E('❓', 360, 640, 150, { delay: 8, float: 14 })]),
]

const TEETH: SceneDef[] = [
  ground([E('😁', 360, 420, 320), E('❓', 570, 260, 130, { delay: 8, float: 14 })]),
  ground([
    E('🦷', 240, 430, 200),
    A('apple', 470, 430, 200, { delay: 6 }),
    E('✨', 360, 300, 90, { delay: 12 }),
  ]),
  ground([
    E('🦷', 360, 440, 300),
    A('cookie', 160, 560, 70, { delay: 6 }),
    A('cookie', 570, 580, 60, { delay: 10 }),
  ]),
  ground([
    A('candy', 190, 440, 170),
    E('🦠', 600, 300, 90, { to: [290, 430], loop: 60, fade: true }),
    E('🦠', 600, 560, 80, { to: [290, 450], loop: 60, at: 30, fade: true }),
  ]),
  ground([
    E('🦷', 360, 440, 300),
    R(390, 470, 60, 60, '#7b4a20', {
      delay: 10,
      rect: { w: 60, h: 60, color: '#7b4a20', radius: 30 },
    }),
    E('🦠', 540, 380, 80, { delay: 4, float: 14 }),
  ]),
  ground([
    E('🪥', 360, 420, 300, { to: [400, 420], loop: 40 }),
    E('🦠', 330, 560, 80, { to: [80, 560], loop: 60, fade: true }),
  ]),
  ground([
    E('🪥', 360, 440, 300),
    R(360, 340, 120, 32, '#ffffff', {
      delay: 8,
      rect: { w: 120, h: 32, color: '#ffffff', radius: 16 },
    }),
  ]),
  ground([E('🦷', 360, 440, 300), E('🪥', 300, 380, 200, { to: [430, 520], loop: 40 })]),
  ground([A('clock', 360, 430, 300), E('2️⃣', 570, 290, 150, { delay: 8 })]),
  ground([A('sun', 190, 420, 200), A('crescent-moon', 530, 420, 200, { delay: 8 })]),
  ground([E('🚰', 360, 440, 240), E('💦', 500, 560, 110, { delay: 8, float: 14 })]),
  ground([
    E('🦷', 360, 440, 320, { grow: 1.06 }),
    A('sparkles', 180, 300, 90, { delay: 6 }),
    A('sparkles', 550, 280, 90, { delay: 10 }),
    A('sparkles', 520, 560, 70, { delay: 14 }),
  ]),
  ground([E('🧑‍⚕️', 270, 430, 280), E('🦷', 520, 460, 180, { delay: 10 })]),
  ground([A('clock', 360, 430, 260), E('❓', 360, 640, 150, { delay: 8, float: 14 })]),
]

const sky = (top: string, bottom: string, accent: string) => ({ top, bottom, accent })

export const STORIES2: Record<string, Story> = {
  crossing: { theme: sky('#cfe8ff', '#f3fbff', '#e2552d'), hero: 'car', scenes: CROSSING },
  bread: {
    theme: sky('#ffe9b8', '#fff8e8', '#c97a1e'),
    hero: 'bread',
    heroItems: flat(360, 430, 320, { delay: 3 }),
    scenes: BREAD,
  },
  tree: { theme: sky('#c9f0b5', '#fbfff2', '#3f9a3a'), hero: 'tree', scenes: TREE },
  rainbow: { theme: sky('#bfe6ff', '#f6fbff', '#9b5de5'), hero: 'rainbow', scenes: RAINBOW },
  dayCycle: { theme: sky('#3a3f8f', '#8fb6ff', '#ffc93c'), hero: 'sun', scenes: DAYCYCLE },
  calm: { theme: sky('#d9f0ff', '#f5fbff', '#2f7fc4'), hero: 'balloon', scenes: CALM },
  teeth: {
    theme: sky('#d4f5ee', '#f6fffc', '#13917e'),
    hero: 'cloud',
    heroEmoji: '🦷',
    scenes: TEETH,
  },
}

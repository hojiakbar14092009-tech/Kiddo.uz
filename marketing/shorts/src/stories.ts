import { THEME } from './data'
import { STORIES2 } from './stories2'
import type { Item, SceneDef, Story } from './story'

/** Drops that fall (or rise) forever: `count` pictures spread over a width. */
const stream = (
  art: string,
  count: number,
  from: [number, number],
  to: [number, number],
  spread: number,
  size: number,
  loop: number,
): Item[] =>
  Array.from({ length: count }, (_, i) => ({
    art,
    x: from[0] + ((i * 97) % spread),
    y: from[1],
    to: [to[0] + ((i * 97) % spread), to[1]] as [number, number],
    size,
    loop,
    at: Math.round((i * loop) / count),
    fade: true,
  }))

const GRASS = { ground: 'ground', groundTop: 900 } as const
const SEA = { ground: 'sea', groundTop: 790 } as const

const WATER_SCENES: SceneDef[] = [
  // hook: rain on a grey day, a question
  {
    ...GRASS,
    dim: 0.15,
    items: [
      { art: 'rain-cloud', x: 360, y: 330, size: 340, delay: 2 },
      ...stream('droplet', 6, [250, 480], [250, 880], 220, 48, 40),
      { art: 'umbrella', x: 360, y: 800, size: 160, delay: 14 },
    ],
  },
  // ask: a question mark pops
  {
    ...GRASS,
    items: [
      { art: 'rain-cloud', x: 360, y: 330, size: 300, delay: 0 },
      { emoji: '❓', x: 360, y: 600, size: 170, delay: 6, float: 14 },
      { art: 'sparkles', x: 560, y: 380, size: 90, delay: 12 },
    ],
  },
  // sun: the sun warms the sea
  {
    ...SEA,
    items: [
      { art: 'sun', x: 360, y: 300, size: 300, delay: 2, grow: 1.12 },
      { art: 'sparkles', x: 250, y: 640, size: 90, delay: 18, float: 12 },
      { art: 'sparkles', x: 480, y: 600, size: 80, delay: 26, float: 12 },
    ],
  },
  // steam: warm water turns into steam
  {
    ...SEA,
    items: [
      { art: 'sun', x: 180, y: 230, size: 170 },
      ...stream('droplet', 6, [190, 780], [190, 330], 330, 74, 90),
    ],
  },
  // invisible: you cannot see it
  {
    ...SEA,
    items: [
      { art: 'sun', x: 180, y: 230, size: 170 },
      ...stream('droplet', 8, [170, 780], [170, 360], 380, 34, 64),
      { emoji: '🔍', x: 380, y: 520, size: 160, delay: 8, float: 14 },
    ],
  },
  // rise: up to the sky
  {
    ...SEA,
    items: [
      { art: 'cloud', x: 360, y: 250, size: 150, delay: 10, grow: 1.5 },
      ...stream('droplet', 6, [190, 790], [220, 300], 280, 60, 80),
    ],
  },
  // gather: cold, they come together
  {
    ...SEA,
    dim: 0.08,
    items: [
      { emoji: '❄️', x: 150, y: 250, size: 100, delay: 4, float: 12 },
      { emoji: '❄️', x: 590, y: 300, size: 84, delay: 10, float: 12 },
      { art: 'cloud', x: 360, y: 360, size: 210, delay: 6 },
      ...[0, 1, 2, 3, 4].map((i) => ({
        art: 'droplet',
        x: 120 + i * 120,
        y: 650 + (i % 2) * 60,
        to: [360, 380] as [number, number],
        size: 60,
        loop: 56,
        at: i * 9,
        fade: true,
      })),
    ],
  },
  // cloud: a cloud is born
  {
    ...SEA,
    items: [
      { art: 'cloud', x: 360, y: 360, size: 300, delay: 2, grow: 1.35 },
      { art: 'sparkles', x: 560, y: 260, size: 90, delay: 14 },
    ],
  },
  // heavy: it grows dark and heavy
  {
    ...GRASS,
    dim: 0.3,
    items: [
      { art: 'rain-cloud', x: 360, y: 330, size: 360, delay: 0, grow: 1.12 },
      ...stream('droplet', 5, [260, 520], [260, 880], 200, 46, 46).map((i) => ({
        ...i,
        at: (i.at ?? 0) + 30,
      })),
    ],
  },
  // rain: flowers drink
  {
    ...GRASS,
    dim: 0.2,
    items: [
      { art: 'rain-cloud', x: 360, y: 320, size: 380 },
      ...stream('droplet', 9, [190, 470], [190, 880], 340, 46, 36),
      { art: 'tulip', x: 360, y: 810, size: 150, delay: 8, grow: 1.3 },
      { art: 'blossom', x: 300, y: 870, size: 100, delay: 14, grow: 1.2 },
    ],
  },
  // mean: rain is the cloud's water
  {
    ...GRASS,
    items: [
      { art: 'rain-cloud', x: 360, y: 350, size: 340 },
      { art: 'droplet', x: 360, y: 560, to: [360, 780], size: 120, loop: 50, fade: true },
    ],
  },
  // river: the water runs to the river
  {
    ground: 'sea',
    groundTop: 900,
    items: [
      { art: 'mountain', x: 360, y: 520, size: 420, delay: 0 },
      ...stream('droplet', 4, [300, 440], [380, 890], 120, 50, 60),
    ],
  },
  // sea: the river carries it to the sea
  {
    ...SEA,
    items: [
      { art: 'boat', x: 360, y: 640, size: 210, delay: 4, float: 16 },
      { art: 'droplet', x: 40, y: 800, to: [330, 790], size: 80, loop: 70, fade: true },
      { art: 'droplet', x: 40, y: 830, to: [330, 830], size: 70, loop: 70, at: 35, fade: true },
    ],
  },
  // cycle: sea, cloud, rain, round and round
  {
    ...SEA,
    items: [
      { art: 'cloud', x: 360, y: 290, size: 190, delay: 0 },
      { art: 'rain-cloud', x: 540, y: 520, size: 170, delay: 14 },
      { art: 'droplet', x: 540, y: 700, size: 90, delay: 20 },
      { art: 'wave', x: 360, y: 680, size: 150, delay: 28 },
      { art: 'sun', x: 180, y: 520, size: 150, delay: 40 },
      { emoji: '🔄', x: 360, y: 500, size: 130, delay: 48, float: 6 },
    ],
  },
  // never: it never disappears
  {
    ...SEA,
    items: [
      { art: 'droplet', x: 360, y: 480, size: 250, delay: 2, grow: 1.15 },
      { emoji: '💙', x: 360, y: 700, size: 110, delay: 16, float: 10 },
      { art: 'sparkles', x: 190, y: 400, size: 90, delay: 10 },
      { art: 'sparkles', x: 540, y: 380, size: 90, delay: 14 },
    ],
  },
  // play: over to the game
  {
    ...GRASS,
    items: [
      { art: 'droplet', x: 360, y: 480, size: 270, delay: 2, grow: 1.1 },
      { emoji: '🎮', x: 360, y: 760, size: 150, delay: 12, float: 10 },
      { art: 'glowing-star', x: 190, y: 320, size: 90, delay: 8 },
      { art: 'glowing-star', x: 540, y: 340, size: 90, delay: 12 },
    ],
  },
]

export const STORIES: Record<string, Story> = {
  water: { theme: THEME.water!, hero: 'rain-cloud', scenes: WATER_SCENES },
  ...STORIES2,
}

/** Stories with a recorded voice (the rest play with music and subtitles only). */
export const VOICED: ReadonlySet<string> = new Set(['water'])

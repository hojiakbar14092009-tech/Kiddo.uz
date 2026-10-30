/*
 * World Card Evolution (Phase 28, full contract): what each Kiddo City
 * building looks like at each level — config only, drawn by BuildingScene.
 * A level changes the architecture (more and bigger buildings, towers,
 * domes), the environment (bare plot → lawn → path → plaza), the light
 * (day → golden hour → evening with lit windows and stars) and the
 * decorations (trees, lamps, flags). Level 1 and the top level must be
 * told apart at a glance even without any text.
 */

/** Architectural styles; each building uses one. */
export type ArchStyle =
  | 'academy'
  | 'library'
  | 'workshop'
  | 'school'
  | 'observatory'
  | 'spaceport'
  | 'castle'
  | 'greenhouse'
  | 'town'

export type Roof = 'flat' | 'gable' | 'dome' | 'cone' | 'saw' | 'slit-dome' | 'glass' | 'none'

/** One building block, in the 200 × 160 scene (ground at y = 124). */
export interface Part {
  x: number
  w: number
  h: number
  roof: Roof
  /** Stands on another part: its height from the ground. */
  base?: number
  /** Rows of windows. */
  windows?: number
  /** Columns along the front (a portico). */
  columns?: number
  /** A small flag on top. */
  flag?: boolean
  /** Drawn in the accent colour (towers, domes). */
  accent?: boolean
  /** A launch gantry (lattice) instead of a wall. */
  gantry?: boolean
}

export interface StyleLook {
  wall: string
  roof: string
  accent: string
  /** Parts per level 1–3 (level 0, the open plot, has none: only the emblem). */
  stages: readonly [readonly Part[], readonly Part[], readonly Part[]]
}

const academy: StyleLook = {
  wall: '#f4efe6',
  roof: '#5b7bd5',
  accent: '#e9a23b',
  stages: [
    [{ x: 66, w: 68, h: 34, roof: 'gable', windows: 1 }],
    [
      { x: 44, w: 112, h: 44, roof: 'flat', windows: 2 },
      { x: 76, w: 48, h: 30, roof: 'gable', columns: 4, base: 0 },
      { x: 84, w: 32, h: 16, roof: 'dome', base: 44, accent: true },
    ],
    [
      { x: 8, w: 46, h: 54, roof: 'cone', windows: 3 },
      { x: 146, w: 46, h: 54, roof: 'cone', windows: 3 },
      { x: 40, w: 120, h: 62, roof: 'flat', windows: 3 },
      { x: 70, w: 60, h: 40, roof: 'gable', columns: 6 },
      { x: 78, w: 44, h: 24, roof: 'dome', base: 62, accent: true, flag: true },
    ],
  ],
}

const library: StyleLook = {
  wall: '#fbe9d4',
  roof: '#b4543c',
  accent: '#6a4bc4',
  stages: [
    [{ x: 68, w: 64, h: 32, roof: 'gable', windows: 1 }],
    [
      { x: 46, w: 108, h: 42, roof: 'gable', windows: 2 },
      { x: 88, w: 24, h: 30, roof: 'cone', base: 42, accent: true },
    ],
    [
      { x: 14, w: 52, h: 50, roof: 'gable', windows: 2 },
      { x: 134, w: 52, h: 50, roof: 'gable', windows: 2 },
      { x: 50, w: 100, h: 66, roof: 'flat', windows: 3, columns: 5 },
      { x: 76, w: 48, h: 30, roof: 'dome', base: 66, accent: true, flag: true },
    ],
  ],
}

const workshop: StyleLook = {
  wall: '#e7eef3',
  roof: '#3f8f86',
  accent: '#f08a3c',
  stages: [
    [{ x: 64, w: 72, h: 30, roof: 'saw', windows: 1 }],
    [
      { x: 36, w: 128, h: 40, roof: 'saw', windows: 2 },
      { x: 140, w: 12, h: 34, roof: 'none', base: 40, accent: true },
    ],
    [
      { x: 10, w: 180, h: 46, roof: 'saw', windows: 2 },
      { x: 60, w: 80, h: 34, roof: 'glass', base: 46 },
      { x: 24, w: 12, h: 40, roof: 'none', base: 46, accent: true },
      { x: 164, w: 12, h: 40, roof: 'none', base: 46, accent: true },
    ],
  ],
}

const school: StyleLook = {
  wall: '#fff1d6',
  roof: '#d0574b',
  accent: '#2f8c74',
  stages: [
    [{ x: 66, w: 68, h: 32, roof: 'gable', windows: 1 }],
    [
      { x: 42, w: 116, h: 40, roof: 'gable', windows: 2 },
      { x: 88, w: 24, h: 30, roof: 'cone', base: 40, windows: 1 },
    ],
    [
      { x: 10, w: 64, h: 52, roof: 'gable', windows: 3 },
      { x: 126, w: 64, h: 52, roof: 'gable', windows: 3 },
      { x: 60, w: 80, h: 60, roof: 'flat', windows: 3, columns: 4 },
      { x: 86, w: 28, h: 40, roof: 'cone', base: 60, windows: 1, accent: true, flag: true },
    ],
  ],
}

const observatory: StyleLook = {
  wall: '#e9e6f6',
  roof: '#8a94b8',
  accent: '#4b56c8',
  stages: [
    [{ x: 74, w: 52, h: 24, roof: 'slit-dome' }],
    [
      { x: 50, w: 100, h: 34, roof: 'flat', windows: 1 },
      { x: 70, w: 60, h: 30, roof: 'slit-dome', base: 34, accent: true },
    ],
    [
      { x: 12, w: 52, h: 34, roof: 'slit-dome', windows: 1 },
      { x: 136, w: 52, h: 34, roof: 'slit-dome', windows: 1 },
      { x: 50, w: 100, h: 54, roof: 'flat', windows: 2 },
      { x: 62, w: 76, h: 40, roof: 'slit-dome', base: 54, accent: true, flag: true },
    ],
  ],
}

const spaceport: StyleLook = {
  wall: '#e3e8ef',
  roof: '#6b7a8f',
  accent: '#e8553f',
  stages: [
    [{ x: 120, w: 14, h: 52, roof: 'none', gantry: true }],
    [
      { x: 20, w: 76, h: 28, roof: 'glass', windows: 1 },
      { x: 128, w: 18, h: 84, roof: 'none', gantry: true, flag: true },
    ],
    [
      { x: 6, w: 92, h: 36, roof: 'glass', windows: 2 },
      { x: 108, w: 20, h: 108, roof: 'none', gantry: true, flag: true },
      { x: 160, w: 20, h: 80, roof: 'none', gantry: true },
      { x: 20, w: 40, h: 24, roof: 'dome', base: 36, accent: true },
    ],
  ],
}

const castle: StyleLook = {
  wall: '#efe4f7',
  roof: '#7c4fc2',
  accent: '#e7b43a',
  stages: [
    [{ x: 70, w: 60, h: 32, roof: 'gable', windows: 1 }],
    [
      { x: 52, w: 96, h: 44, roof: 'flat', windows: 2 },
      { x: 44, w: 24, h: 64, roof: 'cone', windows: 2, accent: true },
      { x: 132, w: 24, h: 64, roof: 'cone', windows: 2, accent: true },
    ],
    [
      { x: 30, w: 140, h: 56, roof: 'flat', windows: 3 },
      { x: 8, w: 30, h: 72, roof: 'cone', windows: 3, accent: true },
      { x: 162, w: 30, h: 72, roof: 'cone', windows: 3, accent: true },
      { x: 80, w: 40, h: 52, roof: 'cone', base: 56, windows: 2, flag: true },
    ],
  ],
}

const greenhouse: StyleLook = {
  wall: '#e6f4e1',
  roof: '#5aa469',
  accent: '#f2c14e',
  stages: [
    [{ x: 70, w: 60, h: 22, roof: 'glass' }],
    [
      { x: 40, w: 120, h: 30, roof: 'glass', windows: 1 },
      { x: 84, w: 32, h: 20, roof: 'glass', base: 30 },
    ],
    [
      { x: 6, w: 70, h: 34, roof: 'glass', windows: 1 },
      { x: 124, w: 70, h: 34, roof: 'glass', windows: 1 },
      { x: 56, w: 88, h: 46, roof: 'glass', windows: 1 },
      { x: 76, w: 48, h: 30, roof: 'dome', base: 46, accent: true, flag: true },
    ],
  ],
}

const town: StyleLook = {
  wall: '#f6ecdf',
  roof: '#c0704a',
  accent: '#3d8fd1',
  stages: [
    [{ x: 70, w: 60, h: 30, roof: 'gable', windows: 1 }],
    [
      { x: 40, w: 60, h: 40, roof: 'gable', windows: 2 },
      { x: 104, w: 56, h: 32, roof: 'gable', windows: 1 },
    ],
    [
      { x: 8, w: 56, h: 46, roof: 'gable', windows: 2 },
      { x: 136, w: 56, h: 46, roof: 'gable', windows: 2 },
      { x: 60, w: 80, h: 58, roof: 'flat', windows: 3 },
      { x: 88, w: 24, h: 36, roof: 'cone', base: 58, accent: true, flag: true },
    ],
  ],
}

export const STYLES: Record<ArchStyle, StyleLook> = {
  academy,
  library,
  workshop,
  school,
  observatory,
  spaceport,
  castle,
  greenhouse,
  town,
}

/** Each building's style; buildings not listed are a growing town square. */
const BUILDING_STYLE: Record<string, ArchStyle> = {
  'math-land': 'academy',
  'reading-house': 'library',
  'word-workshop': 'workshop',
  'writing-school': 'school',
  observatory: 'observatory',
  spaceport: 'spaceport',
  'story-library': 'castle',
  garden: 'greenhouse',
  'mistake-garden': 'greenhouse',
  'science-lab': 'observatory',
  'robot-workshop': 'workshop',
  museum: 'castle',
}

export function styleOf(buildingId: string | undefined): ArchStyle {
  return (buildingId && BUILDING_STYLE[buildingId]) || 'town'
}

/**
 * Buildings with a name for every level (i18n `city.stages.<id>.<level>`):
 * Small School → … → Grand Mathematics City.
 */
export const NAMED_STAGES: ReadonlySet<string> = new Set([
  'math-land',
  'reading-house',
  'word-workshop',
  'writing-school',
  'observatory',
  'spaceport',
  'story-library',
  'garden',
])

/** The light of each level: the sky gets richer, the top level is a lit evening. */
export interface Light {
  /** Sky gradient, top → bottom; null keeps the card's own tint. */
  sky: readonly [string, string] | null
  /** Lit windows and stars (evening). */
  evening: boolean
}

export const LIGHT: readonly Light[] = [
  { sky: null, evening: false },
  { sky: ['#cfe9ff', '#f3faff'], evening: false },
  { sky: ['#ffd59e', '#fff3df'], evening: false },
  { sky: ['#343a86', '#f0a46b'], evening: true },
]

/** The ground of each level: bare plot → lawn → lawn with a path → stone plaza. */
export type Ground = 'plot' | 'lawn' | 'path' | 'plaza'
export const GROUND: readonly Ground[] = ['plot', 'lawn', 'path', 'plaza']

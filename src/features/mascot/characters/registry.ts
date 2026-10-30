/*
 * The Kiddo mascot family (Phase 19): one registry for the ten 3D characters,
 * which page context each one guides, and how each one moves and feels.
 *
 * Models are real rigged 3D characters (GLB: skinned mesh, skeleton, named
 * animation clips, facial morph targets) built from code in tools/mascots and
 * optimised by scripts/mascots-optimize.mjs into public/mascots. Nothing here
 * loads a model: the registry is plain data, so routes and tests can read it
 * without three.js.
 */

export const MASCOT_IDS = [
  'kidobot',
  'astro',
  'dinoo',
  'ziyo',
  'lumi',
  'leafy',
  'melo',
  'pixel',
  'scribble',
  'story',
] as const

export type MascotId = (typeof MASCOT_IDS)[number]

export type RigFamily = 'robot-biped' | 'human-biped' | 'creature' | 'prop'

/** Where in Kiddo a mascot guides the child. */
export type MascotContext =
  | 'home'
  | 'space'
  | 'dinosaur'
  | 'uzbekistan'
  | 'light'
  | 'garden'
  | 'music'
  | 'workshop'
  | 'writing'
  | 'stories'

/** Shared animation commands every mascot understands (each plays its own way). */
export const GESTURES = [
  'idle',
  'idle_alt',
  'look_around',
  'wave',
  'point',
  'point_up',
  'nod',
  'shake_head',
  'celebrate',
  'jump',
  'think',
  'surprised',
  'encourage',
  'listen',
  'talk',
  'walk',
  'run',
  'turn',
  'sit',
  'sleep',
] as const

export type Gesture = (typeof GESTURES)[number]

/** A deterministic behaviour profile (no AI): how fast and how much a mascot moves. */
export interface Personality {
  /** Words for the docs and the lab ("helpful, curious, encouraging"). */
  traits: readonly string[]
  /** Playback speed of body clips (1 = as authored). */
  tempo: number
  /** How quickly a face changes, in ms (150–400). */
  blendMs: number
  /** Seconds between spontaneous idle gestures (min, max); none on calm pages. */
  idleEvery: readonly [number, number]
}

export interface MascotDefinition {
  id: MascotId
  /** Runtime asset, fetched only when this mascot is shown. */
  model: string
  /** Static picture shown when WebGL is missing, the model fails or the device is weak. */
  poster: string
  rigFamily: RigFamily
  contexts: readonly MascotContext[]
  face: 'screen' | 'organic'
  personality: Personality
  /**
   * Its own way to perform a shared gesture: clip names tried in order (the
   * first one the model has wins; the gesture's own name is the last try).
   */
  style: Partial<Record<Gesture, readonly string[]>>
  /** What it does when nothing happens, per context (Astro floats in space). */
  idleIn?: Partial<Record<MascotContext, string>>
  /** Materials that may pulse with light (emissive), by name suffix in the GLB. */
  glow: readonly string[]
  /** Clips during which the feet leave the ground (live contact shadow). */
  airborne: readonly string[]
}

const ROBOT_GLOW = ['glow', 'light']

function def(
  id: MascotId,
  rest: Omit<MascotDefinition, 'id' | 'model' | 'poster'>,
): MascotDefinition {
  return {
    id,
    model: `/mascots/${id}.glb`,
    poster: `/mascots/posters/${id}.webp`,
    ...rest,
  }
}

const AIR = ['celebrate', 'jump']

export const MASCOTS: Readonly<Record<MascotId, MascotDefinition>> = {
  kidobot: def('kidobot', {
    rigFamily: 'robot-biped',
    contexts: ['home'],
    face: 'screen',
    personality: {
      traits: ['helpful', 'curious', 'encouraging'],
      tempo: 1,
      blendMs: 220,
      idleEvery: [9, 16],
    },
    style: {},
    glow: ROBOT_GLOW,
    airborne: AIR,
  }),
  astro: def('astro', {
    rigFamily: 'robot-biped',
    contexts: ['space'],
    face: 'screen',
    personality: {
      traits: ['curious', 'adventurous', 'fascinated by space'],
      tempo: 0.95,
      blendMs: 260,
      idleEvery: [10, 18],
    },
    style: { point: ['point_up', 'point'], look_around: ['telescope', 'look_around'] },
    idleIn: { space: 'float' },
    glow: ROBOT_GLOW,
    airborne: [...AIR, 'float'],
  }),
  dinoo: def('dinoo', {
    rigFamily: 'creature',
    contexts: ['dinosaur'],
    face: 'organic',
    personality: {
      traits: ['playful', 'energetic', 'friendly'],
      tempo: 1.08,
      blendMs: 180,
      idleEvery: [8, 14],
    },
    style: {
      celebrate: ['happy_hop', 'celebrate'],
      encourage: ['tail_wag', 'encourage'],
      look_around: ['sniff', 'look_around'],
    },
    glow: [],
    airborne: [...AIR, 'happy_hop'],
  }),
  ziyo: def('ziyo', {
    rigFamily: 'human-biped',
    contexts: ['uzbekistan'],
    face: 'organic',
    personality: {
      traits: ['warm', 'knowledgeable', 'welcoming'],
      tempo: 0.95,
      blendMs: 300,
      idleEvery: [11, 18],
    },
    style: { wave: ['welcome', 'wave'], point: ['present', 'point'] },
    glow: [],
    airborne: AIR,
  }),
  lumi: def('lumi', {
    rigFamily: 'creature',
    contexts: ['light'],
    face: 'organic',
    personality: {
      traits: ['gentle', 'magical', 'observant'],
      tempo: 0.9,
      blendMs: 380,
      idleEvery: [12, 20],
    },
    style: { celebrate: ['illuminate', 'celebrate'], encourage: ['illuminate', 'encourage'] },
    idleIn: { light: 'hover' },
    glow: ['glow', 'glow_soft'],
    airborne: [...AIR, 'hover', 'illuminate'],
  }),
  leafy: def('leafy', {
    rigFamily: 'creature',
    contexts: ['garden'],
    face: 'organic',
    personality: {
      traits: ['calm', 'nurturing', 'cheerful'],
      tempo: 0.9,
      blendMs: 340,
      idleEvery: [12, 20],
    },
    style: {
      celebrate: ['bloom', 'celebrate'],
      encourage: ['leaf_flutter', 'encourage'],
      look_around: ['gardening', 'look_around'],
    },
    glow: [],
    airborne: [...AIR, 'bloom'],
  }),
  melo: def('melo', {
    rigFamily: 'robot-biped',
    contexts: ['music'],
    face: 'screen',
    personality: {
      traits: ['rhythmic', 'enthusiastic'],
      tempo: 1.05,
      blendMs: 200,
      idleEvery: [8, 14],
    },
    style: {
      celebrate: ['dance', 'celebrate'],
      listen: ['headphone_listen', 'listen'],
      idle_alt: ['rhythm', 'idle_alt'],
    },
    glow: [...ROBOT_GLOW, 'note', 'cheek'],
    airborne: AIR,
  }),
  pixel: def('pixel', {
    rigFamily: 'robot-biped',
    contexts: ['workshop'],
    face: 'screen',
    personality: {
      traits: ['practical', 'inventive', 'energetic'],
      tempo: 1.05,
      blendMs: 200,
      idleEvery: [9, 15],
    },
    style: {
      encourage: ['thumbs_up', 'encourage'],
      look_around: ['inspect', 'look_around'],
      idle_alt: ['wrench', 'idle_alt'],
    },
    glow: ROBOT_GLOW,
    airborne: AIR,
  }),
  scribble: def('scribble', {
    rigFamily: 'prop',
    contexts: ['writing'],
    face: 'organic',
    personality: {
      traits: ['creative', 'playful'],
      tempo: 1.05,
      blendMs: 200,
      idleEvery: [10, 16],
    },
    style: { idle_alt: ['draw', 'idle_alt'], encourage: ['write', 'encourage'] },
    glow: [],
    airborne: AIR,
  }),
  story: def('story', {
    rigFamily: 'prop',
    contexts: ['stories'],
    face: 'organic',
    personality: {
      traits: ['curious', 'expressive', 'storyteller'],
      tempo: 0.95,
      blendMs: 300,
      idleEvery: [11, 18],
    },
    style: {
      surprised: ['page_flutter', 'surprised'],
      point: ['present', 'point'],
      idle_alt: ['read', 'idle_alt'],
      encourage: ['storytell', 'encourage'],
    },
    glow: [],
    airborne: AIR,
  }),
}

export const DEFAULT_MASCOT: MascotId = 'kidobot'

/**
 * Which context a page belongs to, by route prefix (the first match wins, so
 * a longer prefix goes first). Everything else is the home context: KidoBot.
 * Config, not code: one table instead of `pathname === …` checks in pages.
 */
export const CONTEXT_ROUTES: readonly (readonly [prefix: string, context: MascotContext])[] = [
  ['/spaceport/mars', 'space'],
  ['/spaceport', 'workshop'],
  ['/learn/space', 'space'],
  ['/scale-portal', 'space'],
  ['/shadow-lab', 'light'],
  ['/worlds/dino', 'dinosaur'],
  ['/worlds/uzbekistan', 'uzbekistan'],
  ['/mistake-garden', 'garden'],
  ['/learn/garden', 'garden'],
  ['/science-lab', 'garden'],
  ['/alphabet', 'writing'],
  ['/tasks/trace', 'writing'],
  ['/tasks/find-letter', 'writing'],
  ['/studio', 'writing'],
  ['/learn/tales', 'stories'],
  ['/learn/words', 'stories'],
]

export function contextOf(pathname: string): MascotContext {
  for (const [prefix, context] of CONTEXT_ROUTES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return context
  }
  return 'home'
}

export function mascotFor(context: MascotContext): MascotId {
  return MASCOT_IDS.find((id) => MASCOTS[id].contexts.includes(context)) ?? DEFAULT_MASCOT
}

export function isMascotId(value: unknown): value is MascotId {
  return typeof value === 'string' && (MASCOT_IDS as readonly string[]).includes(value)
}

import type { ExplorerModelDef } from '@/components/explorer3d'
import { HOTSPOT_NAMESPACE } from './text'

/*
 * The six animals of the Dinosaur world as data. Their 3D models are built
 * from primitives in `models.ts`, which loads only when the 3D view opens
 * (three.js never reaches this page's chunk). The still pictures are renders
 * of the same models (scripts/render-dinos.mjs).
 */

export const DINO_IDS = [
  'trex',
  'triceratops',
  'stegosaurus',
  'brachiosaurus',
  'pteranodon',
  'ankylosaurus',
] as const
export type DinoId = (typeof DINO_IDS)[number]

export type Diet = 'plant' | 'meat' | 'fish'
export type Feature = 'horns' | 'neck' | 'plates' | 'club' | 'arms' | 'crest'

export interface DinoDef {
  id: DinoId
  diet: Diet
  /** Pteranodon is a flying reptile, not a dinosaur. */
  dinosaur: boolean
  flies: boolean
  /** Approximate adult length in metres (wingspan is not a length). */
  lengthM: number
  /** What it is known for, for "Who had …?" questions. */
  feature: Feature
  /** Free on every plan; the others need `premiumWorlds`. */
  free: boolean
  hotspots: readonly { id: string; position: readonly [number, number, number] }[]
}

export const DINOS: Record<DinoId, DinoDef> = {
  trex: {
    id: 'trex',
    diet: 'meat',
    dinosaur: true,
    flies: false,
    lengthM: 12,
    feature: 'arms',
    free: true,
    hotspots: [
      { id: 'teeth', position: [1.55, 0.86, 0.22] },
      { id: 'arms', position: [0.92, 0.18, 0.42] },
      { id: 'legs', position: [-0.02, -0.55, 0.5] },
    ],
  },
  triceratops: {
    id: 'triceratops',
    diet: 'plant',
    dinosaur: true,
    flies: false,
    lengthM: 9,
    feature: 'horns',
    free: true,
    hotspots: [
      { id: 'horns', position: [1.78, 0.92, 0.2] },
      { id: 'frill', position: [0.9, 1.12, 0.3] },
      { id: 'beak', position: [1.78, 0.12, 0.1] },
    ],
  },
  stegosaurus: {
    id: 'stegosaurus',
    diet: 'plant',
    dinosaur: true,
    flies: false,
    lengthM: 9,
    feature: 'plates',
    free: false,
    hotspots: [
      { id: 'plates', position: [0, 1.3, 0.15] },
      { id: 'spikes', position: [-1.95, 0.62, 0.35] },
      { id: 'head', position: [1.62, 0.06, 0.18] },
    ],
  },
  brachiosaurus: {
    id: 'brachiosaurus',
    diet: 'plant',
    dinosaur: true,
    flies: false,
    lengthM: 22,
    feature: 'neck',
    free: false,
    hotspots: [
      { id: 'neck', position: [1.12, 1.35, 0.26] },
      { id: 'legs', position: [0.66, -0.8, 0.46] },
      { id: 'tail', position: [-1.7, -0.2, 0.18] },
    ],
  },
  pteranodon: {
    id: 'pteranodon',
    diet: 'fish',
    dinosaur: false,
    flies: true,
    lengthM: 0,
    feature: 'crest',
    free: false,
    hotspots: [
      { id: 'wings', position: [0.2, 0.62, 1.3] },
      { id: 'crest', position: [-0.12, 0.48, 0.05] },
      { id: 'beak', position: [1.05, 0.08, 0.06] },
    ],
  },
  ankylosaurus: {
    id: 'ankylosaurus',
    diet: 'plant',
    dinosaur: true,
    flies: false,
    lengthM: 7,
    feature: 'club',
    free: false,
    hotspots: [
      { id: 'club', position: [-2.12, 0.12, 0.3] },
      { id: 'armour', position: [0, 0.58, 0.4] },
      { id: 'head', position: [1.38, 0.12, 0.25] },
    ],
  },
}

export const FREE_DINOS: readonly DinoId[] = DINO_IDS.filter((id) => DINOS[id].free)

export function isDinoId(value: unknown): value is DinoId {
  return typeof value === 'string' && (DINO_IDS as readonly string[]).includes(value)
}

/** The still picture of a model (public/3d/worlds/dino-<id>.webp). */
export function dinoStill(id: DinoId): string {
  return `/3d/worlds/dino-${id}.webp`
}

/** The Explorer's description of one animal; the builder loads with the 3D view only. */
function modelOf(id: DinoId): ExplorerModelDef {
  return {
    id: `dino-${id}`,
    still: dinoStill(id),
    load: () => import('./models').then((module) => module.dinoBuilder(id)),
    hotspots: DINOS[id].hotspots.map((spot) => ({
      id: spot.id,
      position: spot.position,
      labelKey: `${HOTSPOT_NAMESPACE}.${id}.${spot.id}`,
    })),
    distance: 5.4,
  }
}

export const DINO_MODELS: Record<DinoId, ExplorerModelDef> = {
  trex: modelOf('trex'),
  triceratops: modelOf('triceratops'),
  stegosaurus: modelOf('stegosaurus'),
  brachiosaurus: modelOf('brachiosaurus'),
  pteranodon: modelOf('pteranodon'),
  ankylosaurus: modelOf('ankylosaurus'),
}

import type { Performer } from '@/features/mascot/characters/registry'
import type { Mood } from './three/life'

/*
 * The story animals as real rigged 3D characters (Phase 78). Built from code in
 * tools/mascots/animals.py (Blender) and optimised into public/animals: the same
 * bones, shared clips and face morph targets as the mascots, so one controller
 * plays both. Plain data here: tests and the story content read it without three.js.
 *
 * Quadrupeds (rabbit, cat, dog, fox) sit upright at rest and walk on four legs
 * (the rabbit hops); the bear walks upright and the penguin waddles. Since
 * Phase 79 the elephant steps heavily and sprays with its trunk, the lion roars,
 * the turtle walks slowly, hops only a little and hides in its shell, the owl
 * turns its head and flies, the unicorn prances, the dinosaur stomps and roars.
 */

export const ANIMAL_IDS = [
  'rabbit',
  'cat',
  'dog',
  'fox',
  'bear',
  'penguin',
  // Phase 79
  'elephant',
  'lion',
  'turtle',
  'owl',
  'unicorn',
  'dinosaur',
] as const

export type AnimalId = (typeof ANIMAL_IDS)[number]

export function isAnimal(id: string): id is AnimalId {
  return (ANIMAL_IDS as readonly string[]).includes(id)
}

export function animalModel(id: AnimalId): string {
  return `/animals/${id}.glb`
}

const personality = (tempo: number) =>
  ({ traits: [], tempo, blendMs: 260, idleEvery: [0, 0] }) as Performer['personality']

/** How each animal performs (its own clips first, then the shared ones). */
export const ANIMALS: Readonly<Record<AnimalId, Performer>> = {
  rabbit: {
    id: 'animal-rabbit',
    personality: personality(1.05),
    style: { celebrate: ['happy_hop', 'celebrate'], jump: ['hop', 'jump'] },
    glow: [],
  },
  cat: {
    id: 'animal-cat',
    personality: personality(0.95),
    style: { look_around: ['stretch', 'look_around'] },
    glow: [],
  },
  dog: {
    id: 'animal-dog',
    personality: personality(1.1),
    style: { celebrate: ['happy_hop', 'celebrate'], encourage: ['tail_wag', 'encourage'] },
    glow: [],
  },
  fox: {
    id: 'animal-fox',
    personality: personality(1),
    style: { think: ['sniff', 'think'], encourage: ['tail_wag', 'encourage'] },
    glow: [],
  },
  bear: {
    id: 'animal-bear',
    personality: personality(0.9),
    style: { encourage: ['hug', 'encourage'] },
    glow: [],
  },
  penguin: {
    id: 'animal-penguin',
    personality: personality(1),
    style: { celebrate: ['flap', 'celebrate'] },
    glow: [],
  },
  elephant: {
    id: 'animal-elephant',
    personality: personality(0.85),
    style: { celebrate: ['spray', 'celebrate'], idle_alt: ['ear_flap', 'idle_alt'] },
    glow: [],
  },
  lion: {
    id: 'animal-lion',
    personality: personality(1.05),
    style: { surprised: ['roar', 'surprised'], encourage: ['tail_wag', 'encourage'] },
    glow: [],
  },
  turtle: {
    id: 'animal-turtle',
    personality: personality(0.8),
    style: { surprised: ['hide', 'surprised'] },
    glow: [],
  },
  owl: {
    id: 'animal-owl',
    personality: personality(0.95),
    style: { celebrate: ['flap', 'celebrate'], look_around: ['head_turn', 'look_around'] },
    glow: [],
  },
  unicorn: {
    id: 'animal-unicorn',
    personality: personality(1.05),
    style: { celebrate: ['sparkle', 'celebrate'] },
    glow: [],
  },
  dinosaur: {
    id: 'animal-dinosaur',
    personality: personality(1.1),
    style: { celebrate: ['roar', 'celebrate'], encourage: ['tail_wag', 'encourage'] },
    glow: [],
  },
}

/** What the hero does and shows for a page's feeling. */
export const MOOD_PERFORMANCE: Record<
  Mood,
  {
    gesture: string
    emotion: 'happy' | 'curious' | 'surprised' | 'celebrate' | 'sleepy'
  }
> = {
  happy: { gesture: 'wave', emotion: 'happy' },
  curious: { gesture: 'think', emotion: 'curious' },
  surprised: { gesture: 'surprised', emotion: 'surprised' },
  joyful: { gesture: 'celebrate', emotion: 'celebrate' },
  sleepy: { gesture: 'sleep', emotion: 'sleepy' },
}

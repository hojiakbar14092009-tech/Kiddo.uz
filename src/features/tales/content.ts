import type { Language } from '@/content/languages'
import { TALE_TEXT_EN } from './text.en'
import { TALE_TEXT_RU } from './text.ru'
import { TALE_TEXT_UZ } from './text.uz'

/*
 * Nine short, warm tales: three for each age. What happens on screen (the
 * place, the characters, the tasks and the answer pictures) is the same in
 * every language; the words live in text.uz / text.ru / text.en, written
 * separately for each language rather than translated word for word.
 *
 * The characters are Fluent Emoji 3D renders (public/3d, flat pictures of 3D
 * objects) standing in a real three.js scene – they are not rigged models.
 */

export type AgeLevel = 4 | 5 | 6

/** The place a scene happens in (sky, ground and decorations of the 3D scene). */
export type Backdrop =
  'meadow' | 'garden' | 'pond' | 'night' | 'autumn' | 'winter' | 'rain' | 'farm'

export interface Actor {
  /** A picture in public/3d. */
  asset: string
  /** Left (-3) to right (3) along the path. */
  x: number
  /** Back (-2) to front (1). */
  z?: number
  /** Height above the ground (things in the sky). */
  y?: number
  /** Size (1 = a character). */
  size?: number
  /** Walks (hops) along the path from `x` to this point. */
  toX?: number
  /** Keeps hopping gently in place. */
  hop?: boolean
}

/**
 * A task in a scene. `options` are pictures; for find/choose the first one is
 * the right answer (shown in a mixed order), for order they are in the right
 * order (shown mixed, the child puts them back).
 */
export interface TaskSpec {
  kind: 'find' | 'choose' | 'order'
  options: readonly string[]
}

export interface SceneSpec {
  backdrop: Backdrop
  actors: readonly Actor[]
  task?: TaskSpec
}

/** An end-of-tale question: answer pictures, the first one right. */
export interface CheckSpec {
  /** What it practises, for review (e.g. "who", "sequence", "cause", "predict"). */
  skill: string
  options: readonly string[]
}

export interface TaleSpec {
  id: string
  age: AgeLevel
  cover: string
  scenes: readonly SceneSpec[]
  checks: readonly CheckSpec[]
}

export interface SceneText {
  lines: readonly string[]
  /** The task's question and the labels of its pictures (same order as the spec). */
  task?: { prompt: string; options: readonly string[] }
}

export interface TaleText {
  title: string
  scenes: readonly SceneText[]
  checks: readonly { prompt: string; options: readonly string[] }[]
}

export const TALES: readonly TaleSpec[] = [
  // ——— age 4: a simple story, find an object or a character ———
  {
    id: 'rabbit-carrot',
    age: 4,
    cover: 'rabbit',
    scenes: [
      {
        backdrop: 'meadow',
        actors: [
          { asset: 'rabbit', x: -2.2, toX: -0.4, z: 0.4 },
          { asset: 'tulip', x: 1.6, z: -0.6, size: 0.6 },
          { asset: 'tree', x: 2.4, z: -1.4, size: 1.6 },
        ],
      },
      {
        backdrop: 'garden',
        actors: [
          { asset: 'rabbit', x: -1.6, toX: -0.8, z: 0.4 },
          { asset: 'hedgehog', x: 1, z: 0.2, size: 0.85 },
        ],
        task: { kind: 'find', options: ['carrot', 'apple', 'mushroom'] },
      },
      {
        backdrop: 'garden',
        actors: [
          { asset: 'rabbit', x: -1, z: 0.3, hop: true },
          { asset: 'carrot', x: 0, z: 0.6, size: 0.7 },
          { asset: 'hedgehog', x: 1.1, z: 0.3, size: 0.85 },
        ],
      },
      {
        backdrop: 'night',
        actors: [
          { asset: 'tree', x: 0, z: -1, size: 2 },
          { asset: 'rabbit', x: -0.7, z: 0.4, size: 0.85 },
          { asset: 'hedgehog', x: 0.7, z: 0.4, size: 0.75 },
          { asset: 'full-moon', x: 2.2, y: 2.4, z: -1.5, size: 0.8 },
        ],
      },
    ],
    checks: [
      { skill: 'who', options: ['rabbit', 'cat', 'duck'] },
      { skill: 'what', options: ['carrot', 'ball', 'apple'] },
      { skill: 'who', options: ['hedgehog', 'cow', 'fish'] },
      { skill: 'where', options: ['tree', 'car', 'boat'] },
    ],
  },
  {
    id: 'chick-ball',
    age: 4,
    cover: 'chick',
    scenes: [
      {
        backdrop: 'farm',
        actors: [
          { asset: 'chick', x: -0.8, z: 0.4, hop: true },
          { asset: 'ball', x: 0.4, toX: 2.6, z: 0.6, size: 0.55 },
        ],
      },
      {
        backdrop: 'pond',
        actors: [
          { asset: 'chick', x: -2.4, toX: -1, z: 0.5 },
          { asset: 'duck', x: 1.2, z: -0.4 },
        ],
      },
      {
        backdrop: 'pond',
        actors: [
          { asset: 'duck', x: 1.2, z: -0.4 },
          { asset: 'chick', x: -1.2, z: 0.4 },
          { asset: 'tulip', x: 0.1, z: 0.6, size: 0.6 },
          { asset: 'rose', x: 0.6, z: 0.7, size: 0.55 },
        ],
        task: { kind: 'find', options: ['ball', 'tulip', 'apple'] },
      },
      {
        backdrop: 'farm',
        actors: [
          { asset: 'chick', x: -1.2, z: 0.4, hop: true },
          { asset: 'ball', x: 0, z: 0.6, size: 0.5, hop: true },
          { asset: 'duck', x: 1.2, z: 0.4, hop: true },
        ],
      },
    ],
    checks: [
      { skill: 'who', options: ['chick', 'rabbit', 'cow'] },
      { skill: 'what', options: ['ball', 'kite', 'teddy'] },
      { skill: 'who', options: ['duck', 'cat', 'horse'] },
      { skill: 'where', options: ['tulip', 'car', 'house'] },
    ],
  },
  {
    id: 'kitten-stars',
    age: 4,
    cover: 'cat',
    scenes: [
      {
        backdrop: 'night',
        actors: [
          { asset: 'house', x: -1.2, z: -0.8, size: 1.7 },
          { asset: 'cat', x: 0.8, z: 0.4 },
        ],
      },
      {
        backdrop: 'night',
        actors: [
          { asset: 'tree', x: 1.4, z: -0.8, size: 2 },
          { asset: 'owl', x: 1.4, y: 1.3, z: -0.6, size: 0.7 },
          { asset: 'cat', x: -1, z: 0.4, toX: -0.2 },
        ],
      },
      {
        backdrop: 'night',
        actors: [
          { asset: 'full-moon', x: -1.4, y: 2.2, z: -1.4, size: 1 },
          { asset: 'star', x: 0.6, y: 2.6, z: -1.4, size: 0.5 },
          { asset: 'glowing-star', x: 2, y: 2, z: -1.4, size: 0.5 },
          { asset: 'cat', x: 0, z: 0.5, size: 0.9 },
        ],
        task: { kind: 'find', options: ['star', 'ball', 'apple'] },
      },
      {
        backdrop: 'night',
        actors: [
          { asset: 'house', x: -1.4, z: -0.8, size: 1.6 },
          { asset: 'cat', x: 0.5, z: 0.4 },
          { asset: 'teddy', x: 1.3, z: 0.5, size: 0.7 },
          { asset: 'crescent-moon', x: 2, y: 2.4, z: -1.5, size: 0.7 },
        ],
      },
    ],
    checks: [
      { skill: 'who', options: ['cat', 'dog', 'pig'] },
      { skill: 'who', options: ['owl', 'frog', 'cow'] },
      { skill: 'what', options: ['full-moon', 'car', 'carrot'] },
      { skill: 'what', options: ['teddy', 'drum', 'umbrella'] },
    ],
  },

  // ——— age 5: the order of events, what a character did ———
  {
    id: 'chipmunk-autumn',
    age: 5,
    cover: 'chipmunk',
    scenes: [
      {
        backdrop: 'autumn',
        actors: [
          { asset: 'tree', x: 1.6, z: -1, size: 2 },
          { asset: 'fallen-leaf', x: 0.4, y: 1.4, z: -0.2, size: 0.4, hop: true },
          { asset: 'chipmunk', x: -1.2, z: 0.4 },
        ],
      },
      {
        backdrop: 'autumn',
        actors: [
          { asset: 'chipmunk', x: -2, toX: 0, z: 0.4 },
          { asset: 'chestnut', x: 0.8, z: 0.6, size: 0.45 },
          { asset: 'chestnut', x: 1.4, z: 0.3, size: 0.45 },
          { asset: 'basket', x: -0.9, z: 0.7, size: 0.6 },
        ],
        task: { kind: 'choose', options: ['chestnut', 'ball', 'fish'] },
      },
      {
        backdrop: 'autumn',
        actors: [
          { asset: 'hedgehog', x: 0.8, z: 0.3, toX: 1.8 },
          { asset: 'apple', x: 0.2, z: 0.6, size: 0.45 },
          { asset: 'chipmunk', x: -0.8, z: 0.3, toX: 0.6 },
        ],
      },
      {
        backdrop: 'autumn',
        actors: [
          { asset: 'tree', x: 0.6, z: -0.8, size: 2.2 },
          { asset: 'chipmunk', x: -1.4, z: 0.4, toX: -0.2 },
          { asset: 'basket', x: -1, z: 0.7, size: 0.55 },
        ],
      },
      {
        backdrop: 'winter',
        actors: [
          { asset: 'tree', x: 0.8, z: -0.8, size: 2.2 },
          { asset: 'chipmunk', x: -0.6, z: 0.4, hop: true },
          { asset: 'snowflake', x: -1.8, y: 2.2, z: -1, size: 0.4 },
          { asset: 'snowflake', x: 2.2, y: 2.6, z: -1.2, size: 0.35 },
        ],
      },
    ],
    checks: [
      { skill: 'sequence', options: ['chestnut', 'snowflake', 'fish'] },
      { skill: 'who', options: ['hedgehog', 'owl', 'frog'] },
      { skill: 'what-did', options: ['apple', 'ball', 'umbrella'] },
      { skill: 'where', options: ['tree', 'bucket', 'car'] },
      { skill: 'sequence', options: ['snowflake', 'tulip', 'sun'] },
    ],
  },
  {
    id: 'turtle-pond',
    age: 5,
    cover: 'turtle',
    scenes: [
      {
        backdrop: 'meadow',
        actors: [
          { asset: 'turtle', x: -2.2, toX: -0.8, z: 0.4 },
          { asset: 'tulip', x: 1.4, z: -0.4, size: 0.55 },
        ],
      },
      {
        backdrop: 'meadow',
        actors: [
          { asset: 'turtle', x: -1.6, toX: -0.6, z: 0.4 },
          { asset: 'snail', x: 1, z: 0.4, size: 0.7 },
        ],
      },
      {
        backdrop: 'pond',
        actors: [
          { asset: 'turtle', x: -1.6, z: 0.5 },
          { asset: 'frog', x: 0.2, z: 0.4, size: 0.8, hop: true },
        ],
        task: { kind: 'find', options: ['frog', 'fish', 'bee'] },
      },
      {
        backdrop: 'pond',
        actors: [
          { asset: 'turtle', x: 0.6, z: -0.4, toX: 1.2 },
          { asset: 'fish', x: 0.2, z: -0.3, size: 0.55, hop: true },
          { asset: 'fish', x: 1.8, z: -0.6, size: 0.5, hop: true },
        ],
      },
      {
        backdrop: 'night',
        actors: [
          { asset: 'turtle', x: 0, z: 0.4 },
          { asset: 'crescent-moon', x: 2, y: 2.4, z: -1.5, size: 0.7 },
        ],
      },
    ],
    checks: [
      { skill: 'where', options: ['wave', 'mountain', 'castle'] },
      { skill: 'sequence', options: ['snail', 'frog', 'fish'] },
      { skill: 'who', options: ['frog', 'cow', 'owl'] },
      { skill: 'who', options: ['fish', 'horse', 'bee'] },
      { skill: 'how', options: ['snail', 'rocket', 'airplane'] },
    ],
  },
  {
    id: 'duck-rain',
    age: 5,
    cover: 'rainbow',
    scenes: [
      {
        backdrop: 'meadow',
        actors: [
          { asset: 'duck', x: -2, toX: 0, z: 0.4 },
          { asset: 'sun', x: 2, y: 2.4, z: -1.5, size: 0.9 },
        ],
      },
      {
        backdrop: 'rain',
        actors: [
          { asset: 'rain-cloud', x: 0.4, y: 2.4, z: -1, size: 1.3 },
          { asset: 'duck', x: -0.4, z: 0.4 },
          { asset: 'umbrella', x: 0.5, z: 0.5, size: 0.8 },
        ],
      },
      {
        backdrop: 'rain',
        actors: [
          { asset: 'umbrella', x: 0, y: 0.5, z: 0.2, size: 1.3 },
          { asset: 'duck', x: -0.5, z: 0.5, size: 0.8 },
          { asset: 'rabbit', x: 0.4, z: 0.5, size: 0.75 },
          { asset: 'mouse', x: 2.2, toX: 1, z: 0.6, size: 0.6 },
        ],
        task: { kind: 'choose', options: ['umbrella', 'ball', 'bed'] },
      },
      {
        backdrop: 'meadow',
        actors: [
          { asset: 'rainbow', x: 0, y: 2.1, z: -1.6, size: 2 },
          { asset: 'sun', x: 2.3, y: 2.6, z: -1.6, size: 0.7 },
          { asset: 'duck', x: -1, z: 0.4 },
          { asset: 'rabbit', x: 0.2, z: 0.4, size: 0.8 },
          { asset: 'mouse', x: 1.2, z: 0.5, size: 0.6 },
        ],
      },
      {
        backdrop: 'meadow',
        actors: [
          { asset: 'duck', x: -1.2, z: 0.4, hop: true },
          { asset: 'rabbit', x: 0, z: 0.4, size: 0.8, hop: true },
          { asset: 'mouse', x: 1.1, z: 0.5, size: 0.6, hop: true },
          { asset: 'droplet', x: 0.6, z: 0.8, size: 0.35 },
        ],
      },
    ],
    checks: [
      { skill: 'sequence', options: ['sun', 'snowflake', 'crescent-moon'] },
      { skill: 'sequence', options: ['rain-cloud', 'snowflake', 'rainbow'] },
      { skill: 'what-did', options: ['umbrella', 'box', 'book'] },
      { skill: 'who', options: ['rabbit', 'cow', 'fish'] },
      { skill: 'what', options: ['rainbow', 'rocket', 'kite'] },
    ],
  },

  // ——— age 6: cause and effect, what happens next, retelling in order ———
  {
    id: 'seed-sunflower',
    age: 6,
    cover: 'sunflower',
    scenes: [
      {
        backdrop: 'garden',
        actors: [
          { asset: 'rabbit', x: -1.2, z: 0.4, toX: -0.4 },
          { asset: 'bucket', x: 0.6, z: 0.6, size: 0.6 },
        ],
      },
      {
        backdrop: 'garden',
        actors: [
          { asset: 'rabbit', x: -0.9, z: 0.4 },
          { asset: 'droplet', x: 0.4, y: 0.8, z: 0.4, size: 0.35, hop: true },
          { asset: 'sun', x: 2, y: 2.4, z: -1.5, size: 0.9 },
        ],
        task: { kind: 'choose', options: ['droplet', 'candy', 'teddy'] },
      },
      {
        backdrop: 'garden',
        actors: [
          { asset: 'seedling', x: 0.4, z: 0.5, size: 0.6 },
          { asset: 'rabbit', x: -0.9, z: 0.4, hop: true },
        ],
      },
      {
        backdrop: 'garden',
        actors: [
          { asset: 'seedling', x: 0.4, z: 0.4, size: 0.9 },
          { asset: 'rabbit', x: -1, z: 0.4 },
          { asset: 'sun', x: 2, y: 2.4, z: -1.5, size: 0.9 },
        ],
        task: { kind: 'choose', options: ['sunflower', 'rocket', 'snowman'] },
      },
      {
        backdrop: 'garden',
        actors: [
          { asset: 'sunflower', x: 0.5, z: 0.1, size: 1.6 },
          { asset: 'bee', x: 1.5, y: 1.6, z: 0.1, size: 0.45, hop: true },
          { asset: 'rabbit', x: -1, z: 0.4, hop: true },
        ],
        task: { kind: 'order', options: ['droplet', 'seedling', 'sunflower'] },
      },
    ],
    checks: [
      { skill: 'cause', options: ['droplet', 'ball', 'crescent-moon'] },
      { skill: 'sequence', options: ['seedling', 'sunflower', 'apple'] },
      { skill: 'who', options: ['bee', 'fish', 'cow'] },
      { skill: 'what-did', options: ['bucket', 'bed', 'car'] },
      { skill: 'when', options: ['sun', 'snowflake', 'fallen-leaf'] },
      { skill: 'detail', options: ['sunflower', 'rose', 'blueberries'] },
    ],
  },
  {
    id: 'fox-kite',
    age: 6,
    cover: 'kite',
    scenes: [
      {
        backdrop: 'meadow',
        actors: [
          { asset: 'fox', x: -0.8, z: 0.4 },
          { asset: 'kite', x: 0.6, z: 0.5, size: 0.8 },
        ],
      },
      {
        backdrop: 'meadow',
        actors: [
          { asset: 'fox', x: -0.8, z: 0.4 },
          { asset: 'kite', x: 0.4, y: 0.6, z: 0.4, size: 0.8, hop: true },
          { asset: 'fallen-leaf', x: 1.8, y: 1.6, z: -0.2, size: 0.35, toX: -2 },
        ],
        task: { kind: 'choose', options: ['kite', 'bed', 'fish'] },
      },
      {
        backdrop: 'meadow',
        actors: [
          { asset: 'kite', x: 0.8, y: 2.3, z: -0.6, size: 0.9, hop: true },
          { asset: 'fox', x: -2, toX: 0, z: 0.4 },
        ],
      },
      {
        backdrop: 'meadow',
        actors: [
          { asset: 'tree', x: 1, z: -0.6, size: 2.2 },
          { asset: 'kite', x: 1.2, y: 1.6, z: -0.2, size: 0.7 },
          { asset: 'fox', x: -0.8, z: 0.4 },
        ],
        task: { kind: 'choose', options: ['bird', 'fish', 'snail'] },
      },
      {
        backdrop: 'meadow',
        actors: [
          { asset: 'tree', x: 1.6, z: -0.8, size: 2 },
          { asset: 'bird', x: 1.4, y: 1.8, toX: 0.2, z: -0.2, size: 0.55 },
          { asset: 'kite', x: -0.2, y: 2, z: -0.4, size: 0.8, hop: true },
          { asset: 'fox', x: -1.2, z: 0.4, hop: true },
        ],
        task: { kind: 'order', options: ['kite', 'tree', 'bird'] },
      },
    ],
    checks: [
      { skill: 'cause', options: ['sun', 'rain-cloud', 'crescent-moon'] },
      { skill: 'cause', options: ['fallen-leaf', 'rocket', 'droplet'] },
      { skill: 'effect', options: ['tree', 'rainbow', 'house'] },
      { skill: 'who', options: ['bird', 'fish', 'snail'] },
      { skill: 'cause', options: ['feather', 'snail', 'fish'] },
      { skill: 'sequence', options: ['kite', 'bed', 'fish'] },
    ],
  },
  {
    id: 'egg-chick',
    age: 6,
    cover: 'hatching-chick',
    scenes: [
      {
        backdrop: 'farm',
        actors: [
          { asset: 'nest', x: 0, z: 0.5, size: 0.9 },
          { asset: 'chicken', x: 0, y: 0.35, z: 0.45 },
          { asset: 'egg', x: 0.9, z: 0.7, size: 0.4 },
        ],
      },
      {
        backdrop: 'farm',
        actors: [
          { asset: 'chicken', x: -0.4, z: 0.4 },
          { asset: 'egg', x: 0.4, z: 0.7, size: 0.4 },
          { asset: 'goat', x: 2.4, toX: 1.4, z: 0.2 },
        ],
        task: { kind: 'choose', options: ['hatching-chick', 'ball', 'bed'] },
      },
      {
        backdrop: 'farm',
        actors: [
          { asset: 'nest', x: 0, z: 0.5, size: 0.9 },
          { asset: 'egg', x: 0, y: 0.25, z: 0.55, size: 0.5, hop: true },
          { asset: 'chicken', x: -1.4, z: 0.3 },
          { asset: 'goat', x: 1.5, z: 0.2 },
        ],
        task: { kind: 'choose', options: ['hatching-chick', 'cat', 'balloon'] },
      },
      {
        backdrop: 'farm',
        actors: [
          { asset: 'hatching-chick', x: 0, z: 0.5, size: 0.7, hop: true },
          { asset: 'chicken', x: -1.4, z: 0.3 },
          { asset: 'goat', x: 1.5, z: 0.2 },
        ],
      },
      {
        backdrop: 'farm',
        actors: [
          { asset: 'chicken', x: -1, z: 0.3 },
          { asset: 'chick', x: -2, toX: 0, z: 0.6, size: 0.6 },
          { asset: 'goat', x: 1.5, z: 0.2, hop: true },
        ],
        task: { kind: 'order', options: ['egg', 'hatching-chick', 'chick'] },
      },
    ],
    checks: [
      { skill: 'what', options: ['egg', 'ball', 'apple'] },
      { skill: 'cause', options: ['hatching-chick', 'ball', 'snowflake'] },
      { skill: 'effect', options: ['chick', 'rainbow', 'cat'] },
      { skill: 'who', options: ['goat', 'penguin', 'whale'] },
      { skill: 'who', options: ['chick', 'dog', 'horse'] },
      { skill: 'sequence', options: ['egg', 'hatching-chick', 'chick'] },
    ],
  },
]

export const TALE_TEXT: Record<Language, Record<string, TaleText>> = {
  uz: TALE_TEXT_UZ,
  ru: TALE_TEXT_RU,
  en: TALE_TEXT_EN,
}

export function taleById(id: string): TaleSpec | undefined {
  return TALES.find((tale) => tale.id === id)
}

export function taleText(language: Language, id: string): TaleText {
  const text = TALE_TEXT[language][id]
  if (!text) throw new Error(`no ${language} text for tale ${id}`)
  return text
}

/**
 * Tales a child can open: their own age and younger. A guest counts as 6, so
 * everything is open; an older tale shows when it unlocks.
 */
export function talesFor(level: AgeLevel): { open: TaleSpec[]; locked: TaleSpec[] } {
  const own = TALES.filter((tale) => tale.age === level)
  const younger = TALES.filter((tale) => tale.age < level).sort((a, b) => b.age - a.age)
  return { open: [...own, ...younger], locked: TALES.filter((tale) => tale.age > level) }
}

/** Every line read aloud in a scene: the story, then the task's question. */
export function sceneSpeech(scene: SceneText): string[] {
  return scene.task ? [...scene.lines, scene.task.prompt] : [...scene.lines]
}

export interface CheckQuestion {
  id: string
  skill: string
  prompt: string
  /** Picture + label; `correct` marks the one right answer. */
  options: { asset: string; label: string; correct: boolean }[]
}

/** The end-of-tale questions of a tale in one language (in story order). */
export function checkQuestions(tale: TaleSpec, language: Language): CheckQuestion[] {
  const text = taleText(language, tale.id)
  return tale.checks.map((check, index) => {
    const words = text.checks[index]
    if (!words) throw new Error(`missing check ${index} in ${language} ${tale.id}`)
    return {
      id: `${tale.id}:q${index + 1}`,
      skill: `${tale.id}:${check.skill}`,
      prompt: words.prompt,
      options: check.options.map((asset, at) => ({
        asset,
        label: words.options[at] ?? asset,
        correct: at === 0,
      })),
    }
  })
}

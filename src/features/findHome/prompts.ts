import { stableHash } from '@/lib/stableHash'

/*
 * «Uyda top» (Phase 49): the robot asks the child to find a real thing at
 * home and show it – point to it, not fetch it (the robot says so with every
 * prompt: findHome.say.safe). Only safe, everyday soft or small things in a
 * room, colours and a shape. Never anything sharp, hot, breakable, electric,
 * a medicine or a cleaning product, and nothing outside the home (a test
 * checks this list against BANNED_WORDS).
 */

export type FindKind = 'colour' | 'shape' | 'thing'

/** Things without a 3D picture, drawn as SVG. */
export type FindDrawing = 'pillow' | 'slipper' | 'blanket'

export interface FindPrompt {
  /** Stable id: the key of its sentence (findHome.say.prompts.<id>) and of its reward. */
  id: string
  kind: FindKind
  /** A colour swatch (colours) or a shape (shapes) drawn as SVG. */
  colour?: string
  shape?: 'square'
  /** public/3d picture (things and "soft"). */
  picture?: string
  /** …or a simple SVG drawing. */
  drawing?: FindDrawing
}

export const FIND_PROMPTS: readonly FindPrompt[] = [
  { id: 'red', kind: 'colour', colour: '#E8504A' },
  { id: 'blue', kind: 'colour', colour: '#3D7FE0' },
  { id: 'yellow', kind: 'colour', colour: '#F5C53A' },
  { id: 'green', kind: 'colour', colour: '#46B062' },
  { id: 'blanket', kind: 'thing', drawing: 'blanket' },
  { id: 'square', kind: 'shape', shape: 'square' },
  { id: 'soft', kind: 'thing', picture: 'cloud' },
  { id: 'spoon', kind: 'thing', picture: 'spoon' },
  { id: 'slipper', kind: 'thing', drawing: 'slipper' },
  { id: 'book', kind: 'thing', picture: 'book' },
  { id: 'socks', kind: 'thing', picture: 'socks' },
  { id: 'ball', kind: 'thing', picture: 'ball' },
  { id: 'toy', kind: 'thing', picture: 'teddy' },
  { id: 'fruit', kind: 'thing', picture: 'apple' },
  { id: 'hat', kind: 'thing', picture: 'cap' },
  { id: 'crayon', kind: 'thing', picture: 'crayon' },
  { id: 'chair', kind: 'thing', picture: 'chair' },
  { id: 'pillow', kind: 'thing', drawing: 'pillow' },
  { id: 'box', kind: 'thing', picture: 'box' },
  { id: 'notebook', kind: 'thing', picture: 'notebook' },
]

/**
 * Words that must never appear in a prompt's id, picture or sentence: sharp,
 * hot, electric or poisonous things, and places outside the home.
 */
export const BANNED_WORDS: readonly string[] = [
  'knife',
  'scissors',
  'needle',
  'glass',
  'cup',
  'clock',
  'mug',
  'plate',
  'stove',
  'oven',
  'fire',
  'match',
  'candle',
  'iron',
  'kettle',
  'teapot',
  'socket',
  'plug',
  'wire',
  'battery',
  'medicine',
  'pills',
  'bleach',
  'soap',
  'window',
  'balcony',
  'outside',
  'street',
  'road',
  'yard',
  'нож',
  'чашк',
  'часы',
  'стакан',
  'тарелк',
  'ножниц',
  'игол',
  'плит',
  'огон',
  'спичк',
  'утюг',
  'чайник',
  'розетк',
  'лекарств',
  'таблетк',
  'окно',
  'балкон',
  'улиц',
  'двор',
  'pichoq',
  'piyola',
  'soatni',
  'stakan',
  'likopcha',
  'qaychi',
  'igna',
  'plita',
  'olov',
  'gugurt',
  'dazmol',
  'choynak',
  'rozetka',
  'dori',
  'deraza',
  'balkon',
  'ko‘cha',
  'hovli',
]

/** One round: ten things to find, then a finish (MVP: a game with an end, not an endless list). */
export const FIND_ROUND = 10

/**
 * The order of today's prompts: all of them, starting at a place that
 * changes from day to day (the same for the whole day, on every device).
 */
export function promptsForDay(day: string): readonly FindPrompt[] {
  const start = stableHash(`find-home|${day}`) % FIND_PROMPTS.length
  return [...FIND_PROMPTS.slice(start), ...FIND_PROMPTS.slice(0, start)]
}

/** One of the three praise lines, by the prompt (no randomness). */
export function praiseKeyFor(
  prompt: FindPrompt,
): 'findHome.say.praise1' | 'findHome.say.praise2' | 'findHome.say.praise3' {
  const index = FIND_PROMPTS.findIndex((item) => item.id === prompt.id)
  const n = (index < 0 ? 0 : index) % 3
  return n === 0
    ? 'findHome.say.praise1'
    : n === 1
      ? 'findHome.say.praise2'
      : 'findHome.say.praise3'
}

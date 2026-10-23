import type { Language } from '@/content/languages'
import { STORY_TEXT_EN } from './text.en'
import { STORY_TEXT_RU } from './text.ru'
import { STORY_TEXT_UZ } from './text.uz'
import type { StorySpec, StoryText } from './types'

/*
 * Six original picture stories for 4–6 year olds, set in places an Uzbek
 * family knows (mountain pastures, grandma's garden, a mahalla at Navro‘z,
 * the bazaar, a yurt in the steppe, a hashar day). Each has 1–2 choices
 * about kindness, curiosity or safety, and every branch ends kindly: no
 * choice is "wrong", none is shamed. Two are free, four need PRO.
 *
 * The characters are the app's 3D pictures (public/3d), placed like the
 * tales' scenes: x −3 (left) … 3 (right), z −2 (back) … 1 (front).
 */

export const STORIES: readonly StorySpec[] = [
  // ——— free: a lost lamb in the mountains (safety) ———
  {
    id: 'lost-lamb',
    minutes: 4,
    free: true,
    strand: 'language',
    levels: [1, 2, 3, 4, 5],
    cover: 'sheep',
    pages: [
      {
        id: 'p1',
        picture: {
          backdrop: 'mountains',
          actors: [
            { asset: 'worlds/uz-yurt', x: -2.2, z: -1.2, size: 1.76 },
            { asset: 'sheep', x: -0.6, z: 0.3, size: 1.05 },
            { asset: 'sheep', x: 0.6, z: 0.5, size: 0.7, hop: true },
            { asset: 'dog', x: 2, z: 0.4, size: 0.85 },
          ],
        },
        next: 'p2',
      },
      {
        id: 'p2',
        picture: {
          backdrop: 'mountains',
          actors: [
            { asset: 'sheep', x: -1.8, toX: -0.2, z: 0.4, size: 0.75 },
            { asset: 'butterfly', x: 0.9, toX: 1.9, y: 1.2, z: 0.2, size: 0.5 },
            { asset: 'tulip', x: 2.4, z: 0.6, size: 0.45 },
          ],
        },
        next: 'p3',
      },
      {
        id: 'p3',
        picture: {
          backdrop: 'mountains',
          actors: [
            { asset: 'rock', x: 1.6, z: 0.1, size: 1.2 },
            { asset: 'sheep', x: -0.8, z: 0.4, size: 0.75 },
          ],
        },
        next: 'p4',
      },
      {
        id: 'p4',
        picture: {
          backdrop: 'mountains',
          actors: [
            { asset: 'rock', x: 1.8, z: 0, size: 1.3 },
            { asset: 'sheep', x: 0.2, z: 0.5, size: 0.75 },
          ],
        },
        choices: [
          { textKey: 'stay', picture: 'rock', to: 'stay1' },
          { textKey: 'down', picture: 'mountain', to: 'down1' },
        ],
      },
      {
        id: 'stay1',
        picture: {
          backdrop: 'mountains',
          actors: [
            { asset: 'rock', x: 0.9, z: -0.2, size: 1.5 },
            { asset: 'sheep', x: -0.3, z: 0.5, size: 0.8, hop: true },
          ],
        },
        next: 'stay2',
      },
      {
        id: 'stay2',
        picture: {
          backdrop: 'mountains',
          actors: [
            { asset: 'rock', x: 1.6, z: -0.3, size: 1.3 },
            { asset: 'sheep', x: 0.6, z: 0.4, size: 0.75 },
            { asset: 'dog', x: -2.6, toX: -0.8, z: 0.5, size: 0.9 },
          ],
        },
        next: 'home',
      },
      {
        id: 'down1',
        picture: {
          backdrop: 'mountains',
          actors: [
            { asset: 'sheep', x: -0.6, z: 0.5, size: 0.75 },
            { asset: 'goat', x: 1.4, z: 0.2, size: 0.95 },
          ],
        },
        next: 'down2',
      },
      {
        id: 'down2',
        picture: {
          backdrop: 'mountains',
          actors: [
            { asset: 'sheep', x: 0.2, z: 0.5, size: 0.75 },
            { asset: 'goat', x: 1.4, z: 0.3, size: 0.95 },
            { asset: 'dog', x: -2.6, toX: -1.2, z: 0.5, size: 0.9 },
          ],
        },
        next: 'home',
      },
      {
        id: 'home',
        picture: {
          backdrop: 'evening',
          actors: [
            { asset: 'worlds/uz-yurt', x: 1.9, z: -1.1, size: 1.92 },
            { asset: 'sheep', x: -0.9, z: 0.3, size: 1.05 },
            { asset: 'sheep', x: 0.1, z: 0.5, size: 0.7 },
            { asset: 'dog', x: -2.3, z: 0.4, size: 0.85 },
          ],
        },
        choices: [
          { textKey: 'thank', picture: 'dog', to: 'end-thank' },
          { textKey: 'close', picture: 'sheep', to: 'end-close' },
        ],
      },
      {
        id: 'end-thank',
        picture: {
          backdrop: 'night',
          actors: [
            { asset: 'worlds/uz-yurt', x: 1.8, z: -1.1, size: 1.92 },
            { asset: 'dog', x: -0.9, z: 0.4, size: 0.9 },
            { asset: 'sheep', x: 0.2, z: 0.5, size: 0.7 },
            { asset: 'glowing-star', x: -2.2, y: 2.5, z: -1.5, size: 0.4 },
            { asset: 'full-moon', x: 2.4, y: 2.6, z: -1.6, size: 0.6 },
          ],
        },
        ending: true,
      },
      {
        id: 'end-close',
        picture: {
          backdrop: 'night',
          actors: [
            { asset: 'worlds/uz-yurt', x: 1.8, z: -1.1, size: 1.92 },
            { asset: 'sheep', x: -0.7, z: 0.3, size: 1.05 },
            { asset: 'sheep', x: 0.3, z: 0.5, size: 0.7 },
            { asset: 'full-moon', x: -2.2, y: 2.6, z: -1.6, size: 0.6 },
          ],
        },
        ending: true,
      },
    ],
    questions: [
      { id: 'who-lost', kind: 'who', page: 'p3', options: ['sheep', 'goat', 'cow'] },
      { id: 'what-chased', kind: 'what', page: 'p2', options: ['butterfly', 'bird', 'ball'] },
      { id: 'who-found', kind: 'who', page: 'home', options: ['dog', 'eagle', 'horse'] },
      {
        id: 'first',
        kind: 'sequence',
        page: 'p2',
        options: ['butterfly', 'dog', 'full-moon'],
      },
      { id: 'why-lost', kind: 'why', page: 'p2', options: ['butterfly', 'rain-cloud', 'tree'] },
      {
        id: 'mother-felt',
        kind: 'feelings',
        page: 'home',
        options: ['face:happy', 'face:angry', 'face:sad'],
      },
      {
        id: 'next-time',
        kind: 'predict',
        page: 'home',
        options: ['sheep', 'butterfly', 'mountain'],
      },
    ],
  },

  // ——— free: grandma's garden (kindness, curiosity) ———
  {
    id: 'grandma-garden',
    minutes: 3,
    free: true,
    strand: 'language',
    levels: [1, 2, 3, 4, 5],
    cover: 'cherries',
    pages: [
      {
        id: 'p1',
        picture: {
          backdrop: 'garden',
          actors: [
            { asset: 'garden-house', x: -2, z: -1.2, size: 1.3 },
            { asset: 'sunflower', x: 2.4, z: -0.6, size: 1 },
            { asset: 'hedgehog', x: 2.8, toX: 0.8, z: 0.5, size: 0.65 },
            { asset: 'cherries', x: -0.4, y: 1.4, z: -0.4, size: 0.45 },
            { asset: 'tomato', x: 1.7, z: 0.8, size: 0.35 },
          ],
        },
        next: 'p2',
      },
      {
        id: 'p2',
        picture: {
          backdrop: 'garden',
          actors: [
            { asset: 'garden-house', x: 2, z: -1.2, size: 1.3 },
            { asset: 'hedgehog', x: -0.8, z: 0.3, size: 1 },
            { asset: 'hedgehog', x: 0.3, z: 0.5, size: 0.65, hop: true },
          ],
        },
        next: 'p3',
      },
      {
        id: 'p3',
        picture: {
          backdrop: 'garden',
          actors: [
            { asset: 'sun', x: 2.4, y: 2.4, z: -1.6, size: 0.7 },
            { asset: 'seedling', x: -1.6, z: 0.6, size: 0.45 },
            { asset: 'seedling', x: -0.9, z: 0.7, size: 0.4 },
            { asset: 'hedgehog', x: 0.4, z: 0.4, size: 0.65 },
            { asset: 'cherries', x: 1.6, y: 1.3, z: -0.3, size: 0.45 },
          ],
        },
        choices: [
          { textKey: 'water', picture: 'bucket', to: 'water1' },
          { textKey: 'cherries', picture: 'cherries', to: 'cherry1' },
        ],
      },
      {
        id: 'water1',
        picture: {
          backdrop: 'garden',
          actors: [
            { asset: 'bucket', x: 0.5, z: 0.6, size: 0.45 },
            { asset: 'hedgehog', x: -0.4, z: 0.4, size: 0.65 },
            { asset: 'seedling', x: 1.3, z: 0.6, size: 0.45 },
            { asset: 'droplet', x: 1.1, y: 0.9, z: 0.5, size: 0.25 },
          ],
        },
        next: 'water2',
      },
      {
        id: 'water2',
        picture: {
          backdrop: 'garden',
          actors: [
            { asset: 'tree', x: 0.4, z: -1, size: 1.8 },
            { asset: 'cherries', x: -0.4, y: 1.5, z: -0.2, size: 0.45 },
            { asset: 'hedgehog', x: -1.4, z: 0.4, size: 1 },
            { asset: 'hedgehog', x: 0.8, z: 0.5, size: 0.65 },
            { asset: 'basket', x: 1.8, z: 0.7, size: 0.5 },
          ],
        },
        next: 'snail',
      },
      {
        id: 'cherry1',
        picture: {
          backdrop: 'garden',
          actors: [
            { asset: 'tree', x: 0.4, z: -1, size: 1.8 },
            { asset: 'cherries', x: 0.9, y: 1.5, z: -0.2, size: 0.45 },
            { asset: 'hedgehog', x: -1.4, z: 0.4, size: 1 },
            { asset: 'hedgehog', x: 0.4, z: 0.5, size: 0.65, hop: true },
            { asset: 'basket', x: 1.8, z: 0.7, size: 0.5 },
          ],
        },
        next: 'cherry2',
      },
      {
        id: 'cherry2',
        picture: {
          backdrop: 'garden',
          actors: [
            { asset: 'bucket', x: 0.5, z: 0.6, size: 0.45 },
            { asset: 'hedgehog', x: -0.4, z: 0.4, size: 0.65 },
            { asset: 'seedling', x: 1.3, z: 0.6, size: 0.45 },
            { asset: 'seedling', x: 2, z: 0.7, size: 0.4 },
          ],
        },
        next: 'snail',
      },
      {
        id: 'snail',
        picture: {
          backdrop: 'garden',
          actors: [
            { asset: 'herb', x: 1.2, z: 0.3, size: 0.8 },
            { asset: 'snail', x: 0.6, z: 0.7, size: 0.45 },
            { asset: 'hedgehog', x: -0.9, z: 0.5, size: 0.65 },
          ],
        },
        choices: [
          { textKey: 'watch', picture: 'snail', to: 'watch' },
          { textKey: 'carry', picture: 'herb', to: 'carry' },
        ],
      },
      {
        id: 'watch',
        picture: {
          backdrop: 'garden',
          actors: [
            { asset: 'snail', x: 0.8, toX: 1.6, z: 0.7, size: 0.5 },
            { asset: 'hedgehog', x: -0.6, z: 0.6, size: 0.65 },
            { asset: 'ladybug', x: 2.2, y: 0.6, z: 0.3, size: 0.25 },
          ],
        },
        next: 'tea',
      },
      {
        id: 'carry',
        picture: {
          backdrop: 'garden',
          actors: [
            { asset: 'herb', x: 1.6, z: 0.2, size: 1 },
            { asset: 'snail', x: 1.2, z: 0.7, size: 0.4 },
            { asset: 'hedgehog', x: -2, toX: 0.2, z: 0.6, size: 0.65 },
          ],
        },
        next: 'tea',
      },
      {
        id: 'tea',
        picture: {
          backdrop: 'evening',
          actors: [
            { asset: 'tree', x: 1.9, z: -1, size: 1.8 },
            { asset: 'hedgehog', x: -1.2, z: 0.3, size: 1 },
            { asset: 'hedgehog', x: 0.1, z: 0.4, size: 0.65 },
            { asset: 'teapot', x: 1, z: 0.7, size: 0.45 },
            { asset: 'bread', x: -0.4, z: 0.9, size: 0.4 },
          ],
        },
        ending: true,
      },
    ],
    questions: [
      { id: 'who-visit', kind: 'who', page: 'p2', options: ['hedgehog', 'rabbit', 'owl'] },
      { id: 'what-found', kind: 'what', page: 'snail', options: ['snail', 'ladybug', 'worm'] },
      { id: 'what-grew', kind: 'what', page: 'p1', options: ['cherries', 'banana', 'pineapple'] },
      {
        id: 'first',
        kind: 'sequence',
        page: 'p1',
        options: ['garden-house', 'snail', 'teapot'],
      },
      { id: 'why-water', kind: 'why', page: 'p3', options: ['sun', 'snowflake', 'rain-cloud'] },
      {
        id: 'tikon-felt',
        kind: 'feelings',
        page: 'tea',
        options: ['face:proud', 'face:angry', 'face:scared'],
      },
      { id: 'next-time', kind: 'predict', page: 'tea', options: ['hedgehog', 'fish', 'whale'] },
    ],
  },

  // ——— PRO: Navro‘z sumalak in the mahalla (togetherness, safety) ———
  {
    id: 'navruz-sumalak',
    minutes: 4,
    free: false,
    strand: 'language',
    levels: [2, 3, 4, 5],
    cover: 'tulip',
    pages: [
      {
        id: 'p1',
        picture: {
          backdrop: 'mahalla',
          actors: [
            { asset: 'house', x: -2, z: -1.2, size: 1.3 },
            { asset: 'blossom', x: 2.2, y: 1.6, z: -1, size: 0.6 },
            { asset: 'tulip', x: 1.2, z: 0.7, size: 0.4 },
            { asset: 'tulip', x: 1.7, z: 0.8, size: 0.35 },
            { asset: 'chicken', x: -0.5, z: 0.3, size: 0.95 },
            { asset: 'chick', x: 0.4, z: 0.5, size: 0.55, hop: true },
          ],
        },
        next: 'p2',
      },
      {
        id: 'p2',
        picture: {
          backdrop: 'mahalla',
          actors: [
            { asset: 'house', x: 2, z: -1.2, size: 1.3 },
            { asset: 'chicken', x: -1.2, z: 0.3, size: 0.95 },
            { asset: 'seedling', x: 0, z: 0.6, size: 0.5 },
            { asset: 'seedling', x: 0.6, z: 0.7, size: 0.45 },
            { asset: 'chick', x: 1.3, z: 0.6, size: 0.5 },
          ],
        },
        next: 'p3',
      },
      {
        id: 'p3',
        picture: {
          backdrop: 'evening',
          actors: [
            { asset: 'fire', x: 0, z: 0.1, size: 0.75 },
            { asset: 'goat', x: -1.8, z: 0.2, size: 0.95 },
            { asset: 'duck', x: 1.6, z: 0.3, size: 0.75 },
            { asset: 'chicken', x: -0.9, z: 0.6, size: 0.8 },
            { asset: 'chick', x: 0.9, z: 0.7, size: 0.45 },
            { asset: 'spoon', x: 0.3, y: 0.8, z: 0.2, size: 0.4 },
          ],
        },
        next: 'sleepy',
      },
      {
        id: 'sleepy',
        picture: {
          backdrop: 'night',
          actors: [
            { asset: 'fire', x: 1.6, z: -0.4, size: 0.7 },
            { asset: 'chicken', x: -0.8, z: 0.4, size: 0.95 },
            { asset: 'chick', x: 0.2, z: 0.6, size: 0.5 },
            { asset: 'crescent-moon', x: -2.3, y: 2.6, z: -1.6, size: 0.5 },
          ],
        },
        choices: [
          { textKey: 'nap', picture: 'bed', to: 'nap' },
          { textKey: 'sing', picture: 'drum', to: 'sing1' },
        ],
      },
      {
        id: 'nap',
        picture: {
          backdrop: 'night',
          actors: [
            { asset: 'chicken', x: -0.2, z: 0.4, size: 1.05 },
            { asset: 'chick', x: 0.6, z: 0.7, size: 0.4 },
            { asset: 'glowing-star', x: -2, y: 2.4, z: -1.5, size: 0.35 },
            { asset: 'star', x: 1.8, y: 2.5, z: -1.5, size: 0.3 },
            { asset: 'full-moon', x: 2.5, y: 2.7, z: -1.7, size: 0.5 },
          ],
        },
        next: 'morning',
      },
      {
        id: 'sing1',
        picture: {
          backdrop: 'night',
          actors: [
            { asset: 'fire', x: 1.4, z: -0.4, size: 0.7 },
            { asset: 'chick', x: -0.6, z: 0.6, size: 0.55, hop: true },
            { asset: 'drum', x: -1.5, z: 0.7, size: 0.45 },
            { asset: 'goat', x: 2.4, z: 0.1, size: 0.9 },
            { asset: 'duck', x: 0.4, z: 0.2, size: 0.7 },
          ],
        },
        next: 'sing2',
      },
      {
        id: 'sing2',
        picture: {
          backdrop: 'night',
          actors: [
            { asset: 'fire', x: 1.8, z: -0.6, size: 0.65 },
            { asset: 'goat', x: -1.4, z: 0.2, size: 1 },
            { asset: 'chick', x: -0.2, z: 0.6, size: 0.5 },
            { asset: 'spoon', x: 0.4, y: 0.5, z: 0.6, size: 0.35 },
          ],
        },
        next: 'morning',
      },
      {
        id: 'morning',
        picture: {
          backdrop: 'mahalla',
          actors: [
            { asset: 'sun', x: 2.3, y: 2.4, z: -1.6, size: 0.75 },
            { asset: 'house', x: -2.1, z: -1.2, size: 1.2 },
            { asset: 'cup', x: 0.3, z: 0.7, size: 0.4 },
            { asset: 'chicken', x: -0.8, z: 0.3, size: 0.95 },
            { asset: 'chick', x: 1.1, z: 0.6, size: 0.5, hop: true },
          ],
        },
        choices: [
          { textKey: 'granny', picture: 'duck', to: 'end-granny' },
          { textKey: 'friends', picture: 'chick', to: 'end-friends' },
        ],
      },
      {
        id: 'end-granny',
        picture: {
          backdrop: 'mahalla',
          actors: [
            { asset: 'house', x: 1.9, z: -1.1, size: 1.3 },
            { asset: 'duck', x: 0.7, z: 0.3, size: 0.85 },
            { asset: 'chick', x: -0.6, z: 0.5, size: 0.5 },
            { asset: 'cup', x: 0.05, z: 0.8, size: 0.35 },
            { asset: 'tulip', x: -2.2, z: 0.7, size: 0.4 },
          ],
        },
        ending: true,
      },
      {
        id: 'end-friends',
        picture: {
          backdrop: 'mahalla',
          actors: [
            { asset: 'blossom', x: 0, y: 1.8, z: -1.2, size: 0.7 },
            { asset: 'chick', x: -1.4, z: 0.5, size: 0.5 },
            { asset: 'hatching-chick', x: -0.4, z: 0.6, size: 0.45 },
            { asset: 'duck', x: 0.7, z: 0.4, size: 0.6 },
            { asset: 'rabbit', x: 1.7, z: 0.4, size: 0.65 },
            { asset: 'cup', x: 0.15, z: 0.9, size: 0.3 },
          ],
        },
        ending: true,
      },
    ],
    questions: [
      { id: 'who-soaked', kind: 'who', page: 'p2', options: ['chicken', 'cow', 'cat'] },
      { id: 'what-grew', kind: 'what', page: 'p2', options: ['seedling', 'mushroom', 'cactus'] },
      { id: 'what-flowers', kind: 'what', page: 'p1', options: ['tulip', 'cactus', 'snowflake'] },
      { id: 'first', kind: 'sequence', page: 'p2', options: ['seedling', 'fire', 'sun'] },
      { id: 'why-turns', kind: 'why', page: 'p3', options: ['full-moon', 'ball', 'snowflake'] },
      {
        id: 'all-felt',
        kind: 'feelings',
        page: 'morning',
        options: ['face:happy', 'face:angry', 'face:scared'],
      },
      {
        id: 'next-spring',
        kind: 'predict',
        page: 'morning',
        options: ['seedling', 'snowman', 'boat'],
      },
    ],
  },

  // ——— PRO: a kind deed at the bazaar ———
  {
    id: 'bazaar-kindness',
    minutes: 3,
    free: false,
    strand: 'language',
    levels: [2, 3, 4, 5],
    cover: 'melon',
    pages: [
      {
        id: 'p1',
        picture: {
          backdrop: 'bazaar',
          actors: [
            { asset: 'melon', x: -2.1, z: -0.2, size: 0.6 },
            { asset: 'grapes', x: 2.2, z: -0.2, size: 0.5 },
            { asset: 'bread', x: 1.4, z: -0.3, size: 0.45 },
            { asset: 'bear', x: -0.6, z: 0.3, size: 1.1 },
            { asset: 'bear', x: 0.5, z: 0.5, size: 0.65, hop: true },
          ],
        },
        next: 'p2',
      },
      {
        id: 'p2',
        picture: {
          backdrop: 'bazaar',
          actors: [
            { asset: 'watermelon', x: 2, z: -0.3, size: 0.6 },
            { asset: 'bear', x: -1.1, z: 0.3, size: 1.1 },
            { asset: 'bear', x: 0.2, z: 0.5, size: 0.65 },
            { asset: 'basket', x: 0.9, z: 0.8, size: 0.45 },
          ],
        },
        next: 'p3',
      },
      {
        id: 'p3',
        picture: {
          backdrop: 'bazaar',
          actors: [
            { asset: 'turtle', x: 1.2, z: 0.2, size: 0.85 },
            { asset: 'apple', x: 0.2, z: 0.8, size: 0.3 },
            { asset: 'apple', x: -0.5, z: 0.9, size: 0.28 },
            { asset: 'apple', x: -1.3, z: 0.7, size: 0.3 },
            { asset: 'bear', x: -2.4, z: 0.4, size: 0.65 },
          ],
        },
        choices: [
          { textKey: 'pick', picture: 'apple', to: 'pick' },
          { textKey: 'basket', picture: 'basket', to: 'basket' },
        ],
      },
      {
        id: 'pick',
        picture: {
          backdrop: 'bazaar',
          actors: [
            { asset: 'turtle', x: 1.6, z: 0.2, size: 0.85 },
            { asset: 'bear', x: -0.2, z: 0.6, size: 0.65, hop: true },
            { asset: 'apple', x: 0.5, z: 0.9, size: 0.3 },
            { asset: 'bear', x: -1.8, z: 0.2, size: 1.05 },
          ],
        },
        next: 'thanks',
      },
      {
        id: 'basket',
        picture: {
          backdrop: 'bazaar',
          actors: [
            { asset: 'turtle', x: 1.3, z: 0.2, size: 0.85 },
            { asset: 'basket', x: 0.4, z: 0.8, size: 0.45 },
            { asset: 'apple', x: 0.4, y: 0.25, z: 0.9, size: 0.25 },
            { asset: 'bear', x: -0.6, z: 0.6, size: 0.65 },
          ],
        },
        next: 'thanks',
      },
      {
        id: 'thanks',
        picture: {
          backdrop: 'bazaar',
          actors: [
            { asset: 'turtle', x: 0.8, z: 0.3, size: 0.9 },
            { asset: 'bear', x: -0.6, z: 0.5, size: 0.65 },
            { asset: 'basket', x: 1.8, z: 0.7, size: 0.45 },
          ],
        },
        next: 'honey',
      },
      {
        id: 'honey',
        picture: {
          backdrop: 'bazaar',
          actors: [
            { asset: 'honey', x: 0.4, z: 0.7, size: 0.45 },
            { asset: 'turtle', x: 1.5, z: 0.3, size: 0.9 },
            { asset: 'bear', x: -0.7, z: 0.5, size: 0.65 },
            { asset: 'bear', x: -2, z: 0.2, size: 1.05 },
          ],
        },
        choices: [
          { textKey: 'home', picture: 'teapot', to: 'end-home' },
          { textKey: 'friend', picture: 'rabbit', to: 'end-friend' },
        ],
      },
      {
        id: 'end-home',
        picture: {
          backdrop: 'evening',
          actors: [
            { asset: 'house', x: 2.1, z: -1.2, size: 1.2 },
            { asset: 'bear', x: -1.4, z: 0.3, size: 1.05 },
            { asset: 'bear', x: -0.2, z: 0.5, size: 0.65 },
            { asset: 'teapot', x: 0.7, z: 0.8, size: 0.4 },
            { asset: 'honey', x: 1.3, z: 0.8, size: 0.35 },
          ],
        },
        ending: true,
      },
      {
        id: 'end-friend',
        picture: {
          backdrop: 'evening',
          actors: [
            { asset: 'house', x: -2.1, z: -1.2, size: 1.2 },
            { asset: 'bear', x: -0.5, z: 0.5, size: 0.65 },
            { asset: 'rabbit', x: 0.8, z: 0.4, size: 0.7 },
            { asset: 'honey', x: 0.15, z: 0.85, size: 0.35 },
            { asset: 'cup', x: 1.6, z: 0.8, size: 0.35 },
          ],
        },
        ending: true,
      },
    ],
    questions: [
      { id: 'whose-bag', kind: 'who', page: 'p3', options: ['turtle', 'cow', 'cat'] },
      { id: 'what-rolled', kind: 'what', page: 'p3', options: ['apple', 'ball', 'egg'] },
      { id: 'what-gift', kind: 'what', page: 'honey', options: ['honey', 'ice-cream', 'candy'] },
      { id: 'first', kind: 'sequence', page: 'p2', options: ['basket', 'apple', 'honey'] },
      { id: 'why-honey', kind: 'why', page: 'honey', options: ['gift', 'clock', 'rain-cloud'] },
      {
        id: 'turtle-felt',
        kind: 'feelings',
        page: 'p3',
        options: ['face:worried', 'face:happy', 'face:angry'],
      },
      { id: 'next-time', kind: 'predict', page: 'thanks', options: ['bear', 'bed', 'ball'] },
    ],
  },

  // ——— PRO: a star-gazing night by the yurt (curiosity) ———
  {
    id: 'star-night',
    minutes: 3,
    free: false,
    strand: 'language',
    levels: [2, 3, 4, 5],
    cover: 'telescope',
    pages: [
      {
        id: 'p1',
        picture: {
          backdrop: 'evening',
          actors: [
            { asset: 'worlds/uz-yurt', x: 1.7, z: -1, size: 2.24 },
            { asset: 'camel', x: -1.2, z: 0.2, size: 1.2 },
            { asset: 'camel', x: 0.1, z: 0.5, size: 0.7, hop: true },
          ],
        },
        next: 'p2',
      },
      {
        id: 'p2',
        picture: {
          backdrop: 'steppe',
          actors: [
            { asset: 'glowing-star', x: -2, y: 2.5, z: -1.5, size: 0.4 },
            { asset: 'star', x: -0.3, y: 2.8, z: -1.6, size: 0.3 },
            { asset: 'glowing-star', x: 1.4, y: 2.4, z: -1.5, size: 0.35 },
            { asset: 'star', x: 2.5, y: 2.9, z: -1.6, size: 0.3 },
            { asset: 'camel', x: 0, z: 0.5, size: 0.7 },
          ],
        },
        next: 'p3',
      },
      {
        id: 'p3',
        picture: {
          backdrop: 'steppe',
          actors: [
            { asset: 'worlds/uz-yurt', x: -1.6, z: -0.9, size: 2.08 },
            { asset: 'owl', x: -1.6, y: 1.5, z: -0.6, size: 0.55 },
            { asset: 'telescope', x: 0.9, z: 0.4, size: 0.75 },
            { asset: 'camel', x: 0, z: 0.6, size: 0.65 },
          ],
        },
        choices: [
          { textKey: 'moon', picture: 'full-moon', to: 'moon' },
          { textKey: 'planet', picture: 'ringed-planet', to: 'planet' },
        ],
      },
      {
        id: 'moon',
        picture: {
          backdrop: 'steppe',
          actors: [
            { asset: 'full-moon', x: 1.3, y: 2, z: -1.4, size: 1.1 },
            { asset: 'telescope', x: -0.4, z: 0.4, size: 0.75 },
            { asset: 'camel', x: -1.4, z: 0.6, size: 0.65 },
          ],
        },
        next: 'shooting',
      },
      {
        id: 'planet',
        picture: {
          backdrop: 'steppe',
          actors: [
            { asset: 'ringed-planet', x: 1.3, y: 2, z: -1.4, size: 1 },
            { asset: 'telescope', x: -0.4, z: 0.4, size: 0.75 },
            { asset: 'owl', x: 0.5, z: 0.5, size: 0.5 },
            { asset: 'camel', x: -1.4, z: 0.6, size: 0.65 },
          ],
        },
        next: 'shooting',
      },
      {
        id: 'shooting',
        picture: {
          backdrop: 'steppe',
          actors: [
            { asset: 'shooting-star', x: -1.6, toX: 1.6, y: 2.4, z: -1.4, size: 0.6 },
            { asset: 'camel', x: -0.2, z: 0.5, size: 0.7 },
            { asset: 'owl', x: 1.2, z: 0.4, size: 0.5 },
          ],
        },
        next: 'travellers',
      },
      {
        id: 'travellers',
        picture: {
          backdrop: 'steppe',
          actors: [
            { asset: 'glowing-star', x: 0.6, y: 2.7, z: -1.6, size: 0.5 },
            { asset: 'camel', x: -1.9, toX: -0.6, z: -0.6, size: 0.9 },
            { asset: 'camel', x: -0.9, toX: 0.4, z: -0.4, size: 0.8 },
            { asset: 'owl', x: 1.9, z: 0.5, size: 0.5 },
          ],
        },
        next: 'sleepy',
      },
      {
        id: 'sleepy',
        picture: {
          backdrop: 'steppe',
          actors: [
            { asset: 'worlds/uz-yurt', x: 1.6, z: -0.9, size: 2.08 },
            { asset: 'camel', x: -0.9, z: 0.3, size: 1.15 },
            { asset: 'camel', x: 0.2, z: 0.6, size: 0.65 },
            { asset: 'owl', x: 1.6, y: 1.4, z: -0.6, size: 0.5 },
          ],
        },
        choices: [
          { textKey: 'thank', picture: 'owl', to: 'end-thank' },
          { textKey: 'count', picture: 'glowing-star', to: 'end-count' },
        ],
      },
      {
        id: 'end-thank',
        picture: {
          backdrop: 'steppe',
          actors: [
            { asset: 'worlds/uz-yurt', x: 1.6, z: -0.9, size: 2.08 },
            { asset: 'camel', x: -0.6, z: 0.4, size: 1.1 },
            { asset: 'camel', x: 0.4, z: 0.6, size: 0.6 },
            { asset: 'ringed-planet', x: -2.2, y: 2.5, z: -1.6, size: 0.45 },
            { asset: 'crescent-moon', x: 2.4, y: 2.7, z: -1.6, size: 0.45 },
          ],
        },
        ending: true,
      },
      {
        id: 'end-count',
        picture: {
          backdrop: 'steppe',
          actors: [
            { asset: 'glowing-star', x: -1.8, y: 2.4, z: -1.5, size: 0.4 },
            { asset: 'glowing-star', x: 0, y: 2.8, z: -1.6, size: 0.4 },
            { asset: 'glowing-star', x: 1.8, y: 2.4, z: -1.5, size: 0.4 },
            { asset: 'camel', x: -0.5, z: 0.4, size: 1.1 },
            { asset: 'camel', x: 0.6, z: 0.6, size: 0.6 },
          ],
        },
        ending: true,
      },
    ],
    questions: [
      { id: 'who-telescope', kind: 'who', page: 'p3', options: ['owl', 'fish', 'cow'] },
      {
        id: 'what-flew',
        kind: 'what',
        page: 'shooting',
        options: ['shooting-star', 'kite', 'balloon'],
      },
      { id: 'where-live', kind: 'what', page: 'p1', options: ['worlds/uz-yurt', 'castle', 'boat'] },
      {
        id: 'first',
        kind: 'sequence',
        page: 'p2',
        options: ['glowing-star', 'shooting-star', 'bed'],
      },
      {
        id: 'why-stars',
        kind: 'why',
        page: 'travellers',
        options: ['glowing-star', 'cookie', 'umbrella'],
      },
      {
        id: 'felt-shooting',
        kind: 'feelings',
        page: 'shooting',
        options: ['face:surprised', 'face:angry', 'face:sad'],
      },
      {
        id: 'tomorrow',
        kind: 'predict',
        page: 'sleepy',
        options: ['shooting-star', 'fish', 'snowman'],
      },
    ],
  },

  // ——— PRO: hashar day in the mahalla (helping, safety) ———
  {
    id: 'mahalla-hashar',
    minutes: 3,
    free: false,
    strand: 'language',
    levels: [2, 3, 4, 5],
    cover: 'seedling',
    pages: [
      {
        id: 'p1',
        picture: {
          backdrop: 'mahalla',
          actors: [
            { asset: 'house', x: -2.1, z: -1.2, size: 1.2 },
            { asset: 'house', x: 2.1, z: -1.2, size: 1.1 },
            { asset: 'dog', x: -0.8, z: 0.3, size: 1 },
            { asset: 'cat', x: 0.4, z: 0.5, size: 0.65, hop: true },
            { asset: 'goat', x: 1.6, z: 0.2, size: 0.85 },
          ],
        },
        next: 'p2',
      },
      {
        id: 'p2',
        picture: {
          backdrop: 'mahalla',
          actors: [
            { asset: 'house', x: 2, z: -1.2, size: 1.2 },
            { asset: 'cat', x: -0.6, z: 0.5, size: 0.65 },
            { asset: 'bucket', x: 0.2, z: 0.7, size: 0.4 },
            { asset: 'seedling', x: 1.2, z: 0.6, size: 0.45 },
          ],
        },
        next: 'p3',
      },
      {
        id: 'p3',
        picture: {
          backdrop: 'mahalla',
          actors: [
            { asset: 'seedling', x: -1.6, z: 0.4, size: 0.45 },
            { asset: 'seedling', x: -0.2, z: 0.4, size: 0.45 },
            { asset: 'seedling', x: 1.2, z: 0.4, size: 0.45 },
            { asset: 'dog', x: 2.2, z: 0.2, size: 1 },
            { asset: 'cat', x: -2.4, toX: -0.9, z: 0.7, size: 0.6 },
          ],
        },
        next: 'nest',
      },
      {
        id: 'nest',
        picture: {
          backdrop: 'mahalla',
          actors: [
            { asset: 'tree', x: 0.9, z: -0.9, size: 2 },
            { asset: 'nest', x: 0.3, z: 0.8, size: 0.45 },
            { asset: 'bird', x: 1.5, y: 1.9, z: -0.5, size: 0.4 },
            { asset: 'cat', x: -1.3, z: 0.6, size: 0.65 },
          ],
        },
        choices: [
          { textKey: 'call', picture: 'dog', to: 'call' },
          { textKey: 'guard', picture: 'nest', to: 'guard' },
        ],
      },
      {
        id: 'call',
        picture: {
          backdrop: 'mahalla',
          actors: [
            { asset: 'cat', x: 1.8, toX: 0.4, z: 0.6, size: 0.6 },
            { asset: 'dog', x: -1, z: 0.3, size: 1 },
            { asset: 'house', x: -2.2, z: -1.2, size: 1.1 },
          ],
        },
        next: 'ladder',
      },
      {
        id: 'guard',
        picture: {
          backdrop: 'mahalla',
          actors: [
            { asset: 'tree', x: 1.2, z: -0.9, size: 2 },
            { asset: 'nest', x: 0.4, z: 0.8, size: 0.45 },
            { asset: 'maple-leaf', x: -0.1, y: 0.6, z: 0.8, size: 0.35 },
            { asset: 'cat', x: -0.7, z: 0.6, size: 0.6 },
          ],
        },
        next: 'ladder',
      },
      {
        id: 'ladder',
        picture: {
          backdrop: 'mahalla',
          actors: [
            { asset: 'tree', x: 0.8, z: -0.9, size: 2.1 },
            { asset: 'nest', x: 0.8, y: 1.9, z: -0.6, size: 0.4 },
            { asset: 'bird', x: 1.6, y: 2.2, z: -0.6, size: 0.4 },
            { asset: 'dog', x: -0.3, z: 0.3, size: 1 },
            { asset: 'cat', x: -1.6, z: 0.6, size: 0.6, hop: true },
          ],
        },
        next: 'table',
      },
      {
        id: 'table',
        picture: {
          backdrop: 'evening',
          actors: [
            { asset: 'tree', x: -2.2, z: -1, size: 1.4 },
            { asset: 'bread', x: -0.6, z: 0.8, size: 0.4 },
            { asset: 'grapes', x: 0.1, z: 0.8, size: 0.4 },
            { asset: 'teapot', x: 0.8, z: 0.8, size: 0.4 },
            { asset: 'cat', x: -1.4, z: 0.4, size: 0.6 },
            { asset: 'dog', x: 1.8, z: 0.3, size: 0.95 },
          ],
        },
        ending: true,
      },
    ],
    questions: [
      { id: 'who-fixed', kind: 'who', page: 'ladder', options: ['dog', 'cow', 'fish'] },
      { id: 'what-fell', kind: 'what', page: 'nest', options: ['nest', 'apple', 'ball'] },
      { id: 'what-carried', kind: 'what', page: 'p2', options: ['bucket', 'umbrella', 'drum'] },
      { id: 'first', kind: 'sequence', page: 'p3', options: ['seedling', 'nest', 'teapot'] },
      { id: 'why-ladder', kind: 'why', page: 'ladder', options: ['nest', 'apple', 'kite'] },
      {
        id: 'bird-felt',
        kind: 'feelings',
        page: 'ladder',
        options: ['face:happy', 'face:angry', 'face:scared'],
      },
      { id: 'next-hashar', kind: 'predict', page: 'table', options: ['bucket', 'bed', 'car'] },
    ],
  },
]

export const STORY_TEXT: Record<Language, Readonly<Record<string, StoryText>>> = {
  uz: STORY_TEXT_UZ,
  ru: STORY_TEXT_RU,
  en: STORY_TEXT_EN,
}

export function storyById(id: string): StorySpec | undefined {
  return STORIES.find((story) => story.id === id)
}

/** A story's words in a language (Uzbek if that language misses it; the validator forbids that). */
export function storyText(language: Language, id: string): StoryText {
  const text = STORY_TEXT[language][id] ?? STORY_TEXT.uz[id]
  if (!text) throw new Error(`no text for story ${id}`)
  return text
}

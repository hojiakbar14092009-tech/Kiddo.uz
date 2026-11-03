import type { PagePicture } from '@/features/stories/types'
import type { StoryBackdrop } from '@/features/stories/backdrops'

/*
 * «O‘z ertagim» (Phase 49): the child makes a story from picture cards in
 * four steps – a hero, a place, a helper and an ending (twelve cards each since
 * Phase 73). Every spoken
 * sentence is fixed and complete (no blanks filled in at run time), so each
 * can be recorded once: every choice has its own sentences in the locales
 * (myStory.say.<step>.<id>), the shared ones speak of "our friend", and the
 * Russian ones keep one grammatical gender (all heroes are masculine nouns).
 */

export const STORY_STEPS = ['hero', 'place', 'helper', 'ending'] as const
export type StoryStep = (typeof STORY_STEPS)[number]

export const HEROES = [
  'rabbit',
  'cat',
  'dog',
  'penguin',
  'bear',
  'fox',
  'elephant',
  'lion',
  'turtle',
  'owl',
  'unicorn',
  'dinosaur',
] as const
export const PLACES = [
  'forest',
  'space',
  'sea',
  'city',
  'mountains',
  'desert',
  'north',
  'garden',
  'castle',
  'farm',
  'bazaar',
  'island',
] as const
export const HELPERS = [
  'umbrella',
  'lantern',
  'key',
  'balloon',
  'kite',
  'telescope',
  'boat',
  'bicycle',
  'book',
  'bell',
  'paintbrush',
  'trumpet',
] as const
export const ENDINGS = [
  'party',
  'home',
  'friend',
  'treasure',
  'wish',
  'rainbow',
  'picnic',
  'concert',
  'sleep',
  'plant',
  'prize',
  'lights',
] as const

export type HeroId = (typeof HEROES)[number]
export type PlaceId = (typeof PLACES)[number]
export type HelperId = (typeof HELPERS)[number]
export type EndingId = (typeof ENDINGS)[number]

export interface StoryChoices {
  hero: HeroId
  place: PlaceId
  helper: HelperId
  ending: EndingId
}

export const STEP_OPTIONS: Record<StoryStep, readonly string[]> = {
  hero: HEROES,
  place: PLACES,
  helper: HELPERS,
  ending: ENDINGS,
}

/** The question of each step (an i18n key, said aloud). */
export const STEP_PROMPT: Record<StoryStep, string> = {
  hero: 'myStory.say.pickHero',
  place: 'myStory.say.pickPlace',
  helper: 'myStory.say.pickHelper',
  ending: 'myStory.say.pickEnding',
}

/** The picture (public/3d) of each choice card. */
export const CHOICE_PICTURE: Record<StoryStep, Record<string, string>> = {
  hero: {
    rabbit: 'rabbit',
    cat: 'cat',
    dog: 'dog',
    penguin: 'penguin',
    bear: 'bear',
    fox: 'fox',
    elephant: 'elephant',
    lion: 'lion',
    turtle: 'turtle',
    owl: 'owl',
    unicorn: 'unicorn',
    dinosaur: 'dinosaur',
  },
  place: {
    forest: 'tree',
    space: 'ringed-planet',
    sea: 'wave',
    city: 'house',
    mountains: 'mountain',
    desert: 'cactus',
    north: 'snowflake',
    garden: 'sunflower',
    castle: 'castle',
    farm: 'tractor',
    bazaar: 'watermelon',
    island: 'volcano',
  },
  helper: {
    umbrella: 'umbrella',
    lantern: 'lamp',
    key: 'key',
    balloon: 'balloon',
    kite: 'kite',
    telescope: 'telescope',
    boat: 'boat',
    bicycle: 'bicycle',
    book: 'book',
    bell: 'bell',
    paintbrush: 'paintbrush',
    trumpet: 'trumpet',
  },
  ending: {
    party: 'gift',
    home: 'house',
    friend: 'hedgehog',
    treasure: 'crown',
    wish: 'shooting-star',
    rainbow: 'rainbow',
    picnic: 'pie',
    concert: 'guitar',
    sleep: 'crescent-moon',
    plant: 'seedling',
    prize: 'trophy',
    lights: 'sparkles',
  },
}

/** Each place's look in the story pictures (the stories' own backdrops) and what stands in it. */
const PLACE_SCENE: Record<PlaceId, { backdrop: StoryBackdrop; props: PagePicture['actors'] }> = {
  forest: {
    backdrop: 'meadow',
    props: [
      { asset: 'tree', x: -2.6, z: -1, size: 1.6 },
      { asset: 'tree', x: 2.6, z: -1.5, size: 1.4 },
    ],
  },
  space: {
    backdrop: 'steppe',
    props: [
      { asset: 'ringed-planet', x: 2.2, y: 3.2, z: -2, size: 1.1 },
      { asset: 'rocket', x: -2.4, z: -1, size: 1.3 },
    ],
  },
  sea: {
    backdrop: 'pond',
    props: [
      { asset: 'wave', x: 2.2, z: -1, size: 1.2 },
      { asset: 'whale', x: 2.8, y: 0.6, z: -2, size: 0.9 },
    ],
  },
  city: {
    backdrop: 'mahalla',
    props: [
      { asset: 'house', x: -2.5, z: -1.5, size: 1.5 },
      { asset: 'bus', x: 2.4, z: -1, size: 1.2 },
    ],
  },
  mountains: {
    backdrop: 'mountains',
    props: [
      { asset: 'mountain', x: -2.5, z: -1.5, size: 1.6 },
      { asset: 'pine', x: 2.5, z: -1, size: 1.3 },
    ],
  },
  desert: {
    backdrop: 'steppe',
    props: [
      { asset: 'cactus', x: -2.4, z: -1, size: 1.3 },
      { asset: 'camel', x: 2.4, z: -1.5, size: 1.4 },
    ],
  },
  north: {
    backdrop: 'winter',
    props: [
      { asset: 'snowman', x: -2.4, z: -1, size: 1.3 },
      { asset: 'penguin', x: 2.4, z: -1.5, size: 1.0 },
    ],
  },
  garden: {
    backdrop: 'garden',
    props: [
      { asset: 'sunflower', x: -2.5, z: -1, size: 1.4 },
      { asset: 'tulip', x: 2.4, z: -1, size: 1.0 },
    ],
  },
  castle: {
    backdrop: 'evening',
    props: [
      { asset: 'castle', x: 2.3, z: -1.8, size: 1.8 },
      { asset: 'crown', x: -2.4, y: 2.6, z: -2, size: 0.7 },
    ],
  },
  farm: {
    backdrop: 'farm',
    props: [
      { asset: 'tractor', x: -2.4, z: -1, size: 1.3 },
      { asset: 'cow', x: 2.5, z: -1.5, size: 1.2 },
    ],
  },
  bazaar: {
    backdrop: 'bazaar',
    props: [
      { asset: 'watermelon', x: -2.4, z: -1, size: 1.0 },
      { asset: 'melon', x: 2.4, z: -1, size: 1.0 },
    ],
  },
  island: {
    backdrop: 'pond',
    props: [
      { asset: 'volcano', x: 2.4, z: -1.8, size: 1.6 },
      { asset: 'crab', x: -2.3, z: -0.5, size: 0.8 },
    ],
  },
}

export interface StoryCard {
  id: StoryStep
  /** i18n keys of the card's sentences, in order (each is a fixed, recordable sentence). */
  lines: readonly string[]
  picture: PagePicture
}

/** The made story as four picture cards with their sentences. */
export function storyCards(choices: StoryChoices): StoryCard[] {
  const scene = PLACE_SCENE[choices.place]
  const hero = { asset: CHOICE_PICTURE.hero[choices.hero]!, x: -0.6, z: 0.5, hop: true }
  const at = (extra: PagePicture['actors']): PagePicture => ({
    backdrop: scene.backdrop,
    actors: [...scene.props, hero, ...extra],
  })
  return [
    {
      id: 'hero',
      lines: [`myStory.say.hero.${choices.hero}`, 'myStory.say.heroDream'],
      picture: { backdrop: 'mahalla', actors: [{ ...hero, x: 0 }] },
    },
    {
      id: 'place',
      lines: [`myStory.say.place.${choices.place}.a`, `myStory.say.place.${choices.place}.b`],
      picture: at([]),
    },
    {
      id: 'helper',
      lines: [`myStory.say.helper.${choices.helper}.a`, `myStory.say.helper.${choices.helper}.b`],
      picture: at([{ asset: CHOICE_PICTURE.helper[choices.helper]!, x: 1, z: 0.5, size: 0.8 }]),
    },
    {
      id: 'ending',
      lines: [
        `myStory.say.ending.${choices.ending}.a`,
        `myStory.say.ending.${choices.ending}.b`,
        'myStory.say.theEnd',
      ],
      picture: at([{ asset: CHOICE_PICTURE.ending[choices.ending]!, x: 1.2, z: 0.5, size: 0.9 }]),
    },
  ]
}

/** Every sentence key a story can say (for tests: all exist and are short). */
export function allStoryLineKeys(): string[] {
  const keys = new Set<string>(Object.values(STEP_PROMPT))
  keys.add('myStory.say.ready')
  for (const hero of HEROES)
    for (const place of PLACES)
      for (const helper of HELPERS)
        for (const ending of ENDINGS)
          for (const card of storyCards({ hero, place, helper, ending }))
            card.lines.forEach((key) => keys.add(key))
  return [...keys]
}

export function isStoryChoices(value: unknown): value is StoryChoices {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return (
    (HEROES as readonly unknown[]).includes(item.hero) &&
    (PLACES as readonly unknown[]).includes(item.place) &&
    (HELPERS as readonly unknown[]).includes(item.helper) &&
    (ENDINGS as readonly unknown[]).includes(item.ending)
  )
}

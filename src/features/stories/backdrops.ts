import { BACKDROPS, type BackdropLook } from '@/features/tales/backdrops'
import type { Backdrop } from '@/features/tales/content'

/*
 * The places of the stories: the tales' places, plus a few of our own
 * (mountain pastures, the mahalla street, the bazaar, an evening and a
 * steppe night). Same shape as the tales' looks, so the flat picture draws
 * them the same way.
 */

export type StoryBackdrop = Backdrop | 'mountains' | 'mahalla' | 'bazaar' | 'evening' | 'steppe'

export interface StoryLook extends BackdropLook {
  /** Coloured market awnings across the top. */
  awnings?: boolean
  /** Far mountain peaks behind the hill. */
  peaks?: string
}

export const STORY_BACKDROPS: Record<StoryBackdrop, StoryLook> = {
  ...BACKDROPS,
  mountains: {
    sky: '#9FD8FF',
    skyLow: '#E4F5FF',
    ground: '#9BCF7A',
    hill: '#7DB86A',
    path: '#D8C9A0',
    trees: 0,
    leaf: '#5DA65E',
    peaks: '#B9C7D8',
  },
  mahalla: {
    sky: '#A8DCFF',
    skyLow: '#EAF7FF',
    ground: '#E8D6B0',
    hill: '#B9DDA0',
    path: '#F3E6C8',
    trees: 2,
    leaf: '#5DB06A',
  },
  bazaar: {
    sky: '#B3E0FF',
    skyLow: '#F1FAFF',
    ground: '#E9D2A6',
    hill: '#D9BC88',
    path: '#F5E7C6',
    trees: 0,
    leaf: '#5DB06A',
    awnings: true,
  },
  evening: {
    sky: '#F6A97A',
    skyLow: '#FFE1B8',
    ground: '#93C57A',
    hill: '#7BAF6A',
    path: '#E2CB9A',
    trees: 2,
    leaf: '#4E9C58',
  },
  steppe: {
    sky: '#1F2A5C',
    skyLow: '#47508C',
    ground: '#B69A66',
    hill: '#9C8456',
    path: '#CDB888',
    trees: 0,
    stars: true,
    leaf: '#6F8A57',
  },
}

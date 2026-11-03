/*
 * Sorting games (Phase 67): one thing at a time goes to the right place.
 * "Who lives where?" (animals to their homes) and "The healthy plate" (food for
 * every day, and treats for sometimes) share these rules and one screen. Pure.
 */

export interface SortItem {
  id: string
  /** The app's 3D picture. */
  picture: string
  bin: string
}

export interface SortSet {
  bins: readonly { id: string; picture: string }[]
  items: readonly SortItem[]
}

export const HABITATS: SortSet = {
  bins: [
    { id: 'forest', picture: 'pine' },
    { id: 'sea', picture: 'wave' },
    { id: 'desert', picture: 'cactus' },
    { id: 'ice', picture: 'snowflake' },
  ],
  items: [
    { id: 'fox', picture: 'fox', bin: 'forest' },
    { id: 'whale', picture: 'whale', bin: 'sea' },
    { id: 'camel', picture: 'camel', bin: 'desert' },
    { id: 'penguin', picture: 'penguin', bin: 'ice' },
    { id: 'bear', picture: 'bear', bin: 'forest' },
    { id: 'dolphin', picture: 'dolphin', bin: 'sea' },
    { id: 'lizard', picture: 'lizard', bin: 'desert' },
    { id: 'fish', picture: 'fish', bin: 'sea' },
  ],
}

/** Food is never "bad": some is for every day, some is a treat for sometimes. */
export const PLATE: SortSet = {
  bins: [
    { id: 'everyday', picture: 'apple' },
    { id: 'sometimes', picture: 'candy' },
  ],
  items: [
    { id: 'carrot', picture: 'carrot', bin: 'everyday' },
    { id: 'candy', picture: 'candy', bin: 'sometimes' },
    { id: 'milk', picture: 'milk', bin: 'everyday' },
    { id: 'doughnut', picture: 'doughnut', bin: 'sometimes' },
    { id: 'banana', picture: 'banana', bin: 'everyday' },
    { id: 'lollipop', picture: 'lollipop', bin: 'sometimes' },
    { id: 'cucumber', picture: 'cucumber', bin: 'everyday' },
    { id: 'cookie', picture: 'cookie', bin: 'sometimes' },
  ],
}

export function belongs(item: SortItem, bin: string): boolean {
  return item.bin === bin
}

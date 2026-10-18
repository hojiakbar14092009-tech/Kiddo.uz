/** Where on the robot an item sits; one item per slot, so up to four at once. */
export type OutfitSlot = 'head' | 'ear' | 'face' | 'neck'

export const OUTFIT_IDS = ['flower', 'bowtie', 'cap', 'scarf', 'glasses', 'crown'] as const
export type OutfitId = (typeof OUTFIT_IDS)[number]

export interface Outfit {
  id: OutfitId
  slot: OutfitSlot
  price: number
  emoji: string
}

/** What the robot is wearing right now. */
export type Wearing = Partial<Record<OutfitSlot, OutfitId>>

/**
 * Prices are set so a child reaches the first item after two or three games
 * and the crown after roughly a week of daily plans – a goal, not a grind.
 */
export const OUTFITS: readonly Outfit[] = [
  { id: 'flower', slot: 'ear', price: 10, emoji: '🌼' },
  { id: 'bowtie', slot: 'neck', price: 12, emoji: '🎀' },
  { id: 'cap', slot: 'head', price: 15, emoji: '🧢' },
  { id: 'scarf', slot: 'neck', price: 15, emoji: '🧣' },
  { id: 'glasses', slot: 'face', price: 20, emoji: '👓' },
  { id: 'crown', slot: 'head', price: 40, emoji: '👑' },
]

export function isOutfitId(value: unknown): value is OutfitId {
  return typeof value === 'string' && (OUTFIT_IDS as readonly string[]).includes(value)
}

export function findOutfit(id: string): Outfit | undefined {
  return OUTFITS.find((outfit) => outfit.id === id)
}

/** Shared colours, so the 2D and the 3D robot wear exactly the same things. */
export const OUTFIT_COLORS = {
  cap: { main: '#5B8DEF', dark: '#3D6AC4' },
  crown: { main: '#FFC93C', dark: '#E0A21B', gem: '#F27BA6' },
  flower: { petal: '#B79CF0', centre: '#FFC93C' },
  glasses: { frame: '#FFC93C' },
  scarf: { main: '#F28C6B', dark: '#D96A4A' },
  bowtie: { main: '#5B8DEF', dark: '#3D6AC4' },
} as const

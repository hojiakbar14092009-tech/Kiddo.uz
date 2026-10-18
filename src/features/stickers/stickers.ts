export interface Sticker {
  id: string
  emoji: string
}

/** Collectible stickers, earned one per finished task until the album is full. */
export const STICKERS: readonly Sticker[] = [
  { id: 'rainbow', emoji: '🌈' },
  { id: 'unicorn', emoji: '🦄' },
  { id: 'rocket', emoji: '🚀' },
  { id: 'star', emoji: '🌟' },
  { id: 'panda', emoji: '🐼' },
  { id: 'butterfly', emoji: '🦋' },
  { id: 'car', emoji: '🚗' },
  { id: 'cupcake', emoji: '🧁' },
  { id: 'dino', emoji: '🦕' },
  { id: 'balloon', emoji: '🎈' },
  { id: 'turtle', emoji: '🐢' },
  { id: 'flower', emoji: '🌻' },
  { id: 'octopus', emoji: '🐙' },
  { id: 'plane', emoji: '✈️' },
  { id: 'fox', emoji: '🦊' },
  { id: 'cake', emoji: '🍰' },
  { id: 'whale', emoji: '🐳' },
  { id: 'crown', emoji: '👑' },
  { id: 'koala', emoji: '🐨' },
  { id: 'kite', emoji: '🪁' },
  { id: 'ladybug', emoji: '🐞' },
  { id: 'teddy', emoji: '🧸' },
  { id: 'penguin', emoji: '🐧' },
  { id: 'trophy', emoji: '🏆' },
]

export function findSticker(id: string): Sticker | undefined {
  return STICKERS.find((sticker) => sticker.id === id)
}

/** The next sticker the child does not have yet, or `null` when the album is full. */
export function nextSticker(owned: readonly string[]): Sticker | null {
  return STICKERS.find((sticker) => !owned.includes(sticker.id)) ?? null
}

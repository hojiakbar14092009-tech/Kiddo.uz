/** Where on the robot an item sits; one item per slot, so up to four at once. */
export type OutfitSlot = 'head' | 'ear' | 'face' | 'neck'

export const OUTFIT_IDS = [
  'flower',
  'bowtie',
  'cap',
  'scarf',
  'glasses',
  'crown',
  'sunglasses',
  'headband',
  'whistle',
  'goggles',
  'headset',
  'explorer-hat',
  'compass',
  'beret',
  'doppi',
  'headphones',
  'tie',
  'winter-hat',
] as const
export type OutfitId = (typeof OUTFIT_IDS)[number]

/**
 * Wardrobe categories (Phase 31). Every item is open to every child: no
 * gender lock and no age lock; age only changes which categories are shown
 * first and the colours an item is drawn in (characterStyle).
 */
export const OUTFIT_CATEGORIES = [
  'casual',
  'sport',
  'science',
  'space',
  'explorer',
  'creative',
  'traditional',
  'tech',
  'smart',
  'seasonal',
] as const
export type OutfitCategory = (typeof OUTFIT_CATEGORIES)[number]

export interface Outfit {
  id: OutfitId
  slot: OutfitSlot
  category: OutfitCategory
  price: number
}

/** What the robot is wearing right now. */
export type Wearing = Partial<Record<OutfitSlot, OutfitId>>

/**
 * Prices are set so a child reaches the first item after two or three games
 * and the crown after roughly a week of daily plans – a goal, not a grind.
 * The server keeps the same list (migrations 0009 and 0015).
 */
export const OUTFITS: readonly Outfit[] = [
  { id: 'flower', slot: 'ear', category: 'creative', price: 10 },
  { id: 'bowtie', slot: 'neck', category: 'smart', price: 12 },
  { id: 'cap', slot: 'head', category: 'casual', price: 15 },
  { id: 'scarf', slot: 'neck', category: 'seasonal', price: 15 },
  { id: 'glasses', slot: 'face', category: 'smart', price: 20 },
  { id: 'crown', slot: 'head', category: 'creative', price: 40 },
  { id: 'sunglasses', slot: 'face', category: 'casual', price: 18 },
  { id: 'headband', slot: 'head', category: 'sport', price: 12 },
  { id: 'whistle', slot: 'neck', category: 'sport', price: 14 },
  { id: 'goggles', slot: 'face', category: 'science', price: 20 },
  { id: 'headset', slot: 'ear', category: 'space', price: 22 },
  { id: 'explorer-hat', slot: 'head', category: 'explorer', price: 20 },
  { id: 'compass', slot: 'neck', category: 'explorer', price: 16 },
  { id: 'beret', slot: 'head', category: 'creative', price: 16 },
  { id: 'doppi', slot: 'head', category: 'traditional', price: 25 },
  { id: 'headphones', slot: 'ear', category: 'tech', price: 24 },
  { id: 'tie', slot: 'neck', category: 'smart', price: 14 },
  { id: 'winter-hat', slot: 'head', category: 'seasonal', price: 15 },
]

export function isOutfitId(value: unknown): value is OutfitId {
  return typeof value === 'string' && (OUTFIT_IDS as readonly string[]).includes(value)
}

export function findOutfit(id: string): Outfit | undefined {
  return OUTFITS.find((outfit) => outfit.id === id)
}

/** Shared colours, so the 2D and the 3D robot wear exactly the same things (bright tone). */
export const OUTFIT_COLORS = {
  cap: { main: '#5B8DEF', dark: '#3D6AC4' },
  crown: { main: '#FFC93C', dark: '#E0A21B', gem: '#F27BA6' },
  flower: { petal: '#B79CF0', centre: '#FFC93C' },
  glasses: { frame: '#FFC93C' },
  scarf: { main: '#F28C6B', dark: '#D96A4A' },
  bowtie: { main: '#5B8DEF', dark: '#3D6AC4' },
  sunglasses: { frame: '#2B2A4C', lens: '#3C4F86' },
  headband: { main: '#2FB59A', stripe: '#FFFFFF' },
  whistle: { main: '#FFC93C', cord: '#E2574C' },
  goggles: { frame: '#3FC1C9', lens: '#BDEFF2', strap: '#2B2A4C' },
  headset: { main: '#ECEFF6', dark: '#7C5CE6', mic: '#2B2A4C' },
  'explorer-hat': { main: '#C9A56A', dark: '#8E6B36', band: '#3A9B52' },
  compass: { main: '#E0A21B', face: '#FFF6C9', needle: '#E2574C' },
  beret: { main: '#E2574C', dark: '#B33A31' },
  doppi: { main: '#1D2A52', pattern: '#FFFFFF', edge: '#3FB5A0' },
  headphones: { main: '#2B2A4C', pad: '#7C5CE6', light: '#7FE8FF' },
  tie: { main: '#3C4F86', dark: '#2B3B6B', knot: '#2B3B6B' },
  'winter-hat': { main: '#5B8DEF', band: '#ECEFF6', pom: '#FFFFFF' },
} as const satisfies Record<OutfitId, Record<string, string>>

/**
 * How an item's colours are shown for the learner's visual maturity
 * (characterStyle): bright for the youngest, rich in the middle, muted and
 * modern for older learners. The same item, the same shape.
 */
export type OutfitTone = 'bright' | 'rich' | 'muted'

function hexToHsl(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h =
    max === r
      ? ((g - b) / d + (g < b ? 6 : 0)) / 6
      : max === g
        ? ((b - r) / d + 2) / 6
        : ((r - g) / d + 4) / 6
  return [h, s, l]
}

function hslToHex(h: number, s: number, l: number): string {
  const f = (n: number) => {
    const k = (n + h * 12) % 12
    const a = s * Math.min(l, 1 - l)
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase()
}

/** One colour in a tone: rich is a little deeper, muted much calmer and darker. */
export function toneColor(hex: string, tone: OutfitTone): string {
  if (tone === 'bright') return hex.toUpperCase()
  const [h, s, l] = hexToHsl(hex)
  // white and near-white details (stripes, pads) stay light
  if (l > 0.9) return hex.toUpperCase()
  return tone === 'rich'
    ? hslToHex(h, s * 0.85, l * 0.92)
    : hslToHex(h, s * 0.45, Math.min(l, 0.62) * 0.82)
}

const SMALL_DETAILS = new Set(['needle', 'gem', 'light', 'centre'])

/** An item's colours in a tone (the 2D and the 3D robot both use this). */
export function outfitColors<K extends OutfitId>(
  id: K,
  tone: OutfitTone,
): { [P in keyof (typeof OUTFIT_COLORS)[K]]: string } {
  const base = OUTFIT_COLORS[id] as Record<string, string>
  return Object.fromEntries(
    Object.entries(base).map(([key, hex]) => [
      key,
      // small details that must stay readable (a needle, a gem, a light) are never muted
      toneColor(hex, tone === 'muted' && SMALL_DETAILS.has(key) ? 'rich' : tone),
    ]),
  ) as { [P in keyof (typeof OUTFIT_COLORS)[K]]: string }
}

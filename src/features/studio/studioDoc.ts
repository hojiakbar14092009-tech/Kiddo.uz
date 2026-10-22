/*
 * A Creative Studio picture as plain data, so undo/redo, drawing on screen
 * and the saved PNG all come from the same thing. Positions are fractions of
 * the board (0–1, x of its width, y of its height); line widths and sticker
 * sizes are fractions of its width, so a picture looks the same after the
 * screen turns.
 */

export const BOARD_ASPECT = 4 / 3

export interface StudioPoint {
  x: number
  y: number
}

export interface StudioStroke {
  id: string
  color: string
  /** Line width as a fraction of the board width. */
  size: number
  /** The eraser takes paint away (the background stays). */
  erase: boolean
  points: StudioPoint[]
}

export interface PlacedSticker {
  id: string
  /** A picture in public/3d. */
  name: StickerName
  /** Centre, as fractions of the board. */
  x: number
  y: number
  /** Width as a fraction of the board width. */
  size: number
}

export interface StudioDoc {
  background: BackgroundId
  strokes: readonly StudioStroke[]
  stickers: readonly PlacedSticker[]
}

export const PALETTE = [
  { id: 'red', color: '#E53935' },
  { id: 'orange', color: '#FB8C00' },
  { id: 'yellow', color: '#FDD835' },
  { id: 'green', color: '#43A047' },
  { id: 'teal', color: '#00ACC1' },
  { id: 'blue', color: '#1E88E5' },
  { id: 'purple', color: '#8E24AA' },
  { id: 'pink', color: '#EC407A' },
  { id: 'brown', color: '#8D6E63' },
  { id: 'black', color: '#3A2E4D' },
] as const
export type ColorId = (typeof PALETTE)[number]['id']

export const BRUSH_SIZES = [
  { id: 'small', size: 0.012 },
  { id: 'medium', size: 0.028 },
  { id: 'large', size: 0.055 },
] as const
export type BrushSizeId = (typeof BRUSH_SIZES)[number]['id']
/** The eraser is a bit wider than the brush of the same size. */
export const ERASER_SCALE = 1.6

export const BACKGROUNDS = [
  { id: 'paper', color: '#FFFFFF' },
  { id: 'cream', color: '#FFF6E0' },
  { id: 'sky', color: '#E3F2FF' },
  { id: 'mint', color: '#E3F7EC' },
  { id: 'dots', color: '#FFF8EC', dots: '#E4D8F5' },
] as const
export type BackgroundId = (typeof BACKGROUNDS)[number]['id']
/** Dots pattern: this many dots across and down the board. */
export const DOTS_ACROSS = 24
export const DOTS_DOWN = 18

export const STICKERS = [
  'sun',
  'star',
  'rainbow',
  'cloud',
  'butterfly',
  'cat',
  'dog',
  'rabbit',
  'fish',
  'unicorn',
  'tree',
  'tulip',
  'house',
  'rocket',
  'car',
  'balloon',
] as const
export type StickerName = (typeof STICKERS)[number]

export const STICKER_SIZE = { initial: 0.2, min: 0.08, max: 0.6, step: 1.25 } as const

export function emptyDoc(background: BackgroundId = 'paper'): StudioDoc {
  return { background, strokes: [], stickers: [] }
}

export function isEmptyDoc(doc: StudioDoc): boolean {
  return doc.strokes.every((stroke) => stroke.erase) && doc.stickers.length === 0
}

/**
 * Saving needs a real picture: a few lines of paint (each longer than a dot)
 * and/or stickers, together at least `marks`. A tap or two cannot be saved.
 */
export const SAVE_MINIMUM = { marks: 3, strokeLength: 0.05 } as const

function paintLength(stroke: StudioStroke): number {
  let length = 0
  for (let i = 1; i < stroke.points.length; i += 1) {
    const a = stroke.points[i - 1]
    const b = stroke.points[i]
    if (a && b) length += Math.hypot(b.x - a.x, b.y - a.y)
  }
  return length
}

export function hasEnoughToSave(doc: StudioDoc): boolean {
  const lines = doc.strokes.filter(
    (stroke) => !stroke.erase && paintLength(stroke) >= SAVE_MINIMUM.strokeLength,
  ).length
  return lines + doc.stickers.length >= SAVE_MINIMUM.marks
}

export function addStroke(doc: StudioDoc, stroke: StudioStroke): StudioDoc {
  return stroke.points.length === 0 ? doc : { ...doc, strokes: [...doc.strokes, stroke] }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function clampSticker(sticker: PlacedSticker): PlacedSticker {
  return {
    ...sticker,
    x: clamp(sticker.x, 0, 1),
    y: clamp(sticker.y, 0, 1),
    size: clamp(sticker.size, STICKER_SIZE.min, STICKER_SIZE.max),
  }
}

/** A new sticker near the middle, a little shifted from the last one so they don't hide each other. */
export function addSticker(doc: StudioDoc, name: StickerName, id: string): StudioDoc {
  const shift = (doc.stickers.length % 5) * 0.06 - 0.12
  const sticker = clampSticker({
    id,
    name,
    x: 0.5 + shift,
    y: 0.5 + shift,
    size: STICKER_SIZE.initial,
  })
  return { ...doc, stickers: [...doc.stickers, sticker] }
}

export function updateSticker(doc: StudioDoc, next: PlacedSticker): StudioDoc {
  return {
    ...doc,
    stickers: doc.stickers.map((sticker) =>
      sticker.id === next.id ? clampSticker(next) : sticker,
    ),
  }
}

export function resizeSticker(doc: StudioDoc, id: string, factor: number): StudioDoc {
  const sticker = doc.stickers.find((item) => item.id === id)
  return sticker ? updateSticker(doc, { ...sticker, size: sticker.size * factor }) : doc
}

export function removeSticker(doc: StudioDoc, id: string): StudioDoc {
  return { ...doc, stickers: doc.stickers.filter((sticker) => sticker.id !== id) }
}

export function setBackground(doc: StudioDoc, background: BackgroundId): StudioDoc {
  return { ...doc, background }
}

/** "Clear" takes away the drawing and the stickers; the chosen background stays. */
export function clearDoc(doc: StudioDoc): StudioDoc {
  return emptyDoc(doc.background)
}

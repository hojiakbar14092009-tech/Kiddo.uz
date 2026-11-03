/*
 * The shape builder (Phase 67): a picture's outline made of shapes; the child
 * fills it slot by slot with the matching shape from the tray (a circle, a
 * square, a triangle or a rectangle). Coordinates are in a 100 × 100 box. Pure.
 */

export type ShapeKind = 'circle' | 'square' | 'triangle' | 'rectangle'
export const SHAPE_KINDS: readonly ShapeKind[] = ['circle', 'square', 'triangle', 'rectangle']

export interface Slot {
  kind: ShapeKind
  /** Centre and size in the 100 × 100 box; a rectangle is twice as wide as tall. */
  x: number
  y: number
  size: number
  colour: string
  /** Turned (degrees), e.g. a triangle pointing down. */
  rotate?: number
}

export interface ShapePicture {
  id: 'house' | 'rocket' | 'tree' | 'car'
  slots: readonly Slot[]
}

export const SHAPE_PICTURES: readonly ShapePicture[] = [
  {
    id: 'house',
    slots: [
      { kind: 'square', x: 50, y: 62, size: 40, colour: '#ff8a4c' },
      { kind: 'triangle', x: 50, y: 28, size: 44, colour: '#d93d78' },
      // the door: a tall rectangle inside the wall
      { kind: 'rectangle', x: 50, y: 70, size: 12, colour: '#13917e', rotate: 90 },
    ],
  },
  {
    id: 'tree',
    slots: [
      { kind: 'triangle', x: 50, y: 28, size: 40, colour: '#3f9a3a' },
      { kind: 'triangle', x: 50, y: 52, size: 52, colour: '#5cb85c' },
      { kind: 'square', x: 50, y: 82, size: 18, colour: '#8a5a3b' },
    ],
  },
  {
    id: 'car',
    slots: [
      { kind: 'rectangle', x: 50, y: 56, size: 36, colour: '#2f7fc4' },
      { kind: 'square', x: 50, y: 34, size: 24, colour: '#7cc4f5' },
      { kind: 'circle', x: 30, y: 78, size: 18, colour: '#3a2e4d' },
      { kind: 'circle', x: 70, y: 78, size: 18, colour: '#3a2e4d' },
    ],
  },
  {
    id: 'rocket',
    slots: [
      { kind: 'rectangle', x: 50, y: 56, size: 26, colour: '#eeeeee', rotate: 90 },
      { kind: 'triangle', x: 50, y: 18, size: 24, colour: '#d93d78' },
      { kind: 'circle', x: 50, y: 50, size: 12, colour: '#7cc4f5' },
      { kind: 'triangle', x: 30, y: 82, size: 16, colour: '#ffc93c' },
      { kind: 'triangle', x: 70, y: 82, size: 16, colour: '#ffc93c' },
    ],
  },
]

/** An SVG path for a shape in the 100 × 100 box. */
export function shapePath(slot: Slot): string {
  const { kind, x, y, size } = slot
  const h = size / 2
  switch (kind) {
    case 'circle':
      return `M ${x - h} ${y} a ${h} ${h} 0 1 0 ${size} 0 a ${h} ${h} 0 1 0 ${-size} 0 Z`
    case 'square':
      return `M ${x - h} ${y - h} h ${size} v ${size} h ${-size} Z`
    case 'rectangle':
      return `M ${x - size} ${y - h / 2 - h / 2} h ${size * 2} v ${size} h ${-size * 2} Z`
    case 'triangle':
      return `M ${x} ${y - h} L ${x + h} ${y + h} L ${x - h} ${y + h} Z`
  }
}

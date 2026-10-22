import { arc, curve, join, line, type Stroke } from '@/components/trace/paths'

/*
 * What can be traced on `/trace`: the numbers 0–10 and five basic shapes, each
 * as strokes in the 0–100 box (see components/trace/paths). Strokes follow the
 * way the numbers are taught to be written: from the top, in one movement
 * where possible.
 */

export type TraceSetId = 'numbers' | 'shapes'
export type ShapeId = 'circle' | 'square' | 'triangle' | 'star' | 'heart'

export interface TraceItem {
  /** Unique in its set: `7`, `circle`. */
  id: string
  set: TraceSetId
  strokes: readonly Stroke[]
  /** A 3D picture shown with the item in the picker (public/3d). */
  picture?: string
}

const p = (x: number, y: number) => ({ x, y })

/** The figure eight in one movement: top loop smaller than the bottom one. */
function eight(): Stroke {
  const steps = 72
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = (i / steps) * Math.PI * 2
    const top = Math.cos(t) > 0
    return { x: 50 - (top ? 17 : 21) * Math.sin(2 * t), y: 50 - 40 * Math.cos(t) }
  })
}

/** A five-pointed star, from the top point clockwise. */
function star(): Stroke {
  const points = Array.from({ length: 11 }, (_, i) => {
    const r = i % 2 === 0 ? 42 : 18
    const angle = (-90 + i * 36) * (Math.PI / 180)
    return { x: 50 + r * Math.cos(angle), y: 54 + r * Math.sin(angle) }
  })
  return points
}

/** The classic heart curve, from the dip at the top, round the left side first. */
function heart(): Stroke {
  const steps = 72
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = (i / steps) * Math.PI * 2
    const x = -16 * Math.sin(t) ** 3
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))
    return { x: 50 + x * 2.4, y: 50 + (y - 2.5) * 2.4 }
  })
}

const NUMBER_STROKES: Record<string, readonly Stroke[]> = {
  // from the top, round to the left
  '0': [arc(50, 50, 24, 38, -90, -450)],
  '1': [line([36, 26], [54, 10], [54, 90])],
  '2': [join(arc(50, 32, 20, 20, -160, 25), line([68, 41], [28, 90], [74, 90]))],
  '3': [join(arc(48, 29, 19, 18, -160, 90), arc(48, 68, 22, 21, -90, 150))],
  '4': [line([58, 10], [26, 64], [78, 64]), line([60, 36], [60, 90])],
  '5': [join(line([36, 10], [35, 45]), arc(48, 64, 23, 23, -125, 150)), line([36, 10], [70, 10])],
  '6': [join(curve(p(66, 10), p(30, 26), p(30, 68)), arc(50, 68, 20, 21, 180, -180))],
  '7': [line([28, 10], [72, 10], [42, 90])],
  '8': [eight()],
  // the loop first (round to the left), then the stem
  '9': [join(arc(50, 32, 20, 21, -5, -360), line([70, 32], [66, 90]))],
  '10': [line([18, 26], [32, 10], [32, 90]), arc(66, 50, 18, 38, -90, -450)],
}

const SHAPE_STROKES: Record<ShapeId, readonly Stroke[]> = {
  circle: [arc(50, 50, 38, 38, -90, -450)],
  square: [line([16, 16], [84, 16], [84, 84], [16, 84], [16, 16])],
  triangle: [line([50, 12], [87, 84], [13, 84], [50, 12])],
  star: [star()],
  heart: [heart()],
}

export const SHAPE_IDS: readonly ShapeId[] = ['circle', 'square', 'triangle', 'star', 'heart']

const SHAPE_PICTURES: Record<ShapeId, string> = {
  circle: 'ball',
  square: 'gift',
  triangle: 'tent',
  star: 'star',
  heart: 'rose',
}

export const TRACE_ITEMS: Record<TraceSetId, readonly TraceItem[]> = {
  numbers: Object.entries(NUMBER_STROKES)
    .map(([id, strokes]) => ({ id, set: 'numbers' as const, strokes }))
    .sort((a, b) => Number(a.id) - Number(b.id)),
  shapes: SHAPE_IDS.map((id) => ({
    id,
    set: 'shapes' as const,
    strokes: SHAPE_STROKES[id],
    picture: SHAPE_PICTURES[id],
  })),
}

export const TRACE_SETS: readonly TraceSetId[] = ['numbers', 'shapes']

export function isTraceSet(value: string | undefined): value is TraceSetId {
  return value === 'numbers' || value === 'shapes'
}

export function findTraceItem(set: TraceSetId, id: string | undefined): TraceItem | undefined {
  return TRACE_ITEMS[set].find((item) => item.id === id)
}

/** The item after `id` in its set, or undefined after the last one. */
export function nextTraceItem(set: TraceSetId, id: string): TraceItem | undefined {
  const items = TRACE_ITEMS[set]
  const index = items.findIndex((item) => item.id === id)
  return index === -1 ? undefined : items[index + 1]
}

/** The activity name sent to the universe: `trace:number:7`, `trace:shape:circle`. */
export function traceActivity(item: TraceItem): string {
  return `trace:${item.set === 'numbers' ? 'number' : 'shape'}:${item.id}`
}

/** Numbers grow the number strand, shapes the art strand. */
export function traceStrand(item: TraceItem): 'number' | 'art' {
  return item.set === 'numbers' ? 'number' : 'art'
}

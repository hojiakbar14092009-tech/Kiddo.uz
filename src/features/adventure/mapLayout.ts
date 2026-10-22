import { useSyncExternalStore } from 'react'

/*
 * The Adventure Map is a winding road: worlds sit in a grid that snakes
 * (left to right, then right to left on the next row), and a dashed road
 * is drawn behind the cards through their measured centres, so cards keep
 * their own height. One column on phones (cards swing left and right), two
 * on tablets, three on desktop.
 */

export interface Cell {
  row: number
  col: number
}

/** Where world `index` sits in a snake of `cols` columns (0-based). */
export function cellFor(index: number, cols: number): Cell {
  const row = Math.floor(index / cols)
  const step = index % cols
  return { row, col: row % 2 === 0 ? step : cols - 1 - step }
}

export interface RoadPoint {
  x: number
  y: number
  row: number
}

/**
 * An SVG path (in pixels) through the centres of the world cards, as they
 * were measured on the page: a wave along a row, an S-bend between stacked
 * cards in one column, and a bend out to the side at the end of a row.
 */
export function roadPath(points: readonly RoadPoint[], cols: number, width: number): string {
  if (points.length === 0 || cols <= 0) return ''
  const cell = width / cols
  let d = `M ${points[0]!.x} ${points[0]!.y}`
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1]!
    const to = points[index]!
    if (from.row === to.row) {
      const lift = index % 2 === 0 ? 14 : -14
      d += ` Q ${(from.x + to.x) / 2} ${(from.y + to.y) / 2 + lift} ${to.x} ${to.y}`
    } else if (cols === 1) {
      const middle = (from.y + to.y) / 2
      d += ` C ${from.x} ${middle} ${to.x} ${middle} ${to.x} ${to.y}`
    } else {
      const out = cell * 0.4 * (from.x > width / 2 ? 1 : -1)
      d += ` C ${from.x + out} ${from.y} ${to.x + out} ${to.y} ${to.x} ${to.y}`
    }
  }
  return d
}

const QUERIES = [
  { query: '(min-width: 1024px)', cols: 3 },
  { query: '(min-width: 640px)', cols: 2 },
] as const

function readColumns(): number {
  if (typeof window === 'undefined' || !window.matchMedia) return 1
  return QUERIES.find((item) => window.matchMedia(item.query).matches)?.cols ?? 1
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const lists = QUERIES.map((item) => window.matchMedia(item.query))
  for (const list of lists) list.addEventListener?.('change', onChange)
  return () => {
    for (const list of lists) list.removeEventListener?.('change', onChange)
  }
}

/** Columns of the map for the current screen width (Tailwind's sm and lg). */
export function useMapColumns(): number {
  return useSyncExternalStore(subscribe, readColumns, () => 1)
}

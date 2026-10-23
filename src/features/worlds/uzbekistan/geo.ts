import { CITIES, type CityId } from './content'

/*
 * The stylised map of Uzbekistan: a simplified outline (equirectangular,
 * shortened east–west by cos 41°), the Aral Sea and the Amu Darya. Good
 * enough for "where is it roughly", not for navigation.
 */

export const MAP_WIDTH = 790
export const MAP_HEIGHT = 520

export function project(lon: number, lat: number): { x: number; y: number } {
  return { x: Math.round((lon - 55.5) * 44), y: Math.round((45.9 - lat) * 58) }
}

/** The border, clockwise from the north-west corner (lon, lat). */
const BORDER: readonly (readonly [number, number])[] = [
  [56.0, 45.0],
  [58.6, 45.6],
  [59.6, 44.9],
  [61.1, 44.3],
  [62.1, 43.5],
  [64.6, 43.6],
  [65.7, 43.0],
  [66.2, 42.1],
  [67.9, 41.2],
  [68.6, 40.7],
  [69.0, 41.4],
  [70.0, 42.1],
  [71.0, 42.3],
  [71.3, 41.6],
  [72.2, 41.1],
  [73.1, 40.8],
  [72.6, 40.1],
  [71.6, 39.95],
  [70.6, 40.2],
  [70.4, 40.9],
  [69.6, 40.6],
  [68.7, 40.1],
  [67.6, 39.4],
  [68.2, 38.4],
  [67.8, 37.4],
  [67.2, 37.2],
  [66.5, 37.4],
  [66.6, 38.0],
  [65.0, 38.5],
  [64.1, 39.0],
  [62.5, 39.9],
  [61.9, 40.9],
  [61.3, 41.15],
  [60.1, 41.25],
  [60.2, 41.95],
  [59.3, 42.3],
  [58.6, 42.6],
  [57.9, 42.3],
  [57.0, 41.3],
  [56.0, 41.3],
]

const path = (points: readonly (readonly [number, number])[], close: boolean) =>
  points
    .map(([lon, lat], index) => {
      const { x, y } = project(lon, lat)
      return `${index === 0 ? 'M' : 'L'}${x} ${y}`
    })
    .join(' ') + (close ? ' Z' : '')

export const BORDER_PATH = path(BORDER, true)

/** What is left of the Aral Sea in the north-west (a soft blob). */
export const ARAL_PATH = path(
  [
    [58.4, 45.4],
    [59.2, 45.0],
    [59.4, 44.4],
    [58.9, 44.0],
    [58.3, 44.5],
  ],
  true,
)

/** The Amu Darya, from Termez to the Aral Sea. */
export const RIVER_PATH = path(
  [
    [67.3, 37.25],
    [66.0, 37.9],
    [64.6, 38.7],
    [63.0, 39.6],
    [61.9, 40.7],
    [61.0, 41.6],
    [60.4, 42.1],
    [59.6, 42.7],
    [59.2, 43.5],
    [58.9, 44.0],
  ],
  false,
)

/** Mountains in the east, as small decorative peaks (map units). */
export const PEAKS: readonly { x: number; y: number }[] = [
  project(70.6, 41.9),
  project(71.4, 41.3),
  project(68.7, 38.8),
  project(67.9, 38.0),
]

/** A city's dot, in map units. */
export function cityPoint(id: CityId) {
  const city = CITIES[id]
  return project(city.mapLon, city.mapLat)
}

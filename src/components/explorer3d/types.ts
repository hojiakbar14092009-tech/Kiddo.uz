import type { Object3D } from 'three'

/*
 * Contract of the reusable 3D Explorer (Phase 6). Worlds describe models as
 * data; the geometry builder is loaded only when the 3D view opens, so three.js
 * never lands in a page's first load. Every model has a still picture that is
 * shown first, on devices without WebGL, on errors and with "save data".
 */

export type ExplorerQuality = 'low' | 'high'

/** A tappable point on the model with a short fact. */
export interface ExplorerHotspot {
  id: string
  /** Model-space position. */
  position: readonly [number, number, number]
  /** i18n key of the short label read next to the point. */
  labelKey: string
}

export interface ExplorerModelDef {
  id: string
  /** Still picture (public path, e.g. /3d/dinosaur.webp). */
  still: string
  /** Loads the builder lazily: `() => import('./models').then((m) => m.buildDino)`. */
  load: () => Promise<(quality: ExplorerQuality) => Object3D>
  hotspots?: readonly ExplorerHotspot[]
  /** Camera distance from the centre (default 4). */
  distance?: number
}

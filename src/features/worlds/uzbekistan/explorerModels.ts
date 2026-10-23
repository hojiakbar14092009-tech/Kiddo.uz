import type { ExplorerModelDef } from '@/components/explorer3d/types'
import { EXPLORE, LANDMARK_IDS, stillPath, type LandmarkId } from './content'

/*
 * The landmarks as Explorer3D models: data only. The geometry (models.ts,
 * with three.js) is imported when a 3D view opens, never with the page.
 */
function model(id: LandmarkId): ExplorerModelDef {
  const item = EXPLORE[id]
  return {
    id: `uz-${id}`,
    still: stillPath(id),
    load: () => import('./models').then((m) => m.BUILDERS[id]),
    hotspots: item.hotspots.map((spot) => ({
      id: spot.id,
      position: spot.position,
      labelKey: `uzbekistan.hotspots.${id}.${spot.id}`,
    })),
    ...(item.distance ? { distance: item.distance } : {}),
  }
}

export const UZ_MODELS: Readonly<Record<LandmarkId, ExplorerModelDef>> = Object.fromEntries(
  LANDMARK_IDS.map((id) => [id, model(id)]),
) as Record<LandmarkId, ExplorerModelDef>

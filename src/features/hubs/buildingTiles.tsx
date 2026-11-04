import { useTranslation } from 'react-i18next'
import { Img3D } from '@/components/ui/Img3D'
import { useWorld } from '@/domain/universe'
import { tDynamic } from '@/lib/tDynamic'
import type { Tile } from './QuickTiles'

/**
 * Kiddo City's buildings as big buttons (their 3D pictures), in this order, each
 * with a short name (`hubs.tiles.<id>`): a full name like "Ertaklar kutubxonasi"
 * does not fit a third of a small phone.
 */
export function useBuildingTiles(ids: readonly (readonly [string, string])[]): Tile[] {
  const { t } = useTranslation()
  const { buildings } = useWorld()
  return ids.flatMap(([id, tint]) => {
    const building = buildings.find((item) => item.id === id)
    if (!building) return []
    return [
      {
        to: building.route,
        label: tDynamic(t, `hubs.tiles.${id}`),
        picture: <Img3D name={building.icon3d} className="size-[74%]" />,
        tint,
      },
    ]
  })
}

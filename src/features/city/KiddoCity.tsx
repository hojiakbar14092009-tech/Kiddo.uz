import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from '@/components/ui/toast'
import { useResources, useWorld, type BuildingView } from '@/domain/universe'
import { tDynamic } from '@/lib/tDynamic'
import { BuildingTile } from './BuildingTile'
import { PLOT_TINTS } from './cityModel'
import { ResourceBar } from './ResourceBar'
import { UpgradeSheet } from './UpgradeSheet'

/**
 * Places in the city that are not (yet) buildings of the universe domain:
 * the Adventure Map. It has no levels.
 */
const EXTRA_PLACES = [
  {
    id: 'adventure',
    nameKey: 'city.adventure',
    icon3d: 'mountain',
    route: '/adventure',
    after: null,
  },
] as const

function isReady(building: BuildingView): boolean {
  return building.next !== null && Object.keys(building.next.missing).length === 0
}

/**
 * Kiddo City on the home screen: the child's treasures, then every building
 * as a house to walk into. Each can be upgraded with crystals (and parts),
 * which only changes how it looks: entering is never blocked.
 */
export function KiddoCity() {
  const { t } = useTranslation()
  const { buildings, upgrade } = useWorld()
  const crystals = useResources().crystal ?? 0
  const [sheetFor, setSheetFor] = useState<string | null>(null)
  const [celebrated, setCelebrated] = useState<{ id: string; at: number } | null>(null)
  const open = buildings.find((building) => building.id === sheetFor) ?? null

  const doUpgrade = (building: BuildingView) => {
    const result = upgrade(building.id)
    setSheetFor(null)
    if (result === 'ok') {
      setCelebrated({ id: building.id, at: Date.now() })
      toast(
        t('city.upgraded', { name: tDynamic(t, building.nameKey), level: building.level + 2 }),
        'success',
      )
    }
  }

  const tiles: ReactNode[] = []
  const pushExtras = (after: string | null) => {
    for (const place of EXTRA_PLACES) {
      if (place.after !== after) continue
      tiles.push(
        <BuildingTile
          key={place.id}
          name={tDynamic(t, place.nameKey)}
          icon3d={place.icon3d}
          route={place.route}
          tint={PLOT_TINTS[tiles.length % PLOT_TINTS.length]!}
        />,
      )
    }
  }
  for (const building of buildings) {
    tiles.push(
      <BuildingTile
        key={building.id}
        name={tDynamic(t, building.nameKey)}
        icon3d={building.icon3d}
        route={building.route}
        tint={PLOT_TINTS[tiles.length % PLOT_TINTS.length]!}
        level={building.level}
        maxLevel={building.maxLevel}
        upgradeReady={isReady(building)}
        onUpgrade={
          // a quiet level badge only, until there is a crystal to think about
          building.next && (crystals > 0 || isReady(building))
            ? () => setSheetFor(building.id)
            : undefined
        }
        celebrate={celebrated?.id === building.id ? celebrated.at : undefined}
      />,
    )
    pushExtras(building.id)
  }
  pushExtras(null)

  return (
    <section aria-labelledby="city-title" className="flex w-full flex-col items-center gap-4">
      <div className="flex flex-col items-center gap-1 text-center">
        <h2 id="city-title" className="font-display text-2xl font-extrabold sm:text-3xl">
          {t('city.title')}
        </h2>
        <p className="max-w-xl text-lg text-ink-soft">{t('city.hint')}</p>
      </div>
      <ResourceBar />
      <ul className="grid w-full max-w-5xl grid-cols-2 gap-x-3 gap-y-4 pt-2 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-6 lg:grid-cols-4">
        {tiles}
      </ul>
      {open && (
        <UpgradeSheet
          building={open}
          onUpgrade={() => doUpgrade(open)}
          onClose={() => setSheetFor(null)}
        />
      )}
    </section>
  )
}

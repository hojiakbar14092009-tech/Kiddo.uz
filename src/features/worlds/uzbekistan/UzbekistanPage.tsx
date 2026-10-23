import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useParams } from 'react-router-dom'
import { useCanUse } from '@/domain/entitlements'
import { useLanguage } from '@/store/settingsStore'
import { isPremium, type UzItem } from './access'
import { EXPLORE, isExploreId } from './content'
import { ExploreView } from './ExploreView'
import { isGameKind, type GameKind } from './generators'
import { LockedView } from './LockedView'
import { MapRun } from './MapRun'
import { PatternRun } from './PatternRun'
import { HUB } from './useGameRun'
import { TableRun } from './TableRun'
import { UzHub } from './UzHub'

/**
 * `/worlds/uzbekistan`: the "My Uzbekistan" world of the Adventure Map.
 * `/worlds/uzbekistan/explore/:item` opens a landmark or tradition,
 * `/worlds/uzbekistan/:game` one of the games (map, table, patterns).
 */
export function UzbekistanPage() {
  const { section, item } = useParams()
  if (section === undefined) return <UzHub />
  if (section === 'explore' && isExploreId(item)) {
    return (
      <Gate item={{ type: 'explore', id: item }}>
        <ExploreView key={item} id={item} />
      </Gate>
    )
  }
  if (isGameKind(section) && item === undefined) {
    return (
      <Gate item={{ type: 'game', id: section }}>
        <Game key={section} kind={section} />
      </Gate>
    )
  }
  return <Navigate to={HUB} replace />
}

function Game({ kind }: { kind: GameKind }) {
  if (kind === 'map') return <MapRun />
  if (kind === 'table') return <TableRun />
  return <PatternRun />
}

/** Premium content renders only with PRO; without it, the calm locked note. */
function Gate({ item, children }: { item: UzItem; children: ReactNode }) {
  const { t } = useTranslation()
  const language = useLanguage()
  const allowed = useCanUse('premiumWorlds')
  if (isPremium(item) && !allowed) {
    const title =
      item.type === 'explore'
        ? EXPLORE[item.id].name[language]
        : t(`uzbekistan.games.${item.id}.title`)
    return <LockedView title={title} />
  }
  return children
}

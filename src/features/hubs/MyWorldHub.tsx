import { useTranslation } from 'react-i18next'
import { KiddoCity } from '@/features/city/KiddoCity'
import { useBuildingTiles } from './buildingTiles'
import { HubHeading, HubScreen } from './HubScreen'
import { QuickTiles } from './QuickTiles'

/**
 * Mening dunyom (Phase 40): the child's own Kiddo City with its treasures,
 * where nuts make the buildings grow. Since Phase 75 the shop, the museum and
 * the art studio are big buttons at the top, before the city.
 */
export function MyWorldHub() {
  const { t } = useTranslation()
  const tiles = useBuildingTiles([
    ['shop', 'bg-coin-soft'],
    ['museum', 'bg-lilac-soft'],
    ['art-studio', 'bg-girl-soft'],
  ])
  return (
    <HubScreen className="gap-6 py-5 sm:gap-8 sm:py-8">
      <HubHeading title={t('hubs.mine.title')} />
      <QuickTiles tiles={tiles} label={t('hubs.mine.title')} />
      <KiddoCity />
    </HubScreen>
  )
}

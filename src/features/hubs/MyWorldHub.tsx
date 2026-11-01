import { useTranslation } from 'react-i18next'
import { KiddoCity } from '@/features/city/KiddoCity'
import { HubHeading, HubScreen } from './HubScreen'

/**
 * Mening dunyom (Phase 40): the child's own Kiddo City with its treasures,
 * where nuts make the buildings grow; the shop, the museum and the art studio
 * are its buildings.
 */
export function MyWorldHub() {
  const { t } = useTranslation()
  return (
    <HubScreen className="gap-8 py-6 sm:gap-10 sm:py-8">
      <HubHeading title={t('hubs.mine.title')} text={t('hubs.mine.text')} />
      <KiddoCity />
    </HubScreen>
  )
}

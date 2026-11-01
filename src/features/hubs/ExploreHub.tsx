import { useTranslation } from 'react-i18next'
import { Img3D } from '@/components/ui/Img3D'
import { HubHeading, HubScreen } from './HubScreen'
import { BuildingPlaces, PlaceCard, PlaceGroup } from './PlaceGrid'

/** The worlds to discover (the science lab opens when the Mars flower blooms). */
const EXPLORE_PLACES = [
  'dino-park',
  'uzbekistan-gate',
  'observatory',
  'spaceport',
  'science-lab',
] as const

/**
 * Kashf et (Phase 40): the Adventure Map and every world to discover, each
 * with its own place; the space labs sit next to the observatory.
 */
export function ExploreHub() {
  const { t } = useTranslation()
  return (
    <HubScreen className="gap-8 py-6 sm:gap-10 sm:py-8">
      <HubHeading title={t('hubs.explore.title')} text={t('hubs.explore.text')} />
      <PlaceGroup id="explore-places" title={t('hubs.explore.places')}>
        <PlaceCard
          to="/adventure"
          label={t('city.adventure')}
          detail={t('city.adventureHint')}
          picture={<Img3D name="mountain" className="size-[72%]" />}
          tint="bg-primary-soft"
        />
        <BuildingPlaces ids={EXPLORE_PLACES} />
        <PlaceCard
          to="/scale-portal"
          label={t('scalePortal.card')}
          picture={<Img3D name="ringed-planet" className="size-[72%]" />}
          tint="bg-lilac-soft"
        />
        <PlaceCard
          to="/shadow-lab"
          label={t('shadowLab.title')}
          picture={<Img3D name="lamp" className="size-[72%]" />}
          tint="bg-coin-soft"
        />
      </PlaceGroup>
    </HubScreen>
  )
}

import { useTranslation } from 'react-i18next'
import { Img3D } from '@/components/ui/Img3D'
import { useBuildingTiles } from './buildingTiles'
import { HubHeading, HubScreen } from './HubScreen'
import { BuildingPlaces, PlaceCard, PlaceGroup } from './PlaceGrid'
import { QuickTiles, type Tile } from './QuickTiles'

/**
 * Kashf et (Phase 40; Phase 75: gathered). The Adventure Map, the cartoons and
 * the two big worlds are buttons at the top; space and science wait in short
 * rows. The science games live on the Games page, not here as well.
 */
export function ExploreHub() {
  const { t } = useTranslation()
  const worlds = useBuildingTiles([
    ['dino-park', 'bg-primary-soft'],
    ['uzbekistan-gate', 'bg-coin-soft'],
  ])
  const tiles: Tile[] = [
    {
      to: '/shorts',
      label: t('shorts.open'),
      picture: (
        <span aria-hidden="true" className="text-4xl leading-none sm:text-5xl">
          🎬
        </span>
      ),
      tint: 'bg-lilac-soft',
      testId: 'explore-shorts',
    },
    ...worlds,
  ]

  return (
    <HubScreen className="gap-6 py-5 sm:gap-8 sm:py-8">
      <HubHeading title={t('hubs.explore.title')} />
      <QuickTiles tiles={tiles} label={t('hubs.explore.title')} wide />
      <PlaceGroup id="explore-space" title={t('hubs.explore.groups.space')} row>
        <BuildingPlaces ids={['observatory', 'spaceport']} />
        <PlaceCard
          to="/scale-portal"
          label={t('scalePortal.card')}
          picture={<Img3D name="ringed-planet" className="size-[72%]" />}
          tint="bg-lilac-soft"
        />
      </PlaceGroup>
      <PlaceGroup id="explore-science" title={t('hubs.explore.groups.science')} row>
        <BuildingPlaces ids={['science-lab']} />
        {/* Phase 49: the robot asks for a real thing at home */}
        <PlaceCard
          to="/explore/find-home"
          label={t('findHome.title')}
          picture={<Img3D name="house" className="size-[72%]" />}
          tint="bg-girl-soft"
        />
      </PlaceGroup>
    </HubScreen>
  )
}

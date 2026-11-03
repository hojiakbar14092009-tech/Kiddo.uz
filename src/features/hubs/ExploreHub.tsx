import { useTranslation } from 'react-i18next'
import { Img3D } from '@/components/ui/Img3D'
import { SCI_GAMES } from '@/features/sciGames/games'
import { tDynamic } from '@/lib/tDynamic'
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

const SCI_TINT = { sky: 'bg-sky-soft', coral: 'bg-oops-soft', mint: 'bg-primary-soft' } as const

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
        {/* Phase 49: the robot asks for a real thing at home */}
        <PlaceCard
          to="/explore/find-home"
          label={t('findHome.title')}
          detail={t('findHome.cardHint')}
          picture={<Img3D name="house" className="size-[72%]" />}
          tint="bg-girl-soft"
        />
        <PlaceCard
          to="/shadow-lab"
          label={t('shadowLab.title')}
          picture={<Img3D name="lamp" className="size-[72%]" />}
          tint="bg-coin-soft"
        />
      </PlaceGroup>
      {/* Phase 59: short science games; Phase 60: the cartoons about them */}
      <PlaceGroup id="explore-science" title={t('sciGames.hubTitle')}>
        {SCI_GAMES.map((game) => (
          <PlaceCard
            key={game.id}
            to={game.path}
            label={tDynamic(t, `sciGames.${game.id}.title`)}
            picture={
              <span aria-hidden="true" className="text-5xl leading-none sm:text-6xl">
                {game.emoji}
              </span>
            }
            tint={SCI_TINT[game.tone]}
          />
        ))}
        <PlaceCard
          to="/shorts"
          label={t('shorts.open')}
          picture={
            <span aria-hidden="true" className="text-5xl leading-none sm:text-6xl">
              🎬
            </span>
          }
          tint="bg-lilac-soft"
        />
      </PlaceGroup>
    </HubScreen>
  )
}

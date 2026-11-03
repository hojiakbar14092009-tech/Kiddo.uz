import { useTranslation } from 'react-i18next'
import { Img3D } from '@/components/ui/Img3D'
import { useWorld } from '@/domain/universe/world'
import { AppIcon } from '@/features/age/AppIcon'
import { HubHeading, HubScreen } from '@/features/hubs/HubScreen'
import { PlaceCard, PlaceGroup } from '@/features/hubs/PlaceGrid'
import { GAME_META } from '@/features/tasks/gameMeta'
import { tDynamic } from '@/lib/tDynamic'
import { entryKey, GAMES, SUBJECTS, type GameEntry } from './catalog'

const TINTS = [
  'bg-sky-soft',
  'bg-coin-soft',
  'bg-primary-soft',
  'bg-lilac-soft',
  'bg-girl-soft',
  'bg-oops-soft',
]

/**
 * O‘yinlar (Phase 62): every game and practice, grouped by subject, so a child
 * finds a way to learn by playing in any subject. Each card opens the game as it is.
 */
export function GamesPage() {
  const { t } = useTranslation()
  return (
    <HubScreen className="gap-8 py-6 sm:gap-10 sm:py-8">
      <HubHeading title={t('games.title')} text={t('games.text')} />
      {SUBJECTS.map((subject) => (
        <PlaceGroup key={subject} id={`games-${subject}`} title={t(`games.subjects.${subject}`)}>
          {GAMES[subject].map((entry, index) => (
            <GameCard key={entryKey(entry)} entry={entry} tint={TINTS[index % TINTS.length]!} />
          ))}
        </PlaceGroup>
      ))}
    </HubScreen>
  )
}

function GameCard({ entry, tint }: { entry: GameEntry; tint: string }) {
  const { t } = useTranslation()
  const { buildings } = useWorld()
  if (entry.kind === 'building') {
    const building = buildings.find((item) => item.id === entry.id)
    if (!building) return null
    return (
      <PlaceCard
        to={building.route}
        label={tDynamic(t, building.nameKey)}
        picture={<Img3D name={building.icon3d} className="size-[72%]" />}
        tint={tint}
        locked={building.locked}
        detail={building.locked ? tDynamic(t, `city.opensWith.${building.id}`) : undefined}
      />
    )
  }
  if (entry.kind === 'task') {
    return (
      <PlaceCard
        to={`/tasks/${entry.game}`}
        label={t(GAME_META[entry.game].titleKey)}
        picture={<AppIcon name={entry.game} className="size-[70%]" />}
        tint={tint}
      />
    )
  }
  const { picture } = entry
  return (
    <PlaceCard
      to={entry.to}
      label={tDynamic(t, entry.labelKey)}
      picture={
        'img3d' in picture ? (
          <Img3D name={picture.img3d} className="size-[72%]" />
        ) : 'icon' in picture ? (
          <AppIcon name={picture.icon} className="size-[70%]" />
        ) : (
          <span aria-hidden="true" className="text-5xl leading-none sm:text-6xl">
            {picture.emoji}
          </span>
        )
      }
      tint={tint}
    />
  )
}

import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRightIcon } from '@/components/icons'
import { TitleTopBar } from '@/components/layout/TitleTopBar'
import { Screen } from '@/components/layout/Screen'
import { ResourceIcon } from '@/components/reward/ResourceIcon'
import { RESOURCE_TINT, SHOWN_RESOURCES, type ShownResource } from '@/components/reward/resources'
import { EmptyState } from '@/components/ui/EmptyState'
import { LinkButton } from '@/components/ui/LinkButton'
import { useAchievements, useResources, useUniverseStickers } from '@/domain/universe'
import { StickerAlbum } from '@/features/shop/StickerAlbum'
import { useProgress } from '@/store/progressStore'
import { AchievementCard } from './AchievementCard'
import { UniverseStickers } from './UniverseStickers'

const SECTION_TITLE = 'font-display text-2xl font-extrabold sm:text-3xl'

/**
 * The child's museum: each treasure with where it comes from and what it is
 * for, every medal with its tier and the way to the next one, and the
 * sticker album. Nothing here can be bought.
 */
export function CollectionPage() {
  const { t } = useTranslation()
  const balances = useResources()
  const achievements = useAchievements()
  const universeStickers = useUniverseStickers()
  const { stickers } = useProgress()
  const classic = achievements.filter((item) => item.collection === 'classic')
  const starPaths = achievements.filter((item) => item.collection === 'stars')
  const empty =
    SHOWN_RESOURCES.every((resource) => (balances[resource] ?? 0) === 0) &&
    achievements.every((item) => item.tier === null) &&
    stickers.length === 0

  return (
    <Screen
      header={<TitleTopBar title={t('collection.title')} back="/home" />}
      className="items-center gap-8 px-4 py-6 sm:py-8 short:gap-5 short:py-3"
    >
      {empty && (
        <div className="w-full max-w-xl" data-testid="collection-empty">
          <EmptyState
            picture="castle"
            title={t('collection.emptyTitle')}
            text={t('collection.emptyText')}
            action={
              <LinkButton
                to="/home"
                size="md"
                icon={<ChevronRightIcon size={24} />}
                iconPosition="end"
              >
                {t('collection.start')}
              </LinkButton>
            }
          />
        </div>
      )}

      <section aria-labelledby="treasures-title" className="flex w-full max-w-5xl flex-col gap-4">
        <h2 id="treasures-title" className={SECTION_TITLE}>
          {t('collection.resources')}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {SHOWN_RESOURCES.map((resource) => (
            <ResourceCard key={resource} resource={resource} count={balances[resource] ?? 0} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="medals-title" className="flex w-full max-w-5xl flex-col gap-4">
        <h2 id="medals-title" className={SECTION_TITLE}>
          {t('collection.achievements')}
        </h2>
        <MedalGroup
          id="classic"
          title={t('collection.classicMedals')}
          hint={t('collection.classicHint')}
        >
          {classic.map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </MedalGroup>
        <MedalGroup
          id="stars"
          title={t('collection.starPaths')}
          hint={t('collection.starPathsHint')}
        >
          {starPaths.map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </MedalGroup>
      </section>

      <section
        aria-labelledby="universe-stickers-title"
        className="flex w-full max-w-5xl flex-col gap-4"
        data-testid="universe-stickers"
      >
        <UniverseStickers items={universeStickers} />
      </section>

      <section
        aria-label={t('collection.stickers')}
        className="flex w-full max-w-5xl flex-col gap-4"
      >
        <StickerAlbum owned={stickers} />
        <LinkButton
          to="/shop"
          variant="soft"
          size="md"
          className="self-start"
          icon={<ChevronRightIcon size={22} />}
          iconPosition="end"
        >
          {t('collection.openShop')}
        </LinkButton>
      </section>
    </Screen>
  )
}

function MedalGroup({
  id,
  title,
  hint,
  children,
}: {
  id: string
  title: string
  hint: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3" data-testid={`medals-${id}`}>
      <div className="flex flex-col gap-0.5">
        <h3 id={`medals-${id}-title`} className="font-display text-xl font-extrabold sm:text-2xl">
          {title}
        </h3>
        <p className="max-w-prose text-base leading-snug text-ink-soft">{hint}</p>
      </div>
      <ul
        aria-labelledby={`medals-${id}-title`}
        className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3"
      >
        {children}
      </ul>
    </div>
  )
}

function ResourceCard({ resource, count }: { resource: ShownResource; count: number }) {
  const { t } = useTranslation()
  const name = t(`universe.resources.${resource}`)
  return (
    <li
      data-testid={`treasure-${resource}`}
      className="flex items-start gap-3 rounded-card bg-surface p-4 shadow-press"
    >
      <span
        className={`flex size-16 shrink-0 flex-col items-center justify-center rounded-tile ${RESOURCE_TINT[resource]}`}
      >
        <ResourceIcon resource={resource} size={34} />
        <span className="font-display text-lg leading-none font-extrabold tabular-nums">
          {count}
        </span>
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="font-display text-xl font-extrabold">
          <span className="sr-only">{t('city.resourceCount', { name, count })}</span>
          <span aria-hidden="true">{name}</span>
        </h3>
        <p className="text-base leading-snug">
          <span className="font-bold text-primary-ink">{t('collection.from')}: </span>
          <span className="text-ink-soft">{t(`collection.sources.${resource}`)}</span>
        </p>
        <p className="text-base leading-snug">
          <span className="font-bold text-primary-ink">{t('collection.use')}: </span>
          <span className="text-ink-soft">{t(`collection.uses.${resource}`)}</span>
        </p>
      </div>
    </li>
  )
}

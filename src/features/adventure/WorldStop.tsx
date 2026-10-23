import clsx from 'clsx'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { StarIcon } from '@/components/icons'
import { Img3D } from '@/components/ui/Img3D'
import { ProgressBar } from '@/components/ui/Progress'
import type { AdventureWorld } from '@/domain/universe'
import { tDynamic } from '@/lib/tDynamic'

const MAX_STARS = 3

/**
 * One stop of the Adventure Map: its activities as links with the child's
 * best stars (also in a world the map has not opened yet: opening a world
 * only changes the map), how many stars the world still needs, or, for a
 * world that is not built yet, a calm "coming soon".
 */
export function WorldStop({
  world,
  stars,
  style,
  className,
}: {
  world: AdventureWorld
  /** Stars the child has earned in total. */
  stars: number
  style?: CSSProperties
  className?: string
}) {
  const { t } = useTranslation()
  const name = tDynamic(t, world.nameKey)
  // the world's state in words: where the child is, open, coming soon, or how many stars more
  // (inline: a helper typed `ReturnType<typeof useTranslation>['t']` is too deep for tsc, TS2589)
  const state = world.comingSoon
    ? t('adventure.comingSoon')
    : world.current
      ? t('adventure.youAreHere')
      : world.unlocked
        ? t('adventure.open')
        : t('adventure.starsMore', { count: Math.max(0, world.starsNeeded - stars) })
  // a world the map has opened (its picture in colour); its activities are open either way
  const playable = world.unlocked && !world.comingSoon
  const titleId = `world-${world.id}`

  return (
    <li
      style={style}
      aria-labelledby={titleId}
      aria-current={world.current ? 'location' : undefined}
      data-testid={`world-${world.id}`}
      className={clsx(
        'relative flex flex-col gap-3 rounded-card p-4 shadow-press',
        className,
        world.current
          ? 'bg-surface ring-4 ring-coin'
          : world.comingSoon
            ? 'bg-muted'
            : 'bg-surface',
      )}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={clsx(
            'flex size-16 shrink-0 items-center justify-center rounded-full sm:size-20',
            world.current ? 'bg-coin-soft' : playable ? 'bg-sky-soft' : 'bg-cream',
          )}
        >
          <Img3D
            name={world.icon3d}
            className={clsx('size-[72%]', !playable && 'opacity-50 grayscale')}
          />
        </span>
        <div className="flex min-w-0 flex-col items-start gap-1">
          <h2
            id={titleId}
            className="font-display text-xl leading-tight font-extrabold sm:text-2xl"
          >
            {name}
          </h2>
          <span
            className={clsx(
              'flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-bold',
              world.comingSoon && 'bg-lilac-soft text-ink',
              !world.comingSoon && world.current && 'bg-coin text-ink',
              !world.comingSoon &&
                !world.current &&
                world.unlocked &&
                'bg-primary-soft text-primary-ink',
              !world.comingSoon && !world.unlocked && 'bg-cream text-ink-soft',
            )}
          >
            {state}
          </span>
        </div>
      </div>

      {world.starsNeeded > 0 && (
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1 text-sm font-semibold text-ink-soft">
            <StarIcon size={16} className="text-coin" />
            {t('adventure.progress', {
              have: Math.min(stars, world.starsNeeded),
              need: world.starsNeeded,
            })}
          </span>
          <ProgressBar
            value={stars}
            max={world.starsNeeded}
            tone="coin"
            label={`${name}: ${t('adventure.progress', {
              have: Math.min(stars, world.starsNeeded),
              need: world.starsNeeded,
            })}`}
          />
        </div>
      )}

      {world.comingSoon ? (
        <p className="text-base text-ink-soft">{t('adventure.comingSoonText')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {world.activities.map((activity) => {
            const label = tDynamic(t, activity.labelKey)
            const best =
              activity.bestStars > 0
                ? t('adventure.best', { count: activity.bestStars })
                : t('adventure.notPlayed')
            const content = (
              <>
                <span className="min-w-0 flex-1 truncate font-display text-lg font-bold">
                  {label}
                </span>
                <span aria-hidden="true" className="flex shrink-0 gap-0.5">
                  {Array.from({ length: MAX_STARS }, (_, index) => (
                    <StarIcon
                      key={index}
                      size={18}
                      className={index < activity.bestStars ? 'text-coin' : 'text-line-strong'}
                    />
                  ))}
                </span>
              </>
            )
            // the domain may mark an activity whose screen does not exist yet
            const open = !('open' in activity) || activity.open !== false
            return (
              <li key={activity.activity}>
                {open ? (
                  <Link
                    to={activity.route}
                    aria-label={`${label}. ${best}`}
                    className="flex min-h-12 items-center gap-2 rounded-tile bg-cream px-3 py-2 transition-transform active:translate-y-0.5"
                  >
                    {content}
                  </Link>
                ) : (
                  <span className="flex min-h-12 items-center gap-2 rounded-tile border-2 border-dashed border-line-strong px-3 py-2 text-ink-soft">
                    {content}
                    <span className="sr-only">{best}</span>
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </li>
  )
}

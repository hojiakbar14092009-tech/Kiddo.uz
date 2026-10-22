import clsx from 'clsx'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowUpIcon, StarIcon } from '@/components/icons'
import { Img3D } from '@/components/ui/Img3D'
import { RewardBurst } from '@/components/ui/RewardBurst'

/** The picture grows a little with every level. */
const ART_SIZE = ['size-[62%]', 'size-[70%]', 'size-[78%]', 'size-[86%]'] as const

export interface BuildingTileProps {
  name: string
  icon3d: string
  route: string
  tint: string
  /** Current level and the highest one; omitted for places without levels. */
  level?: number
  maxLevel?: number
  /** An upgrade can be paid now: the button shows a small glow. */
  upgradeReady?: boolean
  onUpgrade?: () => void
  /** Changes when the building was just upgraded, to replay the burst once. */
  celebrate?: number
}

/**
 * Levels are shown to the child counting from 1 (the open building is level 1;
 * the domain counts upgrades from 0).
 *
 * One house of Kiddo City: a big link into it (always open), its level as
 * small stars on the ground that grow in number, and a round upgrade button.
 */
export function BuildingTile({
  name,
  icon3d,
  route,
  tint,
  level,
  maxLevel,
  upgradeReady = false,
  onUpgrade,
  celebrate,
}: BuildingTileProps) {
  const { t } = useTranslation()
  const levelId = useId()
  const hasLevels = level !== undefined && maxLevel !== undefined
  const current = level ?? 0
  const art = (
    <Img3D
      name={icon3d}
      className={clsx('drop-shadow-sm transition-[width,height] duration-500', ART_SIZE[current])}
    />
  )

  return (
    <li data-roam="home" className="relative" data-testid={`building-${route}`}>
      <Link
        to={route}
        aria-describedby={hasLevels ? levelId : undefined}
        className="flex h-full flex-col items-center gap-2 rounded-card bg-surface p-2.5 pb-3 shadow-press transition-transform active:translate-y-1 sm:gap-3 sm:p-3"
      >
        <span
          aria-hidden="true"
          className={clsx(
            'relative flex aspect-[5/4] w-full items-end justify-center overflow-hidden rounded-tile',
            tint,
          )}
        >
          {/* the ground the house stands on; it gets greener as the house grows */}
          <span
            className={clsx(
              'absolute inset-x-0 bottom-0 h-[22%] rounded-b-tile',
              current >= 2 ? 'bg-primary/35' : 'bg-primary/20',
            )}
          />
          <span className="relative flex size-full items-end justify-center pb-[6%]">
            {celebrate ? (
              <RewardBurst key={celebrate} pieces={8} className="size-full items-end">
                <span className="flex size-full items-end justify-center">{art}</span>
              </RewardBurst>
            ) : (
              art
            )}
          </span>
          {hasLevels && current > 0 && (
            <span className="absolute top-1.5 left-1.5 flex gap-0.5 rounded-full bg-surface/85 px-1.5 py-1 text-coin">
              {Array.from({ length: current }, (_, index) => (
                <StarIcon key={index} size={current >= 3 ? 16 : 14} />
              ))}
            </span>
          )}
        </span>
        <span className="text-center font-display text-base leading-tight font-bold sm:text-xl">
          {name}
        </span>
        {hasLevels && (
          <span
            id={levelId}
            // read as the link's description, not as part of its name
            aria-hidden="true"
            className="rounded-full bg-cream px-2.5 py-0.5 text-sm font-semibold text-ink-soft"
          >
            {current >= (maxLevel ?? 0)
              ? t('city.maxLevel')
              : t('city.level', { level: current + 1 })}
          </span>
        )}
      </Link>
      {onUpgrade && (
        <button
          type="button"
          onClick={onUpgrade}
          aria-label={t('city.upgradeLabel', { name })}
          title={t('city.upgrade')}
          className={clsx(
            'absolute -top-2 -right-2 flex size-11 items-center justify-center rounded-full border-2 border-surface shadow-press-sm transition-transform active:scale-95 sm:size-12',
            upgradeReady ? 'bg-coin text-ink' : 'bg-cream text-ink-soft',
          )}
        >
          <ArrowUpIcon size={22} />
        </button>
      )}
    </li>
  )
}

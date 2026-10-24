import clsx from 'clsx'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowUpIcon, StarIcon } from '@/components/icons'
import { Img3D } from '@/components/ui/Img3D'
import { RewardBurst } from '@/components/ui/RewardBurst'

/** The picture grows a little with every level. */
const ART_SIZE = ['size-[62%]', 'size-[70%]', 'size-[78%]', 'size-[86%]'] as const

/**
 * What the plot looks like at each level (domain level 0–3), so a child sees
 * the building's place grow, not only a count of stars: a bare plot, then a
 * green lawn with a sprout, flowers and a tree, and at the top a festive plot
 * in a gold frame. Pictures are the same 3D set as everywhere else.
 */
interface LevelLook {
  ground: string
  /** The card's frame. */
  frame: string
  /** Small 3D pictures standing on the plot, left and right of the house. */
  left: readonly string[]
  right: readonly string[]
  /** A soft sparkle above the house (the top level only). */
  sparkle: boolean
}

const LEVEL_LOOK: readonly LevelLook[] = [
  { ground: 'bg-primary/15', frame: '', left: [], right: [], sparkle: false },
  { ground: 'bg-primary/30', frame: '', left: ['seedling'], right: [], sparkle: false },
  {
    ground: 'bg-primary/40',
    frame: 'ring-2 ring-primary/40',
    left: ['tulip'],
    right: ['pine'],
    sparkle: false,
  },
  {
    ground: 'bg-primary/50',
    frame: 'ring-4 ring-coin',
    left: ['tulip', 'sunflower'],
    right: ['pine'],
    sparkle: true,
  },
]

function lookFor(level: number): LevelLook {
  return LEVEL_LOOK[Math.min(Math.max(0, level), LEVEL_LOOK.length - 1)]!
}

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
 * One house of Kiddo City: a big link into it (always open), its level as a
 * plot that visibly grows (LEVEL_LOOK) plus small stars as a second sign, and
 * a round upgrade button.
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
  const look = hasLevels ? lookFor(current) : LEVEL_LOOK[0]!
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
        data-level={hasLevels ? current + 1 : undefined}
        className={clsx(
          'flex h-full flex-col items-center gap-2 rounded-card bg-surface p-2.5 pb-3 shadow-press transition-transform active:translate-y-1 sm:gap-3 sm:p-3',
          look.frame,
        )}
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
            className={clsx('absolute inset-x-0 bottom-0 h-[22%] rounded-b-tile', look.ground)}
          />
          {look.sparkle && (
            <Img3D name="sparkles" className="absolute top-[6%] right-[8%] size-[22%] opacity-90" />
          )}
          {look.left.length > 0 && (
            <span className="absolute bottom-[4%] left-[3%] flex items-end">
              {look.left.map((name) => (
                <Img3D key={name} name={name} className="-mr-1.5 size-7 sm:size-10" />
              ))}
            </span>
          )}
          {look.right.length > 0 && (
            <span className="absolute right-[3%] bottom-[4%] flex items-end">
              {look.right.map((name) => (
                <Img3D key={name} name={name} className="size-8 sm:size-12" />
              ))}
            </span>
          )}
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

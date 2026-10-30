import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { ProgressBar } from '@/components/ui/Progress'
import { TIERS, type AchievementView, type Tier } from '@/domain/universe'
import { tDynamic } from '@/lib/tDynamic'
import { MedalBadge } from './MedalBadge'
import { tierLabelKey } from './medalLabels'

/** Tier colours of the chip and the step dots (the medal itself changes shape, see MedalBadge). */
const TIER_STYLE: Record<Tier, { dot: string; chip: string }> = {
  bronze: { dot: 'bg-[#d99a66]', chip: 'bg-[#fbeadb] text-[#5c3416]' },
  silver: { dot: 'bg-[#8c98a5]', chip: 'bg-[#eef1f5] text-[#323b45]' },
  gold: { dot: 'bg-coin', chip: 'bg-coin-soft text-ink' },
}
const STAR_STYLE: Record<Tier, { dot: string; chip: string }> = {
  bronze: { dot: 'bg-[#6f86c9]', chip: 'bg-[#e6ebf8] text-[#1d2a52]' },
  silver: { dot: 'bg-[#7c5ce6]', chip: 'bg-[#ece7fc] text-[#2e1f6b]' },
  gold: { dot: 'bg-[#e0a91c]', chip: 'bg-[#1d2a52] text-[#ffe79a]' },
}

/** One medal: the medal at its tier, what to do, and how far to the next tier. */
export function AchievementCard({ achievement }: { achievement: AchievementView }) {
  const { t } = useTranslation()
  const title = tDynamic(t, achievement.titleKey)
  const tier = achievement.tier
  const reached = tier ? TIERS.indexOf(tier) + 1 : 0
  const stars = achievement.collection === 'stars'
  const style = stars ? STAR_STYLE : TIER_STYLE
  const progress = t(stars ? 'collection.nextStarTier' : 'collection.nextTier', {
    current: Math.min(achievement.current, achievement.next ?? 0),
    next: achievement.next,
  })

  return (
    <li
      data-testid={`medal-${achievement.id}`}
      data-tier={tier ?? 'none'}
      className="flex items-start gap-3 rounded-card bg-surface p-3 shadow-press sm:p-4"
    >
      <MedalBadge
        collection={achievement.collection}
        tier={tier}
        icon3d={achievement.icon3d}
        className="size-16 sm:size-20"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="font-display text-lg leading-tight font-extrabold sm:text-xl">{title}</h3>
          <span
            className={clsx(
              'rounded-full px-2 py-0.5 text-xs font-bold sm:text-sm',
              tier ? style[tier].chip : 'bg-cream text-ink-soft',
            )}
          >
            {tier
              ? tDynamic(t, tierLabelKey(achievement.collection, tier))
              : t(stars ? 'collection.noStarTier' : 'collection.noTier')}
          </span>
        </div>
        <p className="text-base leading-snug text-ink-soft">{tDynamic(t, achievement.descKey)}</p>
        <span aria-hidden="true" className="flex gap-1">
          {TIERS.map((item, index) => (
            <span
              key={item}
              className={clsx(
                'h-2 w-6 rounded-full',
                index < reached ? style[item].dot : 'bg-line-strong',
              )}
            />
          ))}
        </span>
        {achievement.next === null ? (
          <p className="text-sm font-bold text-primary-ink">
            {t(stars ? 'collection.allStars' : 'collection.allGold')}
          </p>
        ) : (
          <>
            <span className="text-sm font-semibold text-ink-soft tabular-nums">{progress}</span>
            <ProgressBar
              value={achievement.current}
              max={achievement.next}
              label={`${title}: ${progress}`}
            />
          </>
        )}
      </div>
    </li>
  )
}

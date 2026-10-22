import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { Img3D } from '@/components/ui/Img3D'
import { ProgressBar } from '@/components/ui/Progress'
import { TIERS, type AchievementView, type Tier } from '@/domain/universe'
import { tDynamic } from '@/lib/tDynamic'

/** Medal colours: the ring around the picture and the tier dots. */
const TIER_STYLE: Record<Tier, { ring: string; dot: string; chip: string }> = {
  bronze: { ring: 'ring-[#d99a66] bg-[#fbeadb]', dot: 'bg-[#d99a66]', chip: 'bg-[#fbeadb]' },
  silver: { ring: 'ring-[#aab4c0] bg-[#eef1f5]', dot: 'bg-[#aab4c0]', chip: 'bg-[#eef1f5]' },
  gold: { ring: 'ring-coin bg-coin-soft', dot: 'bg-coin', chip: 'bg-coin-soft' },
}

/** One medal: its picture in the tier's colour, what to do, and how far to the next tier. */
export function AchievementCard({ achievement }: { achievement: AchievementView }) {
  const { t } = useTranslation()
  const title = tDynamic(t, achievement.titleKey)
  const tier = achievement.tier
  const reached = tier ? TIERS.indexOf(tier) + 1 : 0

  return (
    <li
      data-testid={`medal-${achievement.id}`}
      className="flex items-start gap-3 rounded-card bg-surface p-3 shadow-press sm:p-4"
    >
      <span
        aria-hidden="true"
        className={clsx(
          'flex size-16 shrink-0 items-center justify-center rounded-full ring-4 sm:size-20',
          tier ? TIER_STYLE[tier].ring : 'bg-cream ring-line-strong',
        )}
      >
        <Img3D
          name={achievement.icon3d}
          className={clsx('size-[68%]', !tier && 'opacity-45 grayscale')}
        />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="font-display text-lg leading-tight font-extrabold sm:text-xl">{title}</h3>
          <span
            className={clsx(
              'rounded-full px-2 py-0.5 text-xs font-bold sm:text-sm',
              tier ? TIER_STYLE[tier].chip : 'bg-cream text-ink-soft',
            )}
          >
            {tier ? t(`collection.tiers.${tier}`) : t('collection.noTier')}
          </span>
        </div>
        <p className="text-base leading-snug text-ink-soft">{tDynamic(t, achievement.descKey)}</p>
        <span aria-hidden="true" className="flex gap-1">
          {TIERS.map((item, index) => (
            <span
              key={item}
              className={clsx(
                'h-2 w-6 rounded-full',
                index < reached ? TIER_STYLE[item].dot : 'bg-line-strong',
              )}
            />
          ))}
        </span>
        {achievement.next === null ? (
          <p className="text-sm font-bold text-primary-ink">{t('collection.allGold')}</p>
        ) : (
          <>
            <span className="text-sm font-semibold text-ink-soft tabular-nums">
              {t('collection.nextTier', {
                current: Math.min(achievement.current, achievement.next),
                next: achievement.next,
              })}
            </span>
            <ProgressBar
              value={achievement.current}
              max={achievement.next}
              label={`${title}: ${t('collection.nextTier', {
                current: Math.min(achievement.current, achievement.next),
                next: achievement.next,
              })}`}
            />
          </>
        )}
      </div>
    </li>
  )
}

import { useTranslation } from 'react-i18next'
import { Img3D } from '@/components/ui/Img3D'
import { RewardBurst } from '@/components/ui/RewardBurst'
import { ResourceIcon } from './ResourceIcon'

/**
 * What a finished activity brought into the Kiddo universe (stars and
 * crystals), as one short burst with the amounts in words beside the
 * pictures (and a knowledge scroll for a story read the first time). With
 * nothing new (e.g. the same item again today) it simply praises.
 */
export function ActivityReward({
  stars,
  crystals,
  scrolls = 0,
}: {
  stars: number
  crystals: number
  scrolls?: number
}) {
  const { t } = useTranslation()
  const items = [
    {
      key: 'stars',
      count: stars,
      picture: 'glowing-star',
      text: t('activityReward.stars', { count: stars }),
    },
    {
      key: 'crystals',
      count: crystals,
      picture: 'sparkles',
      text: t('activityReward.crystals', { count: crystals }),
    },
    {
      key: 'scrolls',
      count: scrolls,
      picture: null,
      text: t('activityReward.scrolls', { count: scrolls }),
    },
  ].filter((item) => item.count > 0)

  return (
    <RewardBurst className="min-h-24" pieces={items.length > 0 ? 8 : 6}>
      <div
        role="status"
        className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
        data-testid="activity-reward"
      >
        {items.length === 0 ? (
          <span className="flex items-center gap-2 font-display text-2xl font-extrabold">
            <Img3D name="glowing-star" className="size-14" />
            {t('activityReward.praise')}
          </span>
        ) : (
          items.map((item) => (
            <span
              key={item.key}
              className="flex items-center gap-2 font-display text-2xl font-extrabold"
            >
              {item.picture ? (
                <Img3D name={item.picture} className="size-14 short:size-10" />
              ) : (
                <ResourceIcon resource="scroll" size={48} className="short:size-10" />
              )}
              {item.text}
            </span>
          ))
        )}
      </div>
    </RewardBurst>
  )
}

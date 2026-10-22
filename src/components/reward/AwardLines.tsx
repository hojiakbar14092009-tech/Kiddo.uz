import { useTranslation } from 'react-i18next'
import { MedalIcon } from '@/components/icons'
import { RewardBurst } from '@/components/ui/RewardBurst'
import { parseAchievementKey, type AwardSummary, type ResourceId } from '@/domain/universe'
import { tDynamic } from '@/lib/tDynamic'
import { ResourceIcon } from './ResourceIcon'
import { RESOURCE_TINT } from './resources'

interface Line {
  resource: ResourceId
  count: number
  text: string
}

/**
 * The universe part of a result screen: "+2 stars · +1 crystal · +1 part",
 * each with its picture, in one short burst, and one calm line per medal
 * reached (no pop-ups). Nothing at all when the run brought nothing new.
 */
export function AwardLines({ award }: { award: AwardSummary | null }) {
  const { t } = useTranslation()
  if (!award) return null
  const stars = award.starGain ?? 0
  const lines: Line[] = (
    [
      { resource: 'star', count: stars, text: t('award.stars', { count: stars }) },
      {
        resource: 'crystal',
        count: award.crystals,
        text: t('award.crystals', { count: award.crystals }),
      },
      { resource: 'part', count: award.parts, text: t('award.parts', { count: award.parts }) },
      {
        resource: 'scroll',
        count: award.scrolls,
        text: t('award.scrolls', { count: award.scrolls }),
      },
    ] satisfies Line[]
  ).filter((line) => line.count > 0)
  const medals = award.achievements
    .map(parseAchievementKey)
    .filter((medal): medal is NonNullable<typeof medal> => medal !== null)
  if (lines.length === 0 && medals.length === 0) return null

  return (
    <div className="flex flex-col items-center gap-2" data-testid="award-lines">
      {lines.length > 0 && (
        <RewardBurst pieces={6} delay={0.2}>
          <ul
            aria-label={t('award.title')}
            className="flex flex-wrap items-center justify-center gap-2"
          >
            {lines.map((line) => (
              <li
                key={line.resource}
                className={`flex min-h-11 items-center gap-2 rounded-full px-4 py-1.5 font-display text-xl font-extrabold ${RESOURCE_TINT[line.resource]}`}
              >
                <ResourceIcon resource={line.resource} size={30} />
                {line.text}
              </li>
            ))}
          </ul>
        </RewardBurst>
      )}
      {medals.map((medal) => (
        <p
          key={`${medal.id}|${medal.tier}`}
          className="flex items-center gap-2 text-lg font-bold text-primary-ink"
        >
          <MedalIcon size={24} />
          {t('award.medal', {
            title: tDynamic(t, `universe.achievements.${medal.id}.title`),
            tier: t(`collection.tiers.${medal.tier}`),
          })}
        </p>
      ))}
    </div>
  )
}

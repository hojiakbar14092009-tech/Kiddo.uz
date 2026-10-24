import { useTranslation } from 'react-i18next'
import { Img3D } from '@/components/ui/Img3D'
import { LinkButton } from '@/components/ui/LinkButton'
import { skillNameKey } from '@/domain/learning'
import { MAX_OPTIONAL, useSmartQuests } from '@/domain/universe/progression'
import { LearnReviewCard } from '@/features/learn/LearnHome'
import { useLearnChild } from '@/features/learn/learnStore'
import { reviewSection } from '@/features/learn/reviewSection'
import { useLanguage } from '@/store/settingsStore'
import { startGardenTrip } from '@/features/mistakeGarden/gardenTrip'
import { tDynamic } from '@/lib/tDynamic'

/**
 * Optional quests next to the big journey (Smart Quest): at most two in all,
 * never blocking the journey: a section to review (when the learning sections
 * ask for one) and "help your plant grow" practice from the Mistake Garden,
 * in positive words. Nothing is shown when there is none.
 */
export function QuestExtras() {
  const { t } = useTranslation()
  const { optional } = useSmartQuests()
  const review = reviewSection(useLearnChild(), useLanguage())
  const practice = optional.slice(0, MAX_OPTIONAL - (review ? 1 : 0))
  if (!review && practice.length === 0) return null
  return (
    <section
      aria-labelledby="quest-extras"
      data-testid="quest-extras"
      className="flex w-full max-w-3xl flex-col gap-3 rounded-card bg-surface p-4 shadow-press sm:p-5"
    >
      <h2 id="quest-extras" className="font-display text-xl font-extrabold">
        {t('quests.alsoTitle')}
      </h2>
      {review && <LearnReviewCard />}
      <ul className="grid gap-3 md:grid-cols-2">
        {practice.map((quest) => {
          const skill = quest.skill ? tDynamic(t, skillNameKey(quest.skill)) : ''
          return (
            <li
              key={quest.id}
              data-testid="quest-optional"
              data-quest={quest.id}
              className="flex flex-col gap-3 rounded-tile bg-primary-soft/60 p-3 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-tile bg-surface">
                  <Img3D name={quest.icon} className="size-[78%]" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span
                    id={`quest-${quest.id}`}
                    className="font-display text-lg leading-tight font-bold break-words"
                  >
                    {tDynamic(t, quest.titleKey, { skill })}
                  </span>
                  <span className="text-base text-ink-soft">
                    {tDynamic(t, quest.textKey, quest.textParams)}
                  </span>
                </span>
              </div>
              <LinkButton
                to={quest.route}
                size="md"
                variant="soft"
                className="shrink-0 self-start sm:self-center"
                aria-describedby={`quest-${quest.id}`}
                onClick={() => startGardenTrip(quest.route)}
              >
                {t('quests.go')}
              </LinkButton>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

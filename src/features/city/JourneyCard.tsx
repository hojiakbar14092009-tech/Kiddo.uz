import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { CheckIcon } from '@/components/icons'
import { ResourceIcon } from '@/components/reward/ResourceIcon'
import { Img3D } from '@/components/ui/Img3D'
import { LinkButton } from '@/components/ui/LinkButton'
import { ageBand } from '@/domain/adaptive'
import { useMainQuest } from '@/domain/universe/progression'
import { childAge, useActiveChild } from '@/store/familyStore'
import { tDynamic } from '@/lib/tDynamic'
import { QuestNeeds } from './QuestNeeds'

/**
 * The big journey across the worlds on the home screen: every step with its
 * picture, the one to do now with a button that goes there, and the reward
 * announced before the child starts. The steps come from the progression
 * rules (the world's state), never from what this card remembers.
 */
export function JourneyCard() {
  const { t } = useTranslation()
  const { view: journey, main } = useMainQuest()
  const child = useActiveChild()
  // the youngest see the short title (and what is missing); from 7 on also how
  const young = ageBand(child ? childAge(child) : null) === '4-6'
  const current = journey.steps.find((step) => step.status === 'current')
  const needs = main?.needs ?? []

  return (
    <section
      aria-labelledby="voyage-title"
      data-testid="journey-card"
      data-done={journey.done}
      className="flex w-full max-w-3xl flex-col gap-4 rounded-card bg-surface p-4 shadow-press sm:p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 id="voyage-title" className="font-display text-2xl font-extrabold">
          {t('voyage.title')}
        </h2>
        <p className="text-lg text-ink-soft">
          {journey.complete ? t('voyage.done') : t('voyage.intro')}
        </p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-display text-lg font-extrabold">
          <span className="flex min-h-10 items-center gap-1.5 rounded-full bg-lilac-soft px-3 py-1">
            <ResourceIcon resource={journey.reward.resource} size={26} />
            {t('voyage.reward', { count: journey.reward.amount })}
          </span>
          <span className="text-ink-soft tabular-nums">
            {t('voyage.progress', { done: journey.done, total: journey.steps.length })}
          </span>
        </p>
      </div>
      <ol className="flex flex-wrap gap-2">
        {journey.steps.map((step) => {
          const title = tDynamic(t, `voyage.steps.${step.id}.title`)
          return (
            <li
              key={step.id}
              data-step={step.id}
              data-status={step.status}
              className={clsx(
                'relative flex size-14 items-center justify-center rounded-tile sm:size-16',
                step.status === 'done' && 'bg-primary-soft',
                step.status === 'current' && 'bg-coin-soft ring-4 ring-coin',
                step.status === 'later' && 'bg-cream',
              )}
            >
              <span className="sr-only">
                {t('voyage.stepLabel', {
                  title,
                  status: tDynamic(t, `voyage.status.${step.status}`),
                })}
              </span>
              <Img3D
                name={step.icon}
                className={clsx('size-[72%]', step.status === 'later' && 'opacity-40 grayscale')}
              />
              {step.status === 'done' && (
                <CheckIcon
                  size={18}
                  className="absolute -right-1 -bottom-1 rounded-full bg-surface text-primary-ink"
                />
              )}
            </li>
          )
        })}
      </ol>
      {current && (
        <div className="flex flex-col items-start gap-2 rounded-tile bg-cream p-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="font-display text-xl font-bold">
              {tDynamic(t, `voyage.steps.${current.id}.title`)}
            </span>
            {!young && (
              <span className="text-base text-ink-soft">
                {tDynamic(t, `voyage.steps.${current.id}.text`)}
              </span>
            )}
            <QuestNeeds needs={needs} className="mt-1" />
          </div>
          <LinkButton to={current.route} size="md" data-testid="journey-go" className="shrink-0">
            {t('voyage.go')}
          </LinkButton>
        </div>
      )}
    </section>
  )
}

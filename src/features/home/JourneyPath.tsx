import clsx from 'clsx'
import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CheckIcon } from '@/components/icons'
import { AppIcon } from '@/features/age/AppIcon'
import { GAME_META } from '@/features/tasks/gameMeta'
import type { DailyPlanState, PlanStepStatus } from './dailyPlan'

const STOP_CLASSES: Record<PlanStepStatus, string> = {
  done: 'border-primary bg-primary-soft shadow-[0_7px_0_var(--color-primary-shadow)]',
  next: 'border-coin bg-coin-soft shadow-[0_7px_0_var(--color-coin-shadow)]',
  later: 'border-line-strong bg-surface shadow-[0_7px_0_var(--color-line)]',
}

const STATUS_KEY = {
  done: 'journey.done',
  next: 'journey.next',
  later: 'journey.later',
} as const

/** Today’s games as stops on a road. Every stop can be played; the next one glows. */
export function JourneyPath({ plan }: { plan: DailyPlanState }) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion() ?? false

  return (
    <section aria-labelledby="plan-title" className="flex w-full flex-col items-center gap-4">
      <div className="flex flex-col items-center gap-1 text-center">
        <h2 id="plan-title" className="font-display text-2xl font-extrabold sm:text-3xl">
          {t('journey.plan')}
        </h2>
        <p className="text-lg text-ink-soft">
          {t('journey.planProgress', { done: plan.done, total: plan.total })}
        </p>
      </div>

      <div className="relative w-full max-w-3xl">
        {/* the road behind the stops */}
        <div
          aria-hidden="true"
          style={{ left: `${50 / plan.steps.length}%`, right: `${50 / plan.steps.length}%` }}
          className="pointer-events-none absolute top-12 h-3 -translate-y-1/2 rounded-full bg-[repeating-linear-gradient(90deg,var(--color-line-strong)_0_22px,transparent_22px_36px)] sm:top-16"
        />
        <ol
          className="relative grid gap-2 sm:gap-6"
          style={{ gridTemplateColumns: `repeat(${plan.steps.length}, minmax(0, 1fr))` }}
        >
          {plan.steps.map((step, index) => {
            const meta = GAME_META[step.game]
            const title = t(meta.titleKey)
            const status = t(STATUS_KEY[step.status])
            const glow = step.status === 'next' && !reduceMotion
            return (
              <li key={step.game} className="relative flex flex-col items-center gap-2">
                <Link
                  to={`/tasks/${step.game}`}
                  aria-label={`${index + 1}. ${title} — ${status}`}
                  aria-current={step.status === 'next' ? 'step' : undefined}
                  className="group flex flex-col items-center gap-2 rounded-3xl"
                >
                  <motion.span
                    animate={glow ? { scale: [1, 1.06, 1] } : undefined}
                    transition={
                      glow ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : undefined
                    }
                    className={clsx(
                      'relative flex size-[min(6rem,26vw)] items-center justify-center rounded-full border-4 text-5xl transition-transform group-active:translate-y-1 sm:size-32 sm:text-6xl',
                      STOP_CLASSES[step.status],
                    )}
                  >
                    <AppIcon name={step.game} className="size-[62%]" />
                    {step.status === 'done' && (
                      <span
                        aria-hidden="true"
                        className="absolute -top-1 -right-1 flex size-9 items-center justify-center rounded-full bg-primary text-white sm:size-11"
                      >
                        <CheckIcon size={24} />
                      </span>
                    )}
                  </motion.span>
                  <span className="text-center font-display text-base leading-tight font-bold [overflow-wrap:anywhere] hyphens-auto sm:text-xl">
                    {title}
                  </span>
                </Link>
                <span
                  aria-hidden="true"
                  className={clsx(
                    'rounded-full px-3 py-0.5 text-center text-sm font-semibold [overflow-wrap:anywhere] sm:text-base',
                    step.status === 'done' && 'bg-primary-soft text-primary-ink',
                    step.status === 'next' && 'bg-coin-soft text-ink',
                    step.status === 'later' && 'text-ink-soft',
                  )}
                >
                  {status}
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

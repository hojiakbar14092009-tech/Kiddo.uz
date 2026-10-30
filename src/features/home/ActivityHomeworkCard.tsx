import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ChevronRightIcon } from '@/components/icons'
import { AppIcon } from '@/features/age/AppIcon'
import { homeworkActivity, homeworkRoute } from '@/features/homework/activityHomework'
import { topicLabel } from '@/features/homework/topics'
import { useLanguage } from '@/store/settingsStore'
import { tDynamic } from '@/lib/tDynamic'
import type { ActivityHomework } from '@/store/familyStore'

/**
 * An activity homework on the home screen (Phase 23): what to play, how many
 * times are left, and the parent's word. One tap opens the activity.
 */
export function ActivityHomeworkCard({ homework }: { homework: ActivityHomework }) {
  const { t } = useTranslation()
  const language = useLanguage()
  const activity = homeworkActivity(homework.target)
  if (!activity) return null
  const base = tDynamic(t, `parent.insights.names.${homework.target}`)
  // a planet homework names its lesson: "Space: Earth, Mars, Saturn"
  const name = homework.topic
    ? `${base}: ${topicLabel(homework.target, homework.topic, language)}`
    : base
  const done = Math.min(homework.runs.length, homework.times)
  const left = homework.times - done

  return (
    <Link
      to={homeworkRoute(activity, homework.topic)}
      data-testid="activity-homework"
      data-target={homework.target}
      aria-label={[t('home.activityHomeworkLabel', { name, count: left }), homework.note]
        .filter(Boolean)
        .join('. ')}
      className="flex w-full items-center gap-4 rounded-[28px] border-4 border-coin bg-surface p-4 shadow-[0_7px_0_var(--color-coin-shadow)] transition-transform active:translate-y-1 sm:p-5"
    >
      <span
        aria-hidden="true"
        className="flex size-16 shrink-0 items-center justify-center rounded-3xl bg-coin-soft text-4xl sm:size-20 sm:text-5xl"
      >
        <AppIcon name="homework" className="size-[72%]" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1" aria-hidden="true">
        <span className="font-display text-xl font-extrabold sm:text-2xl">
          {t('home.homework')}
        </span>
        <span className="font-display text-lg font-extrabold text-primary-ink sm:text-xl">
          {activity.emoji} {name}
        </span>
        {/* how many times: a dot for each, the done ones filled */}
        <span className="flex gap-1.5" data-testid="activity-homework-dots">
          {Array.from({ length: homework.times }, (_, i) => (
            <span
              key={i}
              className={
                i < done
                  ? 'size-4 rounded-full bg-primary'
                  : 'size-4 rounded-full border-2 border-line-strong'
              }
            />
          ))}
        </span>
        {homework.note && <span className="truncate text-ink-soft">“{homework.note}”</span>}
      </span>
      <ChevronRightIcon size={32} aria-hidden="true" />
    </Link>
  )
}

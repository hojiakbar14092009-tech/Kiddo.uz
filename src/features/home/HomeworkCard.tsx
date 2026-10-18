import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ChevronRightIcon } from '@/components/icons'
import { findLetter } from '@/content/alphabet'
import { AppIcon } from '@/features/age/AppIcon'
import { GAME_META } from '@/features/tasks/gameMeta'
import { homeworkPath } from '@/features/tasks/useHomework'
import type { Homework } from '@/store/familyStore'

/** Homework from a parent comes first on the home screen, before today’s plan. */
export function HomeworkCard({ homework }: { homework: Homework }) {
  const { t } = useTranslation()
  const letters = homework.letterIds
    .map((id) => findLetter(homework.language, id)?.upper ?? id)
    .join(' ')
  const game = t(GAME_META[homework.game].titleKey)

  return (
    <Link
      to={homeworkPath(homework)}
      aria-label={t('home.homeworkLabel', { letters, game })}
      className="flex w-full max-w-3xl items-center gap-4 rounded-[28px] border-4 border-coin bg-surface p-4 shadow-[0_7px_0_var(--color-coin-shadow)] transition-transform active:translate-y-1 sm:p-5"
    >
      <span
        aria-hidden="true"
        className="flex size-16 shrink-0 items-center justify-center rounded-3xl bg-coin-soft text-4xl sm:size-20 sm:text-5xl"
      >
        <AppIcon name="homework" className="size-[72%]" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col" aria-hidden="true">
        <span className="font-display text-xl font-extrabold sm:text-2xl">
          {t('home.homework')}
        </span>
        <span className="font-display text-2xl font-extrabold tracking-wider text-primary-ink sm:text-3xl">
          {letters}
        </span>
        <span className="text-ink-soft">
          {GAME_META[homework.game].emoji} {game}
        </span>
      </span>
      <ChevronRightIcon size={32} aria-hidden="true" />
    </Link>
  )
}

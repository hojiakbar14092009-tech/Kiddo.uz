import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { useUniverseStore } from '@/domain/universe/store'
import { ChildAvatar } from '@/features/profiles/ChildAvatar'
import { dayKey } from '@/features/tasks/rules'
import { isOverdue } from '@/features/homework/activityHomework'
import type { ChildProfile } from '@/store/familyStore'

/**
 * Parent Center 2.0 (Phase 23): the whole family at a glance, before the
 * details of one child: what each played today, open homework (and any past
 * its day), the stars of the day. The child chips above choose whose
 * report is shown; the chosen child is marked here too.
 */
export function FamilyOverview({
  family,
  selectedId,
}: {
  family: readonly ChildProfile[]
  selectedId: string | null
}) {
  const { t } = useTranslation()
  const byChild = useUniverseStore((state) => state.byChild)
  const today = dayKey()
  if (family.length === 0) return null

  return (
    <section aria-labelledby="family-overview" className="flex flex-col gap-3">
      <h2 id="family-overview" className="font-display text-xl font-extrabold">
        {t('parent.family.title')}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="family-overview">
        {family.map((child) => {
          const runs = (byChild[child.id]?.recent ?? []).filter(
            (run) => dayKey(new Date(run.at)) === today,
          )
          const stars = runs.reduce((sum, run) => sum + Math.max(0, run.stars), 0)
          const open = (child.homeworks ?? []).filter((homework) => !homework.completedAt)
          const late = open.filter((homework) =>
            isOverdue(
              { dueDay: 'dueDay' in homework ? homework.dueDay : null, completedAt: null },
              today,
            ),
          )
          return (
            <li key={child.id}>
              <div
                aria-current={child.id === selectedId ? 'true' : undefined}
                data-testid={`family-${child.id}`}
                className={clsx(
                  'flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left',
                  child.id === selectedId
                    ? 'border-primary bg-primary-soft'
                    : 'border-line bg-surface',
                )}
              >
                <ChildAvatar child={child} size={48} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-display text-lg font-extrabold">{child.name}</span>
                  <span className="text-sm text-ink-soft" data-testid="family-today">
                    {runs.length === 0
                      ? t('parent.family.nothingToday')
                      : t('parent.family.today', { count: runs.length, stars })}
                  </span>
                  <span
                    className={clsx(
                      'text-sm',
                      late.length > 0 ? 'font-semibold text-oops-ink' : 'text-ink-soft',
                    )}
                    data-testid="family-homework"
                  >
                    {open.length === 0
                      ? t('parent.family.noHomework')
                      : late.length > 0
                        ? t('parent.family.homeworkLate', { count: open.length, late: late.length })
                        : t('parent.family.homework', { count: open.length })}
                  </span>
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

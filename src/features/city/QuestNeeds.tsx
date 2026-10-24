import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { ResourceIcon } from '@/components/reward/ResourceIcon'
import type { Need } from '@/domain/universe/progression'
import { tDynamic } from '@/lib/tDynamic'

/**
 * What a step still needs, said plainly ("2 more crystals"), instead of a
 * dead "locked". Renders nothing when nothing is missing.
 */
export function QuestNeeds({ needs, className }: { needs: readonly Need[]; className?: string }) {
  const { t } = useTranslation()
  if (needs.length === 0) return null
  return (
    <ul className={clsx('flex flex-wrap gap-2', className)} data-testid="quest-needs">
      {needs.map((need) => (
        <li
          key={need.resource}
          data-resource={need.resource}
          className="flex min-h-10 items-center gap-1.5 rounded-full bg-coin-soft px-3 py-1 text-base font-bold"
        >
          <ResourceIcon resource={need.resource} size={24} />
          {tDynamic(t, `quests.needs.${need.resource}`, { count: need.missing })}
        </li>
      ))}
    </ul>
  )
}

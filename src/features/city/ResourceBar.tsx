import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ChevronRightIcon } from '@/components/icons'
import { ResourceIcon } from '@/components/reward/ResourceIcon'
import { RESOURCE_TINT, SHOWN_RESOURCES } from '@/components/reward/resources'
import { useResources } from '@/domain/universe'

/**
 * The child's treasures (stars, crystals, parts, scrolls) on the city, one
 * chip each. The whole bar is one link to the collection, which explains
 * where each comes from and what it is for.
 */
export function ResourceBar() {
  const { t } = useTranslation()
  const balances = useResources()
  const chips = SHOWN_RESOURCES.map((resource) => ({
    resource,
    count: balances[resource] ?? 0,
    name: t(`universe.resources.${resource}`),
  }))
  const list = chips
    .map((chip) => t('city.resourceCount', { name: chip.name, count: chip.count }))
    .join(', ')

  return (
    <Link
      to="/collection"
      aria-label={t('city.resourcesLink', { list })}
      data-testid="resource-bar"
      className="flex w-full max-w-3xl items-center gap-2 rounded-card bg-surface p-2 shadow-press transition-transform active:translate-y-1 sm:gap-3 sm:p-3"
    >
      <ul className="grid min-w-0 flex-1 grid-cols-2 gap-2 min-[480px]:grid-cols-4 sm:gap-3">
        {chips.map((chip) => (
          <li
            key={chip.resource}
            className={`flex min-h-11 min-w-0 items-center gap-2 rounded-tile px-2.5 py-1.5 ${RESOURCE_TINT[chip.resource]}`}
          >
            <ResourceIcon resource={chip.resource} size={30} className="shrink-0" />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="font-display text-xl font-extrabold tabular-nums">{chip.count}</span>
              <span className="truncate text-xs font-semibold text-ink-soft sm:text-sm">
                {chip.name}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <ChevronRightIcon size={26} className="shrink-0 text-ink-soft" />
    </Link>
  )
}

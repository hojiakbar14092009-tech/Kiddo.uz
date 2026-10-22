import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { ArrowUpIcon, CheckIcon, ChevronRightIcon } from '@/components/icons'
import { ResourceIcon } from '@/components/reward/ResourceIcon'
import { BottomSheet } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Img3D } from '@/components/ui/Img3D'
import { LinkButton } from '@/components/ui/LinkButton'
import { useResources, type BuildingView } from '@/domain/universe'
import { tDynamic } from '@/lib/tDynamic'
import { costRows } from './cityModel'

/**
 * The upgrade of one building as a bottom sheet: the cost with pictures,
 * what the child has and what is still missing. Entering the building is
 * always offered too: an upgrade only changes how it looks.
 */
export function UpgradeSheet({
  building,
  onUpgrade,
  onClose,
}: {
  building: BuildingView
  onUpgrade: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const balances = useResources()
  const name = tDynamic(t, building.nameKey)
  const rows = costRows(building, balances)
  const ready = building.next !== null && rows.every((row) => row.missing === 0)
  const needsStars = rows.some((row) => row.resource === 'star')

  return (
    <BottomSheet
      title={name}
      description={
        building.next ? t('city.upgradeText', { level: building.level + 2 }) : t('city.maxed')
      }
      onClose={onClose}
      testId="upgrade-sheet"
      media={
        <span className="flex size-24 items-center justify-center rounded-card bg-sky-soft short:size-16">
          <Img3D name={building.icon3d} className="size-[78%]" eager />
        </span>
      }
    >
      {rows.length > 0 && (
        <ul className="flex w-full flex-col gap-2">
          {rows.map((row) => (
            <li
              key={row.resource}
              className="flex min-h-14 items-center gap-3 rounded-tile bg-cream px-3 py-2 text-left"
            >
              <ResourceIcon resource={row.resource} size={34} className="shrink-0" />
              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="font-display text-lg font-extrabold">
                  {t(`universe.resources.${row.resource}`)}
                </span>
                <span className="text-base text-ink-soft tabular-nums">
                  {t('city.have', { have: row.have, need: row.need })}
                </span>
              </span>
              <span
                className={clsx(
                  'flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-sm font-bold',
                  row.missing === 0 ? 'bg-primary-soft text-primary-ink' : 'bg-muted text-ink',
                )}
              >
                {row.missing === 0 && <CheckIcon size={16} />}
                {row.missing === 0 ? t('city.enough') : t('city.missing', { count: row.missing })}
              </span>
            </li>
          ))}
        </ul>
      )}
      {needsStars && <p className="text-base text-ink-soft">{t('city.starsNote')}</p>}
      {building.next && !ready && <p className="text-base text-ink-soft">{t('city.howToEarn')}</p>}

      <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center short:flex-row">
        {building.next && (
          <Button
            size="md"
            variant="coin"
            disabled={!ready}
            onClick={onUpgrade}
            icon={<ArrowUpIcon size={24} />}
          >
            {t('city.upgradeNow')}
          </Button>
        )}
        <LinkButton
          to={building.route}
          variant="soft"
          size="md"
          icon={<ChevronRightIcon size={24} />}
          iconPosition="end"
        >
          {t('city.enter')}
        </LinkButton>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="min-h-11 rounded-full px-4 text-lg font-bold text-ink-soft"
      >
        {t('city.later')}
      </button>
    </BottomSheet>
  )
}

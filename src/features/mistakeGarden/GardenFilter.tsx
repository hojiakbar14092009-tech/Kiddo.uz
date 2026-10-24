import { useTranslation } from 'react-i18next'
import { SegmentedTabs, type SegmentedTab } from '@/components/ui/SegmentedTabs'
import type { LearningDomain } from '@/domain/learning'
import { tDynamic } from '@/lib/tDynamic'
import { DomainIcon } from './DomainIcon'

export type GardenArea = LearningDomain | 'all'

export const FILTER_ID = 'garden-area'

/** All / Maths / Language / Nature: only the areas that have plants. */
export function GardenFilter({
  areas,
  value,
  onChange,
}: {
  areas: readonly LearningDomain[]
  value: GardenArea
  onChange: (area: GardenArea) => void
}) {
  const { t } = useTranslation()
  const tabs: SegmentedTab<GardenArea>[] = [
    {
      value: 'all',
      label: t('learning.all'),
      symbol: (
        <span className="flex gap-0.5" aria-hidden="true">
          {areas.map((area) => (
            <DomainIcon key={area} domain={area} size={14} />
          ))}
        </span>
      ),
    },
    ...areas.map((area) => ({
      value: area,
      label: tDynamic(t, `learning.domains.${area}`),
      symbol: <DomainIcon domain={area} size={22} />,
    })),
  ]
  return (
    <SegmentedTabs
      tabs={tabs}
      value={value}
      onChange={onChange}
      label={t('practiceGarden.filterLabel')}
      idBase={FILTER_ID}
      showLabels="always"
    />
  )
}

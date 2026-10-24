import { useTranslation } from 'react-i18next'
import { useLocation, useSearchParams } from 'react-router-dom'
import { LinkButton } from '@/components/ui/LinkButton'
import { isOnGardenTrip } from './gardenTrip'

/**
 * "Back to the garden" on an activity's result screen, when the child came
 * from a plant (the garden trip, or `?from=garden` / `?practice=` on a
 * direct link). Renders nothing otherwise.
 */
export function BackToGarden({
  testId = 'to-garden',
  force = false,
}: {
  testId?: string
  force?: boolean
}) {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const { pathname } = useLocation()
  const fromGarden =
    force || isOnGardenTrip(pathname) || params.get('from') === 'garden' || params.has('practice')
  if (!fromGarden) return null
  return (
    <LinkButton to="/mistake-garden" size="md" data-testid={testId}>
      {t('practiceGarden.backToGarden')}
    </LinkButton>
  )
}

import { useTranslation } from 'react-i18next'

/** The accessible name of a PRO-locked control on Free, e.g. "Tinglash (PRO)". */
export function useProLabel() {
  const { t } = useTranslation()
  return (label: string) => `${label} (${t('tier.proFeature')})`
}

import { useTranslation } from 'react-i18next'
import { LearnShell } from '@/features/learn/LearnShell'

/** Placeholder – the section is being built. */
export function GardenPage() {
  const { t } = useTranslation()
  return (
    <LearnShell title={t('learn.sections.garden')}>
      <p className="text-center text-xl">{t('learn.sections.garden')}</p>
    </LearnShell>
  )
}

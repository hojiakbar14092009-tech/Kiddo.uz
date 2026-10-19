import { useTranslation } from 'react-i18next'
import { LearnShell } from '@/features/learn/LearnShell'

/** Placeholder – the section is being built. */
export function TalesPage() {
  const { t } = useTranslation()
  return (
    <LearnShell title={t('learn.sections.tales')}>
      <p className="text-center text-xl">{t('learn.sections.tales')}</p>
    </LearnShell>
  )
}

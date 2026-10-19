import { useTranslation } from 'react-i18next'
import { LearnShell } from '@/features/learn/LearnShell'

/** Placeholder – the section is being built. */
export function MathPage() {
  const { t } = useTranslation()
  return (
    <LearnShell title={t('learn.sections.math')}>
      <p className="text-center text-xl">{t('learn.sections.math')}</p>
    </LearnShell>
  )
}

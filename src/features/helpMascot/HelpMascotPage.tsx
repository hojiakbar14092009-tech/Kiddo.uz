import { useTranslation } from 'react-i18next'
import { LearnShell } from '@/features/learn/LearnShell'

/** Placeholder – the section is being built. */
export function HelpMascotPage() {
  const { t } = useTranslation()
  return (
    <LearnShell title={t('learn.sections.help')}>
      <p className="text-center text-xl">{t('learn.sections.help')}</p>
    </LearnShell>
  )
}

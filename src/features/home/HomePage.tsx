import { useTranslation } from 'react-i18next'
import { Screen } from '@/components/layout/Screen'
import { TopBar } from '@/components/layout/TopBar'

export function HomePage() {
  const { t } = useTranslation()

  return (
    <Screen header={<TopBar showHome={false} />} className="items-center justify-center p-6">
      <h1 className="font-display text-4xl font-extrabold">{t('home.greetingNoName')}</h1>
    </Screen>
  )
}

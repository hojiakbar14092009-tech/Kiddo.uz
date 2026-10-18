import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Screen } from '@/components/layout/Screen'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'

export function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <Screen header={<TopBar showHome={false} />} className="items-center justify-center gap-8 p-6">
      <h1 className="font-display text-4xl font-extrabold">{t('home.greetingNoName')}</h1>
      <Button onClick={() => navigate('/alphabet')}>{t('home.alphabet')}</Button>
    </Screen>
  )
}

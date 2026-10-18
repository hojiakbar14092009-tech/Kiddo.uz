import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Screen } from '@/components/layout/Screen'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'
import { PeekingMascot } from '@/features/mascot/PeekingMascot'
import { useActiveChild } from '@/store/familyStore'

export function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const child = useActiveChild()
  const hello = child ? t('mascot.homeHello', { name: child.name }) : t('mascot.homeHelloNoName')

  return (
    <Screen header={<TopBar showHome={false} />} className="items-center justify-center gap-8 p-6">
      <h1 className="font-display text-4xl font-extrabold">
        {child ? t('home.greeting', { name: child.name }) : t('home.greetingNoName')}
      </h1>
      <Button onClick={() => navigate('/alphabet')}>{t('home.alphabet')}</Button>
      <PeekingMascot message={hello} />
    </Screen>
  )
}

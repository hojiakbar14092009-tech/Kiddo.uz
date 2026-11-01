import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAnalyticsStore, type AnalyticsEvent } from '@/domain/analytics'
import { tashkentDay } from '@/lib/dates'
import { useFamilyStore } from '@/store/familyStore'
import { renderRoute } from '@/test/renderRoute'
import { useAdminStore } from './adminSession'
import { screenName } from './analyticsLabels'

const today = tashkentDay()
const ev = (name: AnalyticsEvent['name'], install: string, screen?: string): AnalyticsEvent => ({
  id: `${name}-${install}-${screen ?? ''}`,
  name,
  install,
  day: today,
  at: new Date().toISOString(),
  ...(screen ? { screen } : {}),
})

describe('admin analytics (Phase 37)', () => {
  beforeEach(() => {
    useAdminStore.setState({ session: { source: 'device' }, theme: 'dark' })
    useFamilyStore.setState({ children: [], activeChildId: null })
    useAnalyticsStore.setState({
      enabled: true,
      queue: [],
      ever: [],
      once: [],
      log: [
        ev('first_opened', 'a'),
        ev('first_opened', 'b'),
        ev('first_opened', 'c'),
        ev('app_opened', 'a'),
        ev('app_opened', 'b'),
        ev('app_opened', 'c'),
        ev('onboarding_done', 'a'),
        ev('onboarding_done', 'b'),
        ev('activity_opened', 'a', '/tasks/trace'),
        ev('app_closed', 'b', '/welcome'),
        ev('app_closed', 'c', '/welcome'),
        ev('app_closed', 'a', '/tasks/trace'),
      ],
    })
  })

  it('shows how far families get and where the app was left, in plain words', async () => {
    const { user } = await renderRoute('/admin')
    await user.click(screen.getByRole('button', { name: 'Analitika' }))
    const funnel = screen.getByTestId('admin-funnel')
    const steps = within(funnel).getAllByRole('listitem')
    expect(steps[0]).toHaveAttribute('data-installs', '3')
    expect(steps[0]).toHaveTextContent('Ilovani birinchi marta ochdi')
    expect(steps[1]).toHaveAttribute('data-installs', '2')
    expect(steps[1]).toHaveTextContent('Bola profilini yaratdi')
    expect(steps[1]).toHaveTextContent('−1 chiqib ketdi')
    expect(steps[2]).toHaveTextContent('Mashqni ochdi')
    const exits = screen.getByTestId('admin-exits')
    const rows = within(exits).getAllByRole('row')
    // the most frequent first: the welcome screen, twice
    expect(rows[1]).toHaveTextContent('Xush kelibsiz')
    expect(rows[1]).toHaveTextContent('2')
    expect(screen.getByText(/faqat shu qurilmaning ma’lumoti/)).toBeInTheDocument()
  })

  it('the 7-day view leaves out older events', async () => {
    const old = new Date(Date.now() - 20 * 86_400_000)
    useAnalyticsStore.setState({
      log: [
        { ...ev('first_opened', 'z'), id: 'old', day: tashkentDay(old), at: old.toISOString() },
      ],
    })
    const { user } = await renderRoute('/admin')
    await user.click(screen.getByRole('button', { name: 'Analitika' }))
    expect(screen.getByTestId('admin-funnel')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '7 kun' }))
    expect(screen.getByText('Bu davrda hali hech kim ilovani ochmagan.')).toBeInTheDocument()
  })

  it('names screens for people, never shows an unknown path as is', () => {
    expect(screenName('/worlds/dino')).toBe('Dunyolar')
    expect(screenName('/start')).toBe('Boshlanish')
    expect(screenName('/other')).toBe('Boshqa sahifa')
  })
})

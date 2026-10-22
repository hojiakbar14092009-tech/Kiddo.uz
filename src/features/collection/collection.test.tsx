import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { emitActivity, grantResource, useUniverseStore } from '@/domain/universe'
import { useFamilyStore } from '@/store/familyStore'
import { GUEST_KEY, useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'

beforeEach(() => {
  useSettingsStore.setState({ language: 'uz' })
  useFamilyStore.setState({ children: [], activeChildId: null })
  useProgressStore.setState({ byChild: {} })
  useUniverseStore.setState({ byChild: {} })
})

describe('Collection', () => {
  it('is kindly empty at first, and still explains every treasure and medal', async () => {
    await renderRoute('/collection')
    const empty = screen.getByTestId('collection-empty')
    expect(empty).toHaveTextContent('Kolleksiya hali bo‘sh')
    expect(within(empty).getByRole('link', { name: 'O‘ynashni boshlash' })).toHaveAttribute(
      'href',
      '/home',
    )
    expect(screen.getByTestId('treasure-crystal')).toHaveTextContent(
      'Shahardagi binolarni kattalashtirish uchun.',
    )
    expect(screen.getByTestId('medal-first-steps')).toHaveTextContent('Hali medal yo‘q')
    expect(screen.getByTestId('medal-first-steps')).toHaveTextContent('Keyingi medalgacha: 0 / 3')
    expect(screen.getByRole('heading', { name: /Mening stikerlarim/ })).toBeInTheDocument()
  })

  it('shows counts and medal tiers once something is earned', async () => {
    for (let index = 0; index < 3; index++) {
      emitActivity({
        id: `run-${index}`,
        childKey: GUEST_KEY,
        activity: `words:${index}`,
        strand: 'reading',
        correct: 4,
        total: 4,
        independent: 4,
      })
    }
    grantResource({ childKey: GUEST_KEY, resource: 'part', amount: 2, reason: 'test', refId: 'p' })
    await renderRoute('/collection')

    expect(screen.queryByTestId('collection-empty')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Yulduzlar: 9' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Kristallar: 3' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Detallar: 2' })).toBeInTheDocument()

    const firstSteps = screen.getByTestId('medal-first-steps')
    expect(firstSteps).toHaveTextContent('Bronza')
    expect(firstSteps).toHaveTextContent('Keyingi medalgacha: 3 / 25')
    expect(within(firstSteps).getByRole('progressbar')).toHaveAttribute('aria-valuemax', '25')
    expect(screen.getByTestId('medal-crystal-keeper')).toHaveTextContent('Bronza')
    expect(screen.getByTestId('medal-artist')).toHaveTextContent('Hali medal yo‘q')
  })
})

import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { birthDateForAge } from '@/features/age/ageLevel'
import { recordProPurchase } from '@/features/pro/purchase'
import { dayKey } from '@/features/tasks/rules'
import { useAppSettingsStore, DEFAULT_APP_SETTINGS } from '@/store/appSettingsStore'
import { useFamilyStore } from '@/store/familyStore'
import { usePaymentStore } from '@/store/paymentStore'
import { useProgressStore } from '@/store/progressStore'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { renderRoute } from '@/test/renderRoute'
import { useAdminStore } from './adminSession'

describe('Admin panel', () => {
  beforeEach(() => {
    useAdminStore.setState({ session: null, theme: 'dark' })
    useFamilyStore.setState({ children: [], activeChildId: null })
    useProgressStore.setState({ byChild: {} })
    usePaymentStore.setState({ payments: [] })
    useSubscriptionStore.getState().cancel()
    useAppSettingsStore.setState(DEFAULT_APP_SETTINGS)
  })

  it('asks for the PIN, then lists the children with their PRO status', async () => {
    const family = useFamilyStore.getState()
    family.addChild({ name: 'Ali', birthDate: birthDateForAge(5, dayKey()), gender: 'boy' })
    family.addChild({ name: 'Lola', birthDate: birthDateForAge(4, dayKey()), gender: 'girl' })

    const { user } = await renderRoute('/admin')
    await user.type(screen.getByLabelText('Admin PIN'), '0000')
    await user.click(screen.getByRole('button', { name: 'Ochish' }))
    expect(screen.getByRole('alert')).toHaveTextContent('PIN noto‘g‘ri')

    await user.clear(screen.getByLabelText('Admin PIN'))
    await user.type(screen.getByLabelText('Admin PIN'), '2026')
    await user.click(screen.getByRole('button', { name: 'Ochish' }))
    expect(screen.getByRole('heading', { name: 'Umumiy' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Bolalar' }))
    const table = screen.getByRole('table')
    expect(within(table).getByText('Ali')).toBeInTheDocument()
    expect(within(table).getAllByText('Bepul')).toHaveLength(2)

    // The admin gives PRO for 30 days: both children of the family have it.
    await user.click(within(table).getAllByRole('button', { name: 'PRO +30 kun' })[0]!)
    expect(within(table).getAllByText('PRO')).toHaveLength(2)
  })

  it('records a PRO payment, gives each child 50 coins and counts the income', async () => {
    const ali = useFamilyStore
      .getState()
      .addChild({ name: 'Ali', birthDate: birthDateForAge(5, dayKey()), gender: 'boy' })
    expect(recordProPurchase('yearly', 'click', 199_000)).toBe(50)
    expect(useProgressStore.getState().byChild[ali.id]?.coins).toBe(50)
    expect(usePaymentStore.getState().payments[0]).toMatchObject({ amount: 199_000, family: 'Ali' })

    useAdminStore.setState({ session: { source: 'device' } })
    await renderRoute('/admin')
    expect(screen.getAllByText('199 000').length).toBeGreaterThan(0)
    expect(await screen.findByText(/Bugun 1 kishi PRO sotib oldi/)).toBeInTheDocument()
  })
})

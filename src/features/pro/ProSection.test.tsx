import { act, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useParentGateStore, useParentStore } from '@/store/parentStore'
import { isProActive, useSubscriptionStore } from '@/store/subscriptionStore'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'

vi.mock('@/services/payments/mockPayment', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/services/payments/mockPayment')>()
  return {
    ...original,
    payMock: (request: Parameters<typeof original.payMock>[0]) => original.payMock(request, 0),
  }
})

describe('PRO in the parent area', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'uz' })
    useParentGateStore.setState({ openedAt: Date.now() })
    useParentStore.setState({ session: { mode: 'demo' } })
    useSubscriptionStore.getState().cancel()
    useSubscriptionStore.setState({ usedPromoCodes: [] })
  })

  it('is only reachable through the parent gate', async () => {
    useParentGateStore.setState({ openedAt: null })
    await renderRoute('/parent/dashboard?tab=pro')
    expect(screen.getByRole('dialog', { name: 'Faqat kattalar uchun' })).toBeInTheDocument()
    expect(screen.queryByText('PRO olish')).not.toBeInTheDocument()
  })

  it('buys a plan with a test payment', async () => {
    const { user } = await renderRoute('/parent/dashboard?tab=pro')
    expect(screen.getByText('Bepul versiya')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /1 oy/ }))
    await user.click(screen.getByRole('radio', { name: 'Payme' }))
    await user.click(screen.getByRole('button', { name: /29 000 so‘m to‘lash/ }))

    expect(await screen.findByText('Rahmat! PRO yoqildi 👑')).toBeInTheDocument()
    const state = useSubscriptionStore.getState()
    expect(state).toMatchObject({ plan: 'monthly', source: 'payment' })
    expect(isProActive(state)).toBe(true)
    expect(screen.getByText('Kiddo PRO yoqilgan')).toBeInTheDocument()
  })

  it('redeems a promo code once', async () => {
    const { user } = await renderRoute('/parent/dashboard?tab=pro')
    const input = screen.getByRole('textbox', { name: 'Kodni kiriting' })
    await user.type(input, 'kiddo7')
    await user.click(screen.getByRole('button', { name: 'Qo‘llash' }))
    expect(screen.getByText('Promokod qabul qilindi! PRO kunlari qo‘shildi.')).toBeInTheDocument()

    await user.type(input, 'KIDDO7')
    await user.click(screen.getByRole('button', { name: 'Qo‘llash' }))
    expect(screen.getByText('Bu promokod allaqachon ishlatilgan.')).toBeInTheDocument()
  })

  it('turns demo PRO on and off, but never over a paid plan', async () => {
    const { user } = await renderRoute('/parent/dashboard?tab=pro')
    const toggle = screen.getByRole('switch', { name: /PRO’ni sinab ko‘rish/ })
    await user.click(toggle)
    expect(useSubscriptionStore.getState().source).toBe('demo')
    await user.click(toggle)
    expect(isProActive(useSubscriptionStore.getState())).toBe(false)

    act(() => useSubscriptionStore.getState().activatePlan('yearly', 'payment'))
    expect(screen.getByRole('switch', { name: /PRO’ni sinab ko‘rish/ })).toBeDisabled()
  })
})

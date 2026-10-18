import { act, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdsStore } from '@/store/adsStore'
import { useParentGateStore, useParentStore } from '@/store/parentStore'
import { usePromoStore } from '@/store/promoStore'
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
    usePromoStore.setState({ claim: null, redeemed: [] })
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
    await user.type(input, 'kiddo07')
    await user.click(screen.getByRole('button', { name: 'Qo‘llash' }))
    expect(
      await screen.findByText('Promokod qabul qilindi! PRO kunlari qo‘shildi.'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Zo‘r, boshladik!' }))

    await user.clear(input)
    await user.type(input, 'KIDDO07')
    await user.click(screen.getByRole('button', { name: 'Qo‘llash' }))
    expect(await screen.findByText('Bu promokod allaqachon ishlatilgan.')).toBeInTheDocument()
  })

  it('says there is no ad yet and gives no code', async () => {
    useAdsStore.setState({ ads: [] })
    const { user } = await renderRoute('/parent/dashboard?tab=pro')
    await user.click(screen.getByRole('button', { name: 'Promokodni olish' }))
    expect(
      await screen.findByText(
        'Hozircha reklama yo‘q. Reklama qo‘yilgach, promokodni shu yerdan olasiz.',
      ),
    ).toBeInTheDocument()
    expect(usePromoStore.getState().claim).toBeNull()
  })

  it('shows the yearly price as twelve months less 20 %', async () => {
    await renderRoute('/parent/dashboard?tab=pro')
    expect(screen.getByRole('radio', { name: /1 yil.*278\s400/ })).toBeInTheDocument()
    expect(screen.getByText('−20%')).toBeInTheDocument()
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

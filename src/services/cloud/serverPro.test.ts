import { beforeEach, describe, expect, it } from 'vitest'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { applyServerPro } from './serverPro'

describe('Pro follows the server', () => {
  beforeEach(() => useSubscriptionStore.setState({ plan: null, expiresAt: null, source: null }))

  it('a paid plan comes from the server', () => {
    applyServerPro({ active: true, plan: 'year', expiresAt: Date.UTC(2027, 10, 13) })
    expect(useSubscriptionStore.getState()).toMatchObject({
      plan: 'yearly',
      source: 'payment',
      expiresAt: '2027-11-13T00:00:00.000Z',
    })
  })

  it('a "paid" plan written into the device storage is taken away when the server has none', () => {
    useSubscriptionStore.setState({
      plan: 'yearly',
      expiresAt: '2099-01-01T00:00:00.000Z',
      source: 'payment',
    })
    applyServerPro({ active: false, plan: null, expiresAt: null })
    expect(useSubscriptionStore.getState().plan).toBeNull()
  })

  it('promo Pro on the device is kept', () => {
    useSubscriptionStore.setState({
      plan: 'monthly',
      expiresAt: '2099-01-01T00:00:00.000Z',
      source: 'promo',
    })
    applyServerPro({ active: false, plan: null, expiresAt: null })
    expect(useSubscriptionStore.getState().source).toBe('promo')
  })
})

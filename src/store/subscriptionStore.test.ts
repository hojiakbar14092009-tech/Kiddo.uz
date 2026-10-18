import { beforeEach, describe, expect, it } from 'vitest'
import { isProActive, useSubscriptionStore } from './subscriptionStore'

const NOW = new Date('2026-10-18T10:00:00Z')
const DAY = 24 * 60 * 60 * 1000

describe('subscriptionStore', () => {
  beforeEach(() => useSubscriptionStore.getState().cancel())

  it('starts on Free', () => {
    expect(isProActive(useSubscriptionStore.getState())).toBe(false)
  })

  it('activates a monthly plan for 30 days', () => {
    useSubscriptionStore.getState().activatePlan('monthly', 'payment', NOW)
    const state = useSubscriptionStore.getState()
    expect(isProActive(state, NOW.getTime() + 29 * DAY)).toBe(true)
    expect(isProActive(state, NOW.getTime() + 31 * DAY)).toBe(false)
  })

  it('never expires a lifetime plan', () => {
    useSubscriptionStore.getState().activatePlan('lifetime', 'payment', NOW)
    expect(isProActive(useSubscriptionStore.getState(), NOW.getTime() + 9999 * DAY)).toBe(true)
  })

  it('extends an active plan when days are granted', () => {
    const store = useSubscriptionStore.getState()
    store.activatePlan('monthly', 'payment', NOW)
    store.grantDays(10, 'promo', NOW)
    expect(Date.parse(useSubscriptionStore.getState().expiresAt!)).toBe(NOW.getTime() + 40 * DAY)
  })

  it('toggles demo PRO on and off', () => {
    useSubscriptionStore.getState().setDemoPro(true)
    expect(useSubscriptionStore.getState()).toMatchObject({ plan: 'lifetime', source: 'demo' })
    useSubscriptionStore.getState().setDemoPro(false)
    expect(isProActive(useSubscriptionStore.getState())).toBe(false)
  })
})

describe('promo codes', () => {
  beforeEach(() => {
    useSubscriptionStore.getState().cancel()
    useSubscriptionStore.setState({ usedPromoCodes: [] })
  })

  it('gives PRO days once per code, ignoring case and spaces', () => {
    const store = useSubscriptionStore.getState()
    expect(store.redeemPromo('  kiddo7 ', NOW)).toBe('ok')
    expect(isProActive(useSubscriptionStore.getState(), NOW.getTime() + 6 * DAY)).toBe(true)
    expect(isProActive(useSubscriptionStore.getState(), NOW.getTime() + 8 * DAY)).toBe(false)
    expect(store.redeemPromo('KIDDO7', NOW)).toBe('used')
  })

  it('adds promo days on top of an active plan', () => {
    const store = useSubscriptionStore.getState()
    store.activatePlan('monthly', 'payment', NOW)
    store.redeemPromo('BOLAJON30', NOW)
    expect(isProActive(useSubscriptionStore.getState(), NOW.getTime() + 59 * DAY)).toBe(true)
  })

  it('rejects unknown codes and does not touch lifetime PRO', () => {
    const store = useSubscriptionStore.getState()
    expect(store.redeemPromo('FREE', NOW)).toBe('invalid')
    store.activatePlan('lifetime', 'payment', NOW)
    expect(store.redeemPromo('KIDDO7', NOW)).toBe('lifetime')
    expect(useSubscriptionStore.getState().usedPromoCodes).toEqual([])
  })
})

describe('buying on top of PRO', () => {
  beforeEach(() => useSubscriptionStore.getState().cancel())

  it('adds a new plan to the days still left', () => {
    const store = useSubscriptionStore.getState()
    store.activatePlan('monthly', 'payment', NOW)
    store.activatePlan('yearly', 'payment', new Date(NOW.getTime() + 10 * DAY))
    expect(isProActive(useSubscriptionStore.getState(), NOW.getTime() + 394 * DAY)).toBe(true)
  })

  it('never turns lifetime into a shorter plan, but replaces demo PRO', () => {
    const store = useSubscriptionStore.getState()
    store.activatePlan('lifetime', 'payment', NOW)
    store.activatePlan('monthly', 'payment', NOW)
    expect(useSubscriptionStore.getState()).toMatchObject({ plan: 'lifetime', expiresAt: null })

    store.cancel()
    store.setDemoPro(true)
    store.activatePlan('monthly', 'payment', NOW)
    expect(useSubscriptionStore.getState()).toMatchObject({ plan: 'monthly', source: 'payment' })
  })
})

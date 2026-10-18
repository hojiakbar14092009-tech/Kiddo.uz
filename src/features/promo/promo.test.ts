import { beforeEach, describe, expect, it, vi } from 'vitest'
import { plansFor } from '@/features/pro/plans'
import { useAdsStore } from '@/store/adsStore'
import { yearlyPrice } from '@/store/appSettingsStore'
import { BUILT_IN_CODES, usePromoStore } from '@/store/promoStore'
import { isProActive, useSubscriptionStore } from '@/store/subscriptionStore'
import { deviceBackend } from './promoBackend'
import { hashCode, seal, unseal } from './vault'

const AD = {
  id: 'ad-1',
  title: 'Test ad',
  duration: 20,
  url: 'https://example.com/ad.mp4',
  active: true,
  createdAt: '2026-10-19T00:00:00.000Z',
  views: 0,
  completions: 0,
}

describe('sealed promo codes', () => {
  it('ships KIDDO07 and BOLAJON30 without their plain text', async () => {
    expect(BUILT_IN_CODES.map(unseal)).toEqual(['KIDDO07', 'BOLAJON30'])
    expect(JSON.stringify(BUILT_IN_CODES)).not.toMatch(/KIDDO07|BOLAJON30/)
    expect(BUILT_IN_CODES[0]!.hash).toBe(await hashCode(' kiddo07 '))
    expect(unseal({ sealed: seal('ABC123', 99), nonce: 99 })).toBe('ABC123')
  })
})

describe('getting a promo code by watching an ad (this device)', () => {
  beforeEach(() => {
    vi.useRealTimers()
    usePromoStore.setState({ codes: BUILT_IN_CODES, claim: null, redeemed: [] })
    useAdsStore.setState({ ads: [] })
    useSubscriptionStore.getState().cancel()
    useSubscriptionStore.setState({ usedPromoCodes: [] })
  })

  it('has nothing to show while the admin has not put up an ad', async () => {
    expect(await deviceBackend.nextAd()).toBeNull()
  })

  it('gives one code only after the whole ad, and only once', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-19T10:00:00Z') })
    useAdsStore.setState({ ads: [AD] })
    const ad = (await deviceBackend.nextAd())!
    const token = await deviceBackend.startView(ad)

    vi.advanceTimersByTime(5_000)
    expect(await deviceBackend.claim(token, ad)).toEqual({ ok: false, reason: 'notFinished' })

    vi.advanceTimersByTime(15_000)
    const outcome = await deviceBackend.claim(token, ad)
    expect(outcome.ok).toBe(true)
    const code = outcome.ok ? outcome.promo.code : ''
    expect(['KIDDO07', 'BOLAJON30']).toContain(code)
    expect(await deviceBackend.currentClaim()).toMatchObject({ code })
    expect(useAdsStore.getState().ads[0]).toMatchObject({ views: 1, completions: 1 })

    // a second ad gives no second code
    const again = await deviceBackend.startView(ad)
    vi.advanceTimersByTime(20_000)
    expect(await deviceBackend.claim(again, ad)).toEqual({ ok: false, reason: 'already' })

    vi.useRealTimers()
    expect(await deviceBackend.redeem(code)).toBe('ok')
    expect(isProActive(useSubscriptionStore.getState())).toBe(true)
    expect(await deviceBackend.redeem(code)).toBe('used')
  })

  it('accepts codes the admin adds and rejects switched-off ones', async () => {
    await usePromoStore.getState().addCode('yangi2026', 14)
    expect(await deviceBackend.redeem('YANGI2026')).toBe('ok')
    const kiddo = BUILT_IN_CODES[0]!.hash
    usePromoStore.getState().setActive(kiddo, false)
    expect(await deviceBackend.redeem('KIDDO07')).toBe('invalid')
    expect(JSON.stringify(usePromoStore.getState().codes)).not.toContain('YANGI2026')
  })
})

describe('prices', () => {
  it('works the yearly price out of the monthly one: 12 months less 20 %', () => {
    expect(yearlyPrice(29_000)).toBe(278_400)
    expect(yearlyPrice(35_000)).toBe(336_000)
    expect(plansFor({ monthly: 35_000, yearly: 1 })).toEqual([
      { id: 'monthly', price: 35_000 },
      { id: 'yearly', price: 336_000, savingPercent: 20 },
    ])
  })
})

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { entitlementFor } from '@/domain/entitlements/features'
import { AdminPage } from '@/features/admin/AdminPage'
import { acceptedSession, dataSource, useAdminStore } from '@/features/admin/adminSession'
import { deviceBackend } from '@/features/promo/promoBackend'
import { ProSection } from '@/features/pro/ProSection'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { DEMO, resolveDemoConfig } from './demo'
import { DEMO_PROMO_CODES, lookupDemoPromo } from './demoPromoCodes'

/*
 * Phase 20: the demo build. Tests run without a cloud backend, so they run as
 * the demo, like the public deployment (DEMO is real here, not mocked).
 */

const clearSubscription = () =>
  useSubscriptionStore.setState({ plan: null, expiresAt: null, source: null, usedPromoCodes: [] })

describe('demo configuration', () => {
  it('a build without a cloud backend is a demo; explicit flags win', () => {
    expect(resolveDemoConfig({}, false)).toEqual({
      demoMode: true,
      publicProUIEnabled: false,
      demoAdminEnabled: true,
    })
    expect(resolveDemoConfig({}, true)).toEqual({
      demoMode: false,
      publicProUIEnabled: true,
      demoAdminEnabled: false,
    })
    expect(resolveDemoConfig({ VITE_DEMO_MODE: 'false' }, false).demoAdminEnabled).toBe(false)
    // a stray env var cannot open the demo door in a build with real accounts
    expect(resolveDemoConfig({ VITE_DEMO_MODE: 'true' }, true)).toEqual({
      demoMode: false,
      publicProUIEnabled: true,
      demoAdminEnabled: false,
    })
    expect(resolveDemoConfig({ VITE_PUBLIC_PRO_UI: 'true' }, false).publicProUIEnabled).toBe(true)
    expect(DEMO.demoMode).toBe(true)
  })
})

describe('demo admin is not a production login', () => {
  afterEach(() => useAdminStore.setState({ session: null }))

  it('a demo session is refused by a build that is not a demo, and sees only this device', () => {
    expect(acceptedSession({ source: 'demo' }, { pin: null, demoAdmin: true })).toEqual({
      source: 'demo',
    })
    expect(acceptedSession({ source: 'demo' }, { pin: null, demoAdmin: false })).toBeNull()
    expect(acceptedSession({ source: 'device' }, { pin: null, demoAdmin: true })).toBeNull()
    expect(
      acceptedSession({ source: 'cloud', email: 'a@b.c' }, { pin: null, demoAdmin: true }),
    ).not.toBeNull()
    expect(dataSource({ source: 'demo' })).toBe('device')
  })

  it('/admin offers a demo entry instead of a dead end, then the demo controls', async () => {
    clearSubscription()
    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>,
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Demo administrator sifatida kirish' }),
    )
    expect(screen.getByTestId('demo-admin-banner')).toBeInTheDocument()
    // no money in the demo: no payments section
    const nav = screen.getByRole('navigation', { name: 'Bo‘limlar' })
    expect(within(nav).queryByRole('button', { name: /To‘lovlar/ })).toBeNull()
    await userEvent.click(within(nav).getByRole('button', { name: /Demo/ }))
    expect(screen.getByTestId('demo-promo-list').querySelectorAll('li')).toHaveLength(10)
    await userEvent.click(screen.getByTestId('demo-pro-switch'))
    expect(useSubscriptionStore.getState().source).toBe('demo')
    await userEvent.click(screen.getByTestId('demo-reset'))
    expect(useSubscriptionStore.getState().plan).toBeNull()
  })
})

describe('the ten demo promo codes', () => {
  afterEach(clearSubscription)

  it('are exactly ten, unique and clearly demo codes', () => {
    const codes = DEMO_PROMO_CODES.map((item) => item.code)
    expect(codes).toHaveLength(10)
    expect(new Set(codes).size).toBe(10)
    for (const code of codes) expect(code).toMatch(/^KIDDODEMO\d{2}$/)
  })

  it('validate centrally: case, spaces, unknown and expired codes', () => {
    expect(lookupDemoPromo('kiddodemo01')).toEqual({ days: 7 })
    expect(lookupDemoPromo('  KIDDO DEMO 10 ')).toEqual({ days: 90 })
    expect(lookupDemoPromo('KIDDODEMO11')).toBeNull()
    expect(lookupDemoPromo('KIDDODEMO01', new Date('2028-01-01T00:00:00Z'))).toBe('expired')
  })

  it('a code opens PRO once on this device; a second use is refused', async () => {
    expect(await deviceBackend.redeem('kiddodemo04')).toBe('ok')
    expect(useSubscriptionStore.getState().source).toBe('promo')
    expect(await deviceBackend.redeem('KIDDODEMO04')).toBe('used')
    expect(await deviceBackend.redeem('NOPE')).toBe('invalid')
  })
})

describe('PRO in the demo', () => {
  afterEach(clearSubscription)

  it('the voice is free for everyone; extra content still needs PRO', () => {
    expect(entitlementFor('audio', { paid: false, child: false })).toEqual({
      allowed: true,
      reason: 'ok',
    })
    expect(entitlementFor('premiumWorlds', { paid: false, child: true }).allowed).toBe(false)
    expect(entitlementFor('audio', { paid: false, child: true }, false).allowed).toBe(false)
  })

  it('the parent area shows no prices or purchase, only the promo code', () => {
    render(
      <MemoryRouter>
        <ProSection />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('pro-demo-note')).toBeInTheDocument()
    expect(screen.queryByRole('radio')).toBeNull()
    expect(screen.queryByText(/so‘m/)).toBeNull()
  })
})

describe('the demo switches stay in their lane', () => {
  afterEach(clearSubscription)

  it('a demo code replaces the simulated demo PRO instead of answering “lifetime”', () => {
    useSubscriptionStore.getState().setDemoPro(true)
    expect(useSubscriptionStore.getState().redeemPromo('KIDDODEMO01', 7)).toBe('ok')
    expect(useSubscriptionStore.getState().source).toBe('promo')
  })

  it('“reset the demo” frees the demo codes but keeps PRO earned from an ad code', async () => {
    const now = Date.now()
    useSubscriptionStore.getState().redeemPromo('BOLAJON30', 30)
    useSubscriptionStore.getState().redeemPromo('KIDDODEMO04', 14)
    useAdminStore.setState({ session: { source: 'demo' } })
    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Demo' }))
    await userEvent.click(screen.getByTestId('demo-reset'))
    const state = useSubscriptionStore.getState()
    expect(state.source).toBe('promo')
    expect(state.usedPromoCodes).toEqual(['BOLAJON30'])
    // the ad code's 30 days are left, the demo code's 14 are gone
    const left = (Date.parse(state.expiresAt ?? '') - now) / 86_400_000
    expect(left).toBeGreaterThan(29.9)
    expect(left).toBeLessThan(30.1)
    useAdminStore.setState({ session: null })
  })
})

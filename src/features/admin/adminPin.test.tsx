import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { rewardHistory, useRewardStore } from '@/domain/rewards'
import { birthDateForAge } from '@/features/age/ageLevel'
import { dayKey } from '@/features/tasks/rules'
import { useFamilyStore } from '@/store/familyStore'
import { useProgressStore } from '@/store/progressStore'
import { renderRoute } from '@/test/renderRoute'
import { adminPin, useAdminStore } from './adminSession'

// These tests cover a production (non-demo) build: PRO gates the voice there.
vi.mock('@/config/demo', () => ({
  DEMO: { demoMode: false, publicProUIEnabled: true, demoAdminEnabled: false },
}))

describe('device admin PIN', () => {
  beforeEach(() => useAdminStore.setState({ session: null, theme: 'dark' }))
  afterEach(() => vi.unstubAllEnvs())

  it('a production build has no device admin at all, not even with VITE_ADMIN_PIN', () => {
    vi.stubEnv('PROD', true)
    vi.stubEnv('MODE', 'production')
    vi.stubEnv('VITE_ADMIN_PIN', ' 9137 ')
    expect(adminPin()).toBeNull()
    vi.stubEnv('VITE_ADMIN_PIN', '')
    expect(adminPin()).toBeNull()
  })

  it('development keeps the old PIN; the e2e build uses VITE_ADMIN_PIN only', () => {
    vi.stubEnv('PROD', false)
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_ADMIN_PIN', '')
    expect(adminPin()).toBe('2026')
    vi.stubEnv('PROD', true)
    vi.stubEnv('MODE', 'e2e')
    expect(adminPin()).toBeNull()
    vi.stubEnv('VITE_ADMIN_PIN', ' 9137 ')
    expect(adminPin()).toBe('9137')
  })

  it('production: says there is no device admin and offers no PIN field', async () => {
    vi.stubEnv('PROD', true)
    vi.stubEnv('MODE', 'production')
    vi.stubEnv('VITE_ADMIN_PIN', '9137')
    await renderRoute('/admin')
    expect(screen.getByText(/qurilma admini yo‘q/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Admin PIN')).not.toBeInTheDocument()
  })

  it('the e2e build with VITE_ADMIN_PIN: only that PIN opens, the old default does not', async () => {
    vi.stubEnv('VITE_ADMIN_PIN', '9137')
    vi.stubEnv('PROD', true)
    vi.stubEnv('MODE', 'e2e')
    const { user } = await renderRoute('/admin')
    await user.type(screen.getByLabelText('Admin PIN'), '2026')
    await user.click(screen.getByRole('button', { name: 'Ochish' }))
    expect(screen.getByRole('alert')).toHaveTextContent('PIN noto‘g‘ri')

    await user.clear(screen.getByLabelText('Admin PIN'))
    await user.type(screen.getByLabelText('Admin PIN'), '9137')
    await user.click(screen.getByRole('button', { name: 'Ochish' }))
    expect(screen.getByRole('heading', { name: 'Umumiy' })).toBeInTheDocument()
  })
})

describe('device admin coin grant', () => {
  it('goes through the reward ledger, once per press', async () => {
    useFamilyStore.setState({ children: [], activeChildId: null })
    useProgressStore.setState({ byChild: {} })
    useRewardStore.setState({ byChild: {} })
    const ali = useFamilyStore
      .getState()
      .addChild({ name: 'Ali', birthDate: birthDateForAge(5, dayKey()), gender: 'boy' })
    useAdminStore.setState({ session: { source: 'device' }, theme: 'dark' })

    const { user } = await renderRoute('/admin')
    await user.click(screen.getByRole('button', { name: 'Bolalar' }))
    const table = screen.getByRole('table')
    await user.click(within(table).getByRole('button', { name: '+50 coin' }))
    await user.click(within(table).getByRole('button', { name: '+50 coin' }))

    expect(useProgressStore.getState().byChild[ali.id]?.coins).toBe(100)
    const entries = rewardHistory(ali.id)
    expect(entries).toHaveLength(2)
    expect(entries.every((entry) => entry.reason === 'admin' && entry.coins === 50)).toBe(true)
  })
})

describe('persisted device admin session', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('is refused in a production build (an edited sessionStorage opens nothing)', async () => {
    vi.stubEnv('VITE_ADMIN_PIN', '9137')
    vi.stubEnv('PROD', true)
    vi.stubEnv('MODE', 'production')
    useAdminStore.setState({ session: { source: 'device' }, theme: 'dark' })
    await renderRoute('/admin')
    expect(screen.queryByRole('heading', { name: 'Umumiy' })).not.toBeInTheDocument()
    expect(screen.getByText(/qurilma admini yo‘q/)).toBeInTheDocument()
  })
})

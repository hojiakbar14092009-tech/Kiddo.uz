import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { rewardHistory, useRewardStore } from '@/domain/rewards'
import { birthDateForAge } from '@/features/age/ageLevel'
import { dayKey } from '@/features/tasks/rules'
import { useFamilyStore } from '@/store/familyStore'
import { useProgressStore } from '@/store/progressStore'
import { renderRoute } from '@/test/renderRoute'
import { adminPin, useAdminStore } from './adminSession'

describe('device admin PIN', () => {
  beforeEach(() => useAdminStore.setState({ session: null, theme: 'dark' }))
  afterEach(() => vi.unstubAllEnvs())

  it('has no default PIN in a production build', () => {
    vi.stubEnv('VITE_ADMIN_PIN', '')
    vi.stubEnv('PROD', true)
    expect(adminPin()).toBeNull()
    vi.stubEnv('PROD', false)
    expect(adminPin()).toBe('2026')
    vi.stubEnv('VITE_ADMIN_PIN', ' 9137 ')
    vi.stubEnv('PROD', true)
    expect(adminPin()).toBe('9137')
  })

  it('production without VITE_ADMIN_PIN: says it is not configured and offers no PIN field', async () => {
    vi.stubEnv('VITE_ADMIN_PIN', '')
    vi.stubEnv('PROD', true)
    await renderRoute('/admin')
    expect(screen.getByText(/admin PIN sozlanmagan/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Admin PIN')).not.toBeInTheDocument()
  })

  it('production with VITE_ADMIN_PIN: only that PIN opens, the old default does not', async () => {
    vi.stubEnv('VITE_ADMIN_PIN', '9137')
    vi.stubEnv('PROD', true)
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

  it('is refused in a production build without a PIN', async () => {
    vi.stubEnv('VITE_ADMIN_PIN', '')
    vi.stubEnv('PROD', true)
    useAdminStore.setState({ session: { source: 'device' }, theme: 'dark' })
    await renderRoute('/admin')
    expect(screen.queryByRole('heading', { name: 'Umumiy' })).not.toBeInTheDocument()
    expect(screen.getByText(/admin PIN sozlanmagan/)).toBeInTheDocument()
  })
})

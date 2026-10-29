import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useFamilyStore } from '@/store/familyStore'
import { useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'

/* Phase 25: the first-time tour with KidoBot — interactive, skippable, once. */

beforeEach(() => {
  useSettingsStore.setState({ language: null, onboarded: false })
  useFamilyStore.setState({ children: [], activeChildId: null })
  useProgressStore.setState({ byChild: {} })
})

describe('the welcome tour', () => {
  it('comes after the first language, and every step answers a tap', async () => {
    const { router, user } = await renderRoute('/')
    await user.click(screen.getByRole('button', { name: /English/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/welcome'))
    const steps = ['robot', 'coin', 'speaker', 'help', 'parent']
    for (const [i, step] of steps.entries()) {
      expect(screen.getByTestId('welcome-step')).toHaveAttribute('data-step', step)
      expect(screen.getByTestId('welcome-feedback')).toHaveClass('invisible')
      await user.click(screen.getByTestId('welcome-try'))
      expect(screen.getByTestId('welcome-feedback')).not.toHaveClass('invisible')
      if (i < steps.length - 1) await user.click(screen.getByTestId('welcome-next'))
    }
    // a demo coin is only a picture: nothing is paid
    expect(useProgressStore.getState().byChild.guest?.coins ?? 0).toBe(0)
    await user.click(screen.getByTestId('welcome-finish'))
    expect(router.state.location.pathname).toBe('/home')
    expect(useSettingsStore.getState().onboarded).toBe(true)
  })

  it('can be skipped at once, and the next language choice goes straight home', async () => {
    useSettingsStore.setState({ language: 'en' })
    const first = await renderRoute('/welcome')
    await first.user.click(screen.getByTestId('welcome-skip'))
    expect(first.router.state.location.pathname).toBe('/home')
    first.unmount()
    const again = await renderRoute('/')
    await again.user.click(screen.getByRole('button', { name: /English/ }))
    expect(again.router.state.location.pathname).toBe('/home')
  })

  it('after a skip a family with profiles is asked who plays', async () => {
    useSettingsStore.setState({ language: 'en' })
    useFamilyStore.getState().addChild({ name: 'Aziza', birthDate: '2020-01-10', gender: 'girl' })
    const { router, user } = await renderRoute('/welcome')
    await user.click(screen.getByTestId('welcome-skip'))
    expect(router.state.location.pathname).toBe('/child-select')
  })
})

describe('returning devices and the parent', () => {
  it('a device already in use (a language saved before the tour existed) skips the tour', async () => {
    const { useSettingsStore: store } = await import('@/store/settingsStore')
    const migrate = store.persist.getOptions().migrate!
    expect(await migrate({ language: 'uz', volume: 0.5 }, 1)).toMatchObject({ onboarded: true })
    expect(await migrate({ language: null, volume: 0.8 }, 1)).toMatchObject({ onboarded: false })
  })

  it('a parent shows the tour again: the grown-ups’ area closes first', async () => {
    const { useParentGateStore, useParentStore } = await import('@/store/parentStore')
    useSettingsStore.setState({ language: 'en', onboarded: true })
    useParentStore.setState({ session: { mode: 'demo' } })
    useParentGateStore.getState().open()
    const { router, user } = await renderRoute('/parent/dashboard?tab=settings')
    await user.click(screen.getByTestId('replay-welcome'))
    expect(router.state.location.pathname).toBe('/welcome')
    expect(useParentGateStore.getState().openedAt).toBeNull()
    // the flag stays until the tour is finished or skipped again
    expect(useSettingsStore.getState().onboarded).toBe(true)
  })
})

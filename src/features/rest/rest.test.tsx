import { act, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dayKey } from '@/features/tasks/rules'
import { useFamilyStore } from '@/store/familyStore'
import { useParentGateStore } from '@/store/parentStore'
import { EMPTY_PROGRESS, GUEST_KEY, useProgressStore } from '@/store/progressStore'
import { useScreenTimeStore } from '@/store/screenTimeStore'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'
import { extraToGrant, mayFinishHere, screenTimeStatus } from './screenTime'

function usedToday(minutes: number) {
  useProgressStore.setState({
    byChild: { [GUEST_KEY]: { ...EMPTY_PROGRESS, minutesByDay: { [dayKey()]: minutes } } },
  })
}

describe('screenTimeStatus', () => {
  it('counts extra minutes and warns shortly before the end', async () => {
    expect(screenTimeStatus(10, 30, 0)).toMatchObject({ over: false, warn: false, remaining: 20 })
    expect(screenTimeStatus(28.5, 30, 0)).toMatchObject({ over: false, warn: true })
    expect(screenTimeStatus(30, 30, 0)).toMatchObject({ over: true, warn: false, remaining: 0 })
    expect(screenTimeStatus(30, 30, 10)).toMatchObject({ over: false, limit: 40 })
  })

  it('knows where a game can be in progress', async () => {
    expect(mayFinishHere('/tasks/trace')).toBe(true)
    expect(mayFinishHere('/exam')).toBe(true)
    expect(mayFinishHere('/home')).toBe(false)
    expect(mayFinishHere('/shop')).toBe(false)
  })

  it('gives the full extra time even if the clock ran on during the rest screen', async () => {
    expect(extraToGrant(30, 30)).toBe(10)
    expect(extraToGrant(42, 30)).toBe(22)
  })
})

describe('Rest screen', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    useSettingsStore.setState({ language: 'uz' })
    useFamilyStore.setState({ children: [], activeChildId: null })
    useParentGateStore.setState({ openedAt: null })
    useScreenTimeStore.setState({ extraMinutes: {} })
  })
  afterEach(() => vi.restoreAllMocks())

  it('takes over once the daily limit is used up', async () => {
    usedToday(30)
    const { router } = await renderRoute('/home')
    expect(router.state.location.pathname).toBe('/rest')
    expect(screen.getByRole('heading', { name: 'Endi dam olamiz!' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Bosh sahifa' })).not.toBeInTheDocument()
  })

  it('lets the game in progress finish and show its reward, but nothing new', async () => {
    usedToday(29)
    const { router } = await renderRoute('/tasks/trace')
    act(() => usedToday(30))
    expect(router.state.location.pathname).toBe('/tasks/trace')

    const outcome = { coins: 5, bonus: 0, stars: 3, stickerId: null, mistakes: 0 }
    await act(() =>
      router.navigate('/reward', { replace: true, state: { taskType: 'trace', outcome } }),
    )
    expect(router.state.location.pathname).toBe('/reward')

    await act(() => router.navigate('/tasks/trace'))
    await waitFor(() => expect(router.state.location.pathname).toBe('/rest'))
  })

  it('sends a reloaded game straight to rest once time is up', async () => {
    usedToday(30)
    const { router } = await renderRoute('/tasks/trace')
    expect(router.state.location.pathname).toBe('/rest')
  })

  it('warns gently two minutes before', async () => {
    usedToday(28.5)
    await renderRoute('/home')
    expect(screen.getByText(/Yana 2 daqiqadan keyin dam olamiz/)).toBeInTheDocument()
  })

  it('only a parent can give extra time', async () => {
    usedToday(30)
    const { router, user } = await renderRoute('/rest')
    await user.click(screen.getByRole('button', { name: 'Ota-onalar uchun' }))
    await user.click(screen.getByRole('button', { name: '9' }))
    await user.click(screen.getByRole('button', { name: 'Tekshirish' }))
    await user.click(screen.getByRole('button', { name: '+10 daqiqa' }))
    expect(router.state.location.pathname).toBe('/home')
    // The answer unlocked only the rest screen, never the parent area.
    expect(useParentGateStore.getState().openedAt).toBeNull()
  })

  it('counts time only while the screen is visible', async () => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    usedToday(0)
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    await renderRoute('/home')
    act(() => vi.advanceTimersByTime(60_000))
    expect(useProgressStore.getState().byChild[GUEST_KEY]?.minutesByDay[dayKey()]).toBe(1)

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    act(() => vi.advanceTimersByTime(60_000))
    expect(useProgressStore.getState().byChild[GUEST_KEY]?.minutesByDay[dayKey()]).toBe(1)
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    vi.useRealTimers()
  })
})

import { act, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dayKey } from '@/features/tasks/rules'
import { useFamilyStore } from '@/store/familyStore'
import { useParentGateStore } from '@/store/parentStore'
import { EMPTY_PROGRESS, GUEST_KEY, useProgressStore } from '@/store/progressStore'
import { useScreenTimeStore } from '@/store/screenTimeStore'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'
import { mayFinishHere, screenTimeStatus } from './screenTime'

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

  it('lets a started game and its reward finish', async () => {
    expect(mayFinishHere('/tasks/trace')).toBe(true)
    expect(mayFinishHere('/reward')).toBe(true)
    expect(mayFinishHere('/home')).toBe(false)
    expect(mayFinishHere('/shop')).toBe(false)
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

  it('lets a game in progress finish', async () => {
    usedToday(30)
    const { router } = await renderRoute('/tasks/trace')
    expect(router.state.location.pathname).toBe('/tasks/trace')
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

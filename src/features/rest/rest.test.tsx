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

  it('never stops a child: there is no daily limit (Phase 75)', async () => {
    usedToday(600)
    const { router } = await renderRoute('/tasks/trace')
    expect(router.state.location.pathname).toBe('/tasks/trace')
    expect(screen.queryByText(/dam olamiz/)).not.toBeInTheDocument()
  })

  it('an old link to the rest screen goes home', async () => {
    const { router } = await renderRoute('/rest')
    await waitFor(() => expect(router.state.location.pathname).toBe('/home'))
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

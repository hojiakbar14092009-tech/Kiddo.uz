import { act, render } from '@testing-library/react'
import { useEffect } from 'react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAnalyticsStore } from '@/domain/analytics'
import { publish } from '@/domain/universe/progression'
import { AnalyticsTracker } from './AnalyticsTracker'

let go: (path: string) => void = () => {}
function Nav() {
  const navigate = useNavigate()
  useEffect(() => {
    go = (path) => navigate(path)
  }, [navigate])
  return null
}

const names = () => useAnalyticsStore.getState().queue.map((event) => event.name)

describe('AnalyticsTracker (Phase 37)', () => {
  beforeEach(() => {
    useAnalyticsStore.setState({
      enabled: true,
      firstDay: null,
      ever: [],
      once: [],
      queue: [],
      log: [],
    })
  })

  it('counts the launch, an activity opened and finished, and where the app was left', () => {
    render(
      <MemoryRouter initialEntries={['/home']}>
        <AnalyticsTracker />
        <Nav />
      </MemoryRouter>,
    )
    expect(names()).toContain('app_opened')
    expect(names()).not.toContain('activity_opened')
    act(() => go('/tasks/trace'))
    expect(
      useAnalyticsStore.getState().queue.find((e) => e.name === 'activity_opened')?.screen,
    ).toBe('/tasks/trace')
    act(() =>
      publish({
        type: 'activity.completed',
        childKey: 'kid',
        activityId: 'run-1',
        activity: 'trace',
        award: {} as never,
      }),
    )
    expect(names()).toContain('activity_finished')
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    const closed = useAnalyticsStore.getState().queue.find((e) => e.name === 'app_closed')
    expect(closed?.screen).toBe('/tasks/trace')
  })

  it('never counts the owner\u2019s admin panel', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AnalyticsTracker />
      </MemoryRouter>,
    )
    expect(names()).toEqual([])
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { track, useAnalyticsStore } from '@/domain/analytics'
import { ANALYTICS_BATCH, flushAnalytics, sendOnLeave, type AnalyticsSender } from './sendAnalytics'

const NOW = new Date('2026-11-01T10:00:00Z')

function fill(count: number, at = NOW) {
  for (let i = 0; i < count; i += 1) {
    // a new launch for each: app_opened counts once per launch, so use days
    track('activity_opened', { at: new Date(at.getTime() - i * 60_000), screen: `/tasks/t${i}` })
  }
}

describe('sending analytics (Phase 37)', () => {
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

  it('sends in batches and removes what the server accepted', async () => {
    const queue = Array.from({ length: ANALYTICS_BATCH + 5 }, (_, i) => ({
      id: `e${i}`,
      name: 'app_opened' as const,
      install: 'install-1',
      day: '2026-11-01',
      at: NOW.toISOString(),
    }))
    useAnalyticsStore.setState({ queue })
    const send = vi.fn<AnalyticsSender>(async () => 'ok')
    expect(await flushAnalytics(send, NOW)).toBe(ANALYTICS_BATCH + 5)
    expect(send).toHaveBeenCalledTimes(2)
    expect(useAnalyticsStore.getState().queue).toHaveLength(0)
  })

  it('offline or failing: everything waits for the next try', async () => {
    fill(3)
    const before = useAnalyticsStore.getState().queue.length
    expect(await flushAnalytics(async () => 'retry', NOW)).toBe(0)
    expect(await flushAnalytics(async () => Promise.reject(new Error('offline')), NOW)).toBe(0)
    expect(useAnalyticsStore.getState().queue).toHaveLength(before)
  })

  it('a batch the server refuses for its content is dropped, so the queue never blocks', async () => {
    fill(2)
    expect(await flushAnalytics(async () => 'drop', NOW)).toBe(0)
    expect(useAnalyticsStore.getState().queue).toHaveLength(0)
    // the device's own history (for the device admin) stays
    expect(useAnalyticsStore.getState().log.length).toBeGreaterThan(0)
  })

  it('events older than two days are not sent (the server would refuse them)', async () => {
    track('activity_finished', { at: new Date('2026-10-20T10:00:00Z') })
    track('activity_finished', { at: NOW })
    const send = vi.fn<AnalyticsSender>(async () => 'ok')
    expect(await flushAnalytics(send, NOW)).toBe(1)
    expect(send.mock.calls[0]![0].map((e) => e.day)).toEqual(['2026-11-01'])
  })

  it('leaving: the waiting events go with keepalive (they arrive even on the last visit) and stay queued', () => {
    track('app_closed', { at: NOW, screen: '/math-lab' })
    const fetch = vi.fn(async () => new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetch)
    expect(sendOnLeave('https://x.supabase.co/', 'anon-key', NOW)).toBe(true)
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://x.supabase.co/rest/v1/rpc/add_analytics_events')
    expect(init.keepalive).toBe(true)
    expect(JSON.parse(String(init.body)).p_events[0]).toMatchObject({
      name: 'app_closed',
      screen: '/math-lab',
    })
    // the answer may never come: the events wait for the normal send (the server ignores repeats)
    expect(useAnalyticsStore.getState().queue).toHaveLength(1)
    expect(sendOnLeave('', '', NOW)).toBe(false)
    vi.unstubAllGlobals()
  })
})

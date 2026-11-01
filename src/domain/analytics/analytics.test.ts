import { beforeEach, describe, expect, it } from 'vitest'
import {
  ANALYTICS_EVENTS,
  exitsOf,
  funnelOf,
  isActivityPath,
  onceKey,
  returnEventsFor,
  screenOf,
  withinDays,
  type AnalyticsEvent,
} from './analytics'
import { MAX_QUEUE, track, trackAppOpened, useAnalyticsStore } from './store'

const event = (
  name: AnalyticsEvent['name'],
  install: string,
  day = '2026-11-01',
  screen?: string,
) =>
  ({
    id: `${name}-${install}-${day}-${screen}`,
    name,
    install,
    day,
    at: `${day}T10:00:00Z`,
    screen,
  }) as AnalyticsEvent

describe('analytics rules (Phase 37)', () => {
  it('keeps only a coarse screen: two path parts, never an id or a name', () => {
    expect(screenOf('/')).toBe('/start')
    expect(screenOf('/home')).toBe('/home')
    expect(screenOf('/worlds/dino/explore/trex')).toBe('/worlds/dino')
    expect(screenOf('/stories/abc?x=1#y')).toBe('/stories/abc')
    expect(screenOf('/alphabet/Aziz Karimov')).toBe('/other')
    expect(screenOf('/stories/9f1c2e0a-1234')).toBe('/other')
  })

  it('knows the places a child plays in', () => {
    expect(isActivityPath('/tasks/trace')).toBe(true)
    expect(isActivityPath('/math-lab')).toBe(true)
    expect(isActivityPath('/scale-portal')).toBe(true)
    expect(isActivityPath('/home')).toBe(false)
    expect(isActivityPath('/parent/dashboard')).toBe(false)
    expect(isActivityPath('/admin')).toBe(false)
  })

  it('counts the next day as the day-2 return and days 7–13 as the day-7 return', () => {
    expect(returnEventsFor('2026-11-01', '2026-11-01')).toEqual([])
    expect(returnEventsFor('2026-11-01', '2026-11-02')).toEqual(['returned_day2'])
    expect(returnEventsFor('2026-11-01', '2026-11-05')).toEqual([])
    expect(returnEventsFor('2026-11-01', '2026-11-08')).toEqual(['returned_day7'])
    expect(returnEventsFor('2026-11-01', '2026-11-14')).toEqual(['returned_day7'])
    expect(returnEventsFor('2026-11-01', '2026-11-15')).toEqual([])
  })

  it('records each event at most once in its window', () => {
    expect(onceKey('onboarding_done', '2026-11-01')).toBe('onboarding_done')
    expect(onceKey('activity_finished', '2026-11-01')).toBe('activity_finished|2026-11-01')
    expect(onceKey('app_opened', '2026-11-01')).toBe('app_opened|2026-11-01')
    // leaving is recorded every time; the last one of a day counts
    expect(onceKey('app_closed', '2026-11-01')).toBeNull()
  })

  it('funnel: a cohort of installs first opened in the period, each install once per step', () => {
    const events = [
      event('first_opened', 'a'),
      event('app_opened', 'a'),
      event('app_opened', 'a', '2026-11-02'),
      event('first_opened', 'b'),
      event('app_opened', 'b'),
      event('onboarding_done', 'a'),
      // an older family (first opened before the period) is not part of the cohort
      event('app_opened', 'old'),
      event('onboarding_done', 'old'),
      event('activity_opened', 'old'),
    ]
    const funnel = funnelOf(events)
    expect(funnel[0]).toEqual({ step: 'first_opened', installs: 2 })
    expect(funnel[1]).toEqual({ step: 'onboarding_done', installs: 1 })
    expect(funnel.find((row) => row.step === 'activity_opened')?.installs).toBe(0)
    expect(withinDays(events, '2026-11-02', 1)).toHaveLength(1)
  })

  it('exits: the last leaving of each install each day, most often first', () => {
    const closed = (install: string, day: string, at: string, screen: string): AnalyticsEvent => ({
      id: `${install}${at}`,
      name: 'app_closed',
      install,
      day,
      at: `${day}T${at}:00Z`,
      screen,
    })
    expect(
      exitsOf([
        // a quick switch away from Home, then the real leaving from Math Lab
        closed('a', '2026-11-01', '08:00', '/home'),
        closed('a', '2026-11-01', '09:00', '/math-lab'),
        closed('b', '2026-11-01', '08:00', '/math-lab'),
        closed('b', '2026-11-02', '08:00', '/home'),
      ]),
    ).toEqual([
      { screen: '/math-lab', count: 2 },
      { screen: '/home', count: 1 },
    ])
  })
})

describe('the device queue', () => {
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

  it('an event holds only its name, day, time, install id and coarse screen', () => {
    track('app_closed', { screen: '/home', at: new Date('2026-11-01T10:00:00Z') })
    const [saved] = useAnalyticsStore.getState().queue
    expect(Object.keys(saved!).sort()).toEqual(['at', 'day', 'id', 'install', 'name', 'screen'])
    expect(saved!.install).toBe(useAnalyticsStore.getState().install)
  })

  it('does not repeat: once ever, once a day, once a launch', () => {
    const day1 = new Date('2026-11-01T08:00:00Z')
    const day2 = new Date('2026-11-02T08:00:00Z')
    track('onboarding_done', { at: day1 })
    track('onboarding_done', { at: day2 })
    track('activity_finished', { at: day1 })
    track('activity_finished', { at: day1 })
    track('activity_finished', { at: day2 })
    track('app_closed', { at: day1, screen: '/home' })
    track('app_closed', { at: day1, screen: '/math-lab' })
    track('app_closed', { at: day2, screen: '/home' })
    const queue = useAnalyticsStore.getState().queue
    const names = queue.map((e) => e.name)
    expect(names.filter((n) => n === 'onboarding_done')).toHaveLength(1)
    expect(names.filter((n) => n === 'activity_finished')).toHaveLength(2)
    // one leaving a day, the last one
    expect(queue.filter((e) => e.name === 'app_closed').map((e) => e.screen)).toEqual([
      '/math-lab',
      '/home',
    ])
  })

  it('"once ever" is never forgotten, however many days pass', () => {
    track('onboarding_done', { at: new Date('2026-01-01T08:00:00Z') })
    const start = Date.parse('2026-01-02T08:00:00Z')
    for (let i = 0; i < 400; i += 1) track('app_opened', { at: new Date(start + i * 86_400_000) })
    track('onboarding_done', { at: new Date('2027-06-01T08:00:00Z') })
    expect(
      useAnalyticsStore.getState().log.filter((e) => e.name === 'onboarding_done'),
    ).toHaveLength(1)
  })

  it('switched off by a parent: nothing is recorded and nothing waits to be sent', () => {
    track('app_opened')
    useAnalyticsStore.getState().setEnabled(false)
    expect(useAnalyticsStore.getState().queue).toHaveLength(0)
    track('activity_finished')
    trackAppOpened()
    expect(useAnalyticsStore.getState().queue).toHaveLength(0)
    useAnalyticsStore.getState().setEnabled(true)
  })

  it('a family that used Kiddo before analytics existed is not a new install', () => {
    trackAppOpened(new Date('2026-11-01T08:00:00Z'), { existingFamily: true })
    expect(useAnalyticsStore.getState().firstDay).toBe('2026-11-01')
    expect(useAnalyticsStore.getState().queue.map((e) => e.name)).toEqual(['app_opened'])
  })

  it('the first open is remembered; the next day counts as a return', () => {
    trackAppOpened(new Date('2026-11-01T08:00:00Z'))
    expect(useAnalyticsStore.getState().firstDay).toBe('2026-11-01')
    expect(useAnalyticsStore.getState().queue.map((e) => e.name)).toEqual([
      'first_opened',
      'app_opened',
    ])
    trackAppOpened(new Date('2026-11-02T08:00:00Z'))
    expect(useAnalyticsStore.getState().queue.map((e) => e.name)).toContain('returned_day2')
  })

  it('refuses names it does not know and keeps the queue bounded', () => {
    useAnalyticsStore.getState().track('child_name' as never)
    expect(useAnalyticsStore.getState().queue).toHaveLength(0)
    const start = Date.parse('2020-01-01T00:00:00Z')
    for (let i = 0; i < MAX_QUEUE + 20; i += 1) {
      track('activity_opened', { at: new Date(start + i * 86_400_000) })
    }
    expect(useAnalyticsStore.getState().queue).toHaveLength(MAX_QUEUE)
    expect(ANALYTICS_EVENTS).toContain('activity_opened')
  })
})

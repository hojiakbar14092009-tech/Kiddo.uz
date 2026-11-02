import { describe, expect, it, vi } from 'vitest'
import {
  type AnalyticsDeps,
  clientIp,
  DEFAULT_IP_EVENTS_PER_HOUR,
  handleAnalytics,
  ipHash,
  IP_WINDOW_SECONDS,
} from './analytics.ts'
import {
  CLAIM_BATCH,
  handleWorker,
  JOB_TIMEOUT_MS,
  LEASE_SECONDS,
  type Job,
  PermanentJobError,
  runJobs,
  sameSecret,
  type WorkerDeps,
} from './worker.ts'

const ORIGIN = 'https://kiddo-uz.vercel.app'
const SECRET = 'w'.repeat(40)

function env(values: Record<string, string>) {
  return (name: string) => values[name]
}

const event = (n: number) => ({
  id: `evt-${String(n).padStart(8, '0')}`,
  install: 'install-0001',
  name: 'app_opened',
  day: '2026-11-02',
  at: '2026-11-02T10:00:00Z',
})

function analyticsRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('https://x.supabase.co/functions/v1/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN, ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function analyticsDeps(overrides: Partial<AnalyticsDeps> = {}): AnalyticsDeps {
  return {
    env: env({ ALLOWED_ORIGINS: ORIGIN, ANALYTICS_IP_SALT: 'salt-for-tests' }),
    takeIp: vi.fn(async () => true),
    addEvents: vi.fn(async (events: unknown[]) => ({ added: events.length })),
    now: () => new Date('2026-11-02T10:00:00Z'),
    ...overrides,
  }
}

describe('analytics Edge Function (Phase 53)', () => {
  it('adds a batch and counts its events against the IP of the caller', async () => {
    const deps = analyticsDeps()
    const response = await handleAnalytics(
      analyticsRequest(
        { events: [event(1), event(2)] },
        { 'cf-connecting-ip': '84.54.1.2', 'x-forwarded-for': '6.6.6.6, 84.54.1.2' },
      ),
      deps,
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ added: 2 })
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN)
    const expected = await ipHash('salt-for-tests', '84.54.1.2', '2026-11-02')
    expect(deps.takeIp).toHaveBeenCalledWith(
      expected,
      2,
      DEFAULT_IP_EVENTS_PER_HOUR,
      IP_WINDOW_SECONDS,
    )
  })

  it('stores no address: the hash is keyed and changes every day', async () => {
    const today = await ipHash('k', '84.54.1.2', '2026-11-02')
    expect(today).toMatch(/^[0-9a-f]{64}$/)
    expect(today).not.toContain('84.54')
    expect(await ipHash('k', '84.54.1.2', '2026-11-03')).not.toBe(today)
    expect(await ipHash('other', '84.54.1.2', '2026-11-02')).not.toBe(today)
  })

  it('an IP over its hourly events is told to wait, nothing is added', async () => {
    const deps = analyticsDeps({ takeIp: vi.fn(async () => false) })
    const response = await handleAnalytics(analyticsRequest({ events: [event(1)] }), deps)
    expect(response.status).toBe(429)
    expect(deps.addEvents).not.toHaveBeenCalled()
  })

  it('the hourly limit comes from the environment, within bounds', async () => {
    const deps = analyticsDeps({
      env: env({ ANALYTICS_IP_SALT: 's', ANALYTICS_IP_EVENTS_PER_HOUR: '500' }),
    })
    await handleAnalytics(analyticsRequest({ events: [event(1)] }), deps)
    expect(deps.takeIp).toHaveBeenCalledWith(expect.any(String), 1, 500, IP_WINDOW_SECONDS)
  })

  it('refuses what is not a batch of 1–100 events, before counting anything', async () => {
    const deps = analyticsDeps()
    const bad = [
      '{not json',
      { events: [] },
      { events: Array.from({ length: 101 }, (_, i) => event(i)) },
      { events: ['x'] },
      [event(1)],
      'x'.repeat(40_000),
    ]
    for (const body of bad) {
      const response = await handleAnalytics(analyticsRequest(body), deps)
      expect(response.status).toBe(400)
    }
    expect(deps.takeIp).not.toHaveBeenCalled()
  })

  it('a refusal for the data is 400 (the app drops it), a server problem 503 (it retries)', async () => {
    const content = await handleAnalytics(
      analyticsRequest({ events: [event(1)] }),
      analyticsDeps({ addEvents: async () => ({ error: 'content' }) }),
    )
    expect(content.status).toBe(400)
    const server = await handleAnalytics(
      analyticsRequest({ events: [event(1)] }),
      analyticsDeps({ addEvents: async () => ({ error: 'server' }) }),
    )
    expect(server.status).toBe(503)
    const thrown = await handleAnalytics(
      analyticsRequest({ events: [event(1)] }),
      analyticsDeps({
        takeIp: async () => {
          throw new Error('db down')
        },
      }),
    )
    expect(thrown.status).toBe(500)
  })

  it('without a key to hash with, nothing is stored', async () => {
    const deps = analyticsDeps({ env: env({}) })
    const response = await handleAnalytics(analyticsRequest({ events: [event(1)] }), deps)
    expect(response.status).toBe(503)
    expect(deps.takeIp).not.toHaveBeenCalled()
  })

  it('answers the browser preflight for an allowed origin only, and only POST', async () => {
    const preflight = await handleAnalytics(
      new Request('https://x/functions/v1/analytics', {
        method: 'OPTIONS',
        headers: { Origin: ORIGIN },
      }),
      analyticsDeps(),
    )
    expect(preflight.status).toBe(204)
    expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN)
    const other = await handleAnalytics(
      new Request('https://x/functions/v1/analytics', {
        method: 'OPTIONS',
        headers: { Origin: 'https://evil.example' },
      }),
      analyticsDeps(),
    )
    expect(other.headers.get('Access-Control-Allow-Origin')).toBeNull()
    const get = await handleAnalytics(
      new Request('https://x/functions/v1/analytics'),
      analyticsDeps(),
    )
    expect(get.status).toBe(405)
  })

  it('trusts only addresses the platform writes, never the hop a client can forge', () => {
    const at = (headers: Record<string, string>) => clientIp(new Request('https://x/', { headers }))
    expect(at({ 'cf-connecting-ip': '84.54.1.2', 'x-forwarded-for': '1.2.3.4' })).toBe('84.54.1.2')
    // a client writing its own first hop gets the proxy's last one
    expect(at({ 'x-forwarded-for': '1.2.3.4, 84.54.1.2' })).toBe('84.54.1.2')
    expect(at({ 'x-forwarded-for': '2A02:4780::1' })).toBe('2a02:4780::1')
    expect(at({ 'x-real-ip': '84.54.1.3' })).toBe('84.54.1.3')
    expect(at({ 'x-forwarded-for': '<script>' })).toBeNull()
    expect(at({})).toBeNull()
  })

  it('a forged first hop does not open a new window', async () => {
    const deps = analyticsDeps()
    for (const forged of ['1.1.1.1', '2.2.2.2']) {
      await handleAnalytics(
        analyticsRequest(
          { events: [event(1)] },
          { 'cf-connecting-ip': '84.54.1.2', 'x-forwarded-for': `${forged}, 84.54.1.2` },
        ),
        deps,
      )
    }
    const calls = (deps.takeIp as ReturnType<typeof vi.fn>).mock.calls
    expect(calls[0]![0]).toBe(calls[1]![0])
  })

  it('without any address each device has its own window (not one shared by all)', async () => {
    const deps = analyticsDeps()
    await handleAnalytics(analyticsRequest({ events: [event(1)] }), deps)
    await handleAnalytics(
      analyticsRequest({ events: [{ ...event(2), install: 'install-0002' }] }),
      deps,
    )
    const calls = (deps.takeIp as ReturnType<typeof vi.fn>).mock.calls
    expect(calls[0]![0]).not.toBe(calls[1]![0])
    expect(calls[0]![0]).toBe(await ipHash('salt-for-tests', 'install:install-0001', '2026-11-02'))
  })
})

function workerDeps(queue: Job[], overrides: Partial<WorkerDeps> = {}) {
  const finished: number[] = []
  const failed: { id: number; error: string; final: boolean }[] = []
  const deps: WorkerDeps = {
    env: env({ WORKER_SECRET: SECRET }),
    claim: vi.fn(async (limit: number) => queue.splice(0, limit)),
    finish: async (id) => void finished.push(id),
    fail: async (id, _attempts, error, final) => void failed.push({ id, error, final }),
    handlers: {
      ping: async () => undefined,
      broken: async () => {
        throw new Error('telegram 502')
      },
      never: async () => {
        throw new PermanentJobError('no chat')
      },
    },
    ...overrides,
  }
  return { deps, finished, failed }
}

const job = (id: number, kind: string): Job => ({ id, kind, payload: {}, attempts: 1 })

function workerRequest(token: string | null, method = 'POST'): Request {
  return new Request('https://x.supabase.co/functions/v1/worker', {
    method,
    headers: token === null ? {} : { Authorization: `Bearer ${token}` },
  })
}

describe('queue worker (Phase 53)', () => {
  it('does each due job and marks it done; a failure is retried later, a hopeless one is dead', async () => {
    const { deps, finished, failed } = workerDeps([
      job(1, 'ping'),
      job(2, 'broken'),
      job(3, 'never'),
      job(4, 'mystery'),
    ])
    expect(await runJobs(deps)).toEqual({ done: 1, failed: 3 })
    expect(finished).toEqual([1])
    expect(failed).toEqual([
      { id: 2, error: 'telegram 502', final: false },
      { id: 3, error: 'no chat', final: true },
      { id: 4, error: 'unknown kind mystery', final: true },
    ])
  })

  it('claims batch after batch while full batches come back', async () => {
    const queue = Array.from({ length: CLAIM_BATCH * 2 + 1 }, (_, i) => job(i + 1, 'ping'))
    const { deps, finished } = workerDeps(queue)
    expect((await runJobs(deps)).done).toBe(CLAIM_BATCH * 2 + 1)
    expect(finished).toHaveLength(CLAIM_BATCH * 2 + 1)
    expect(deps.claim).toHaveBeenCalledTimes(3)
  })

  it('a lease outlasts a whole claim at the time limit (no job is handed out twice)', () => {
    expect(LEASE_SECONDS * 1000).toBeGreaterThan(CLAIM_BATCH * JOB_TIMEOUT_MS)
  })

  it('reports each job with the try it was given', async () => {
    const finish = vi.fn(async () => undefined)
    const { deps } = workerDeps([{ ...job(7, 'ping'), attempts: 3 }], { finish })
    await runJobs(deps)
    expect(finish).toHaveBeenCalledWith(7, 3)
  })

  it('stops claiming when its time is used up', async () => {
    let now = 0
    const queue = Array.from({ length: CLAIM_BATCH * 20 }, (_, i) => job(i + 1, 'ping'))
    const { deps } = workerDeps(queue, {
      clock: () => now,
      handlers: {
        ping: async () => {
          now += 5_000
        },
      },
    })
    const result = await runJobs(deps)
    expect(result.done).toBeLessThan(CLAIM_BATCH * 20)
    expect(result.done % CLAIM_BATCH).toBe(0)
  })

  it('runs only with the worker secret, in constant time', async () => {
    const { deps } = workerDeps([job(1, 'ping')])
    expect((await handleWorker(workerRequest(null), deps)).status).toBe(401)
    expect((await handleWorker(workerRequest('w'.repeat(39) + 'x'), deps)).status).toBe(401)
    expect((await handleWorker(workerRequest(SECRET, 'GET'), deps)).status).toBe(405)
    expect(deps.claim).not.toHaveBeenCalled()
    const ok = await handleWorker(workerRequest(SECRET), deps)
    expect(ok.status).toBe(200)
    expect(await ok.json()).toEqual({ done: 1, failed: 0 })
    expect(sameSecret('abc', 'abc')).toBe(true)
    expect(sameSecret('abc', 'abcd')).toBe(false)
  })

  it('a missing or short secret keeps the worker closed', async () => {
    const { deps } = workerDeps([job(1, 'ping')], { env: env({ WORKER_SECRET: 'short' }) })
    expect((await handleWorker(workerRequest('short'), deps)).status).toBe(503)
    expect(deps.claim).not.toHaveBeenCalled()
  })
})

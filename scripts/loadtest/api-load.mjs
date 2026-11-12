/**
 * Load test of Kiddo's API on the developer's machine ONLY (never production, never the Turso
 * database): virtual families that read and write their progress through the real /api handler,
 * backed by a local libSQL file (the engine Turso runs).
 *
 *   1. TURSO_DATABASE_URL=file:.data/load.db AUTH_SECRET=load-test-secret-xxxxxxxxxxxxxxxxxxxxxxxx \
 *        npx vite preview --port 4182          (the dev API plugin serves /api)
 *   2. node scripts/loadtest/api-load.mjs [vus,...] [seconds]
 *
 * Each virtual user: GET /api/sync once, then a PUT (one batched change) every THINK_MS, the way
 * a playing child's device sends (the app debounces to one request per 4–30 s; this is harsher).
 */
import { createHash } from 'node:crypto'
import { createClient } from '@libsql/client'

const BASE = process.env.LOAD_BASE ?? 'http://localhost:4182'
const DB = process.env.LOAD_DB ?? 'file:.data/load.db'
const STEPS = (process.argv[2] ?? '50,200,1000,10000').split(',').map(Number)
const SECONDS = Number(process.argv[3] ?? 20)
const THINK_MS = Number(process.env.THINK_MS ?? 2000)
const sha = (s) => createHash('sha256').update(s).digest('hex')

const db = createClient({ url: DB })
async function seed(count) {
  await fetch(`${BASE}/api/health`) // runs the migrations
  const now = Date.now()
  for (let from = 0; from < count; from += 500) {
    const batch = []
    for (let i = from; i < Math.min(count, from + 500); i += 1) {
      batch.push({ sql: 'INSERT OR IGNORE INTO users (id, created_at, updated_at) VALUES (?, ?, ?)', args: [`load-${i}`, now, now] })
      batch.push({
        sql: 'INSERT OR IGNORE INTO sessions (id_hash, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)',
        args: [sha(`load-token-${i}`), `load-${i}`, now, now + 86_400_000, now],
      })
    }
    await db.batch(batch, 'write')
  }
}

const percentile = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? 0

async function step(vus) {
  await seed(vus)
  const latencies = []
  let ok = 0
  let failed = 0
  const codes = {}
  const end = Date.now() + SECONDS * 1000
  const user = async (i) => {
    const headers = { cookie: `kiddo_session=load-token-${i}`, origin: BASE, 'x-real-ip': `10.${(i >> 16) & 255}.${(i >> 8) & 255}.${i & 255}` }
    const timed = async (method, body) => {
      const t = performance.now()
      try {
        const res = await fetch(`${BASE}/api/sync`, { method, headers: body ? { ...headers, 'content-type': 'application/json' } : headers, body: body && JSON.stringify(body) })
        const json = await res.json().catch(() => ({}))
        latencies.push(performance.now() - t)
        codes[res.status] = (codes[res.status] ?? 0) + 1
        if (res.ok) ok += 1
        else failed += 1
        return { res, json }
      } catch {
        failed += 1
        codes.network = (codes.network ?? 0) + 1
        return null
      }
    }
    const first = await timed('GET')
    let rev = first?.json?.keys?.progress?.rev ?? 0
    // spread the users over the first think period, like families opening the app at different times
    await new Promise((r) => setTimeout(r, Math.random() * THINK_MS))
    let coins = 0
    while (Date.now() < end) {
      coins += 1
      const put = await timed('PUT', { changes: { progress: { baseRev: rev, data: { state: { byChild: { [`c${i}`]: { coins } } }, version: 1 } } } })
      if (put?.res.status === 200) rev = put.json.revs.progress
      else if (put?.res.status === 409) rev = put.json.conflicts?.progress?.rev ?? rev
      await new Promise((r) => setTimeout(r, THINK_MS))
    }
  }
  const started = Date.now()
  await Promise.all(Array.from({ length: vus }, (_, i) => user(i)))
  const seconds = (Date.now() - started) / 1000
  latencies.sort((a, b) => a - b)
  return {
    vus,
    requests: ok + failed,
    rps: Math.round((ok + failed) / seconds),
    errorRate: `${(((failed) / Math.max(1, ok + failed)) * 100).toFixed(2)} %`,
    p50: Math.round(percentile(latencies, 50)),
    p95: Math.round(percentile(latencies, 95)),
    p99: Math.round(percentile(latencies, 99)),
    codes: JSON.stringify(codes),
  }
}

const rows = []
for (const vus of STEPS) {
  const row = await step(vus)
  rows.push(row)
  console.error(JSON.stringify(row))
}
console.log('| VUs | requests | req/s | errors | p50 ms | p95 ms | p99 ms | status codes |')
console.log('|---|---|---|---|---|---|---|---|')
for (const r of rows) console.log(`| ${r.vus} | ${r.requests} | ${r.rps} | ${r.errorRate} | ${r.p50} | ${r.p95} | ${r.p99} | ${r.codes} |`)

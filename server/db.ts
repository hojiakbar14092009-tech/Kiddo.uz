import { createClient, type Client } from '@libsql/client'
import { env, requireEnv } from './env.js'
import { HttpError } from './http.js'
import { MIGRATIONS } from './migrations.js'

let client: Client | null = null
let migrated: Promise<void> | null = null

/**
 * The Turso client, reused by every request of a warm function. libsql:// is turned into
 * https:// so each query is one HTTP request (no WebSocket to keep alive in a serverless function).
 */
export function db(): Client {
  if (!client) {
    const url = requireEnv('TURSO_DATABASE_URL').replace(/^libsql:\/\//, 'https://')
    client = createClient({ url, authToken: env('TURSO_AUTH_TOKEN') })
  }
  return client
}

/**
 * Only Kiddo's own Turso database is ever migrated: its host starts with "kiddo-" (database
 * "kiddo" + the organisation) and never names another project's ("teamflow").
 */
export function isKiddoDatabase(url: string): boolean {
  const label = url.replace(/^libsql:\/\//, 'https://').match(/^https?:\/\/([^./:]+)/)?.[1] ?? ''
  return label.startsWith('kiddo-') && !/teamflow/i.test(url)
}

/** Applies missing migrations once per cold start (they only add tables, so a race is harmless). */
export function ready(): Promise<void> {
  const url = env('TURSO_DATABASE_URL')
  if (url && !isKiddoDatabase(url))
    return Promise.reject(new HttpError(503, 'not_configured', { setting: 'TURSO_DATABASE_URL' }))
  migrated ??= migrate(db()).catch((error: unknown) => {
    migrated = null
    throw error
  })
  return migrated
}

export async function migrate(target: Client): Promise<void> {
  await target.execute(
    'CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)',
  )
  const done = await target.execute('SELECT version FROM schema_migrations')
  const applied = new Set(done.rows.map((row) => Number(row.version)))
  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue
    await target.batch(
      [
        ...migration.statements,
        {
          sql: 'INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)',
          args: [migration.version, Date.now()],
        },
      ],
      'write',
    )
  }
}

/** Tests: an in-memory database instead of Turso. */
export function useDbForTests(test: Client | null): void {
  client = test
  migrated = null
}

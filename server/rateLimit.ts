import { sha256 } from './crypto.js'
import { db } from './db.js'
import { HttpError } from './http.js'

/**
 * A fixed-window counter in Turso (serverless instances share no memory), one query per check.
 * Keys are hashed, so the table never holds an IP, e-mail or phone number in clear.
 */
export async function rateLimit(
  key: string,
  max: number,
  windowSeconds: number,
  now = Date.now(),
): Promise<void> {
  const windowStart = Math.floor(now / 1000 / windowSeconds) * windowSeconds
  const result = await db().execute({
    sql: `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
          ON CONFLICT(key) DO UPDATE SET
            count = CASE WHEN rate_limits.window_start = excluded.window_start THEN rate_limits.count + 1 ELSE 1 END,
            window_start = excluded.window_start
          RETURNING count`,
    args: [sha256(key), windowStart],
  })
  const count = Number(result.rows[0]?.count ?? 0)
  // shortcut: old windows are swept by chance (1 in 200 calls); a cron job when the table grows large
  if (Math.random() < 0.005) {
    await db().execute({
      sql: 'DELETE FROM rate_limits WHERE window_start < ?',
      args: [Math.floor(now / 1000) - 86_400],
    })
  }
  if (count > max) {
    throw new HttpError(429, 'rate_limited', {
      retryAfter: windowStart + windowSeconds - Math.floor(now / 1000),
    })
  }
}

const windows = new Map<string, { start: number; count: number }>()

/**
 * The same fixed window in this instance's memory: a cheap first line against floods. Each warm
 * instance counts on its own, so the real limit is per instance (the Turso one is the exact one).
 */
export function memoryLimit(
  key: string,
  max: number,
  windowSeconds: number,
  now = Date.now(),
): void {
  const start = Math.floor(now / 1000 / windowSeconds) * windowSeconds
  const entry = windows.get(key)
  if (!entry || entry.start !== start) {
    if (windows.size > 50_000) windows.clear()
    windows.set(key, { start, count: 1 })
    return
  }
  entry.count += 1
  if (entry.count > max)
    throw new HttpError(429, 'rate_limited', {
      retryAfter: start + windowSeconds - Math.floor(now / 1000),
    })
}

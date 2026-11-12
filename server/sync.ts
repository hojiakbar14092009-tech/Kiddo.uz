import { sha256 } from './crypto.js'
import { db } from './db.js'
import { HttpError, json, readJson } from './http.js'
import { memoryLimit } from './rateLimit.js'
import { requireSession } from './session.js'

/**
 * A family's progress in the cloud: one row per (user, store). Only the signed-in user's own
 * rows are ever read or written (user_id comes from the session, never from the request).
 * Writes carry the revision they were based on; a stale one is a conflict, so two devices never
 * silently overwrite each other (the device merges and tries again).
 */
export const SYNC_KEYS = ['family', 'progress', 'learn', 'rewards', 'universe', 'activity'] as const
const MAX_KEY_BYTES = 512 * 1024

interface Change {
  baseRev: number
  data: unknown
}

export async function getState(request: Request): Promise<Response> {
  const { userId } = await requireSession(request)
  const result = await db().execute({
    sql: 'SELECT key, rev, data FROM user_state WHERE user_id = ?',
    args: [userId],
  })
  const etag = `"${sha256(result.rows.map((row) => `${row.key}:${row.rev}`).join(','))}"`
  if (request.headers.get('if-none-match') === etag)
    return new Response(null, { status: 304, headers: { etag } })
  const keys: Record<string, { rev: number; data: unknown }> = {}
  for (const row of result.rows)
    keys[String(row.key)] = { rev: Number(row.rev), data: JSON.parse(String(row.data)) }
  return json(200, { keys }, { etag, 'cache-control': 'private, no-cache' })
}

export async function putState(request: Request): Promise<Response> {
  const { userId } = await requireSession(request)
  // a device sends at most one batch every few seconds; more is a bug or abuse (memory: no extra write)
  memoryLimit(`sync:${userId}`, 30, 60)
  const body = await readJson<{ changes?: Record<string, Change> }>(request)
  const entries = Object.entries(body.changes ?? {})
  if (entries.length === 0 || entries.length > SYNC_KEYS.length)
    throw new HttpError(400, 'no_changes')
  const now = Date.now()
  const statements = entries.map(([key, change]) => {
    if (!(SYNC_KEYS as readonly string[]).includes(key))
      throw new HttpError(400, 'unknown_key', { key })
    if (!Number.isInteger(change?.baseRev) || change.baseRev < 0)
      throw new HttpError(400, 'bad_rev', { key })
    const data = JSON.stringify(change.data ?? null)
    if (data.length > MAX_KEY_BYTES) throw new HttpError(413, 'too_large', { key })
    // inserts the first copy, or updates only when the device saw the latest revision
    return {
      sql: `INSERT INTO user_state (user_id, key, rev, data, updated_at) VALUES (?, ?, 1, ?, ?)
            ON CONFLICT(user_id, key) DO UPDATE SET rev = user_state.rev + 1, data = excluded.data, updated_at = excluded.updated_at
            WHERE user_state.rev = ?
            RETURNING rev`,
      args: [userId, key, data, now, change.baseRev],
    }
  })
  // all of a device's changes in one transaction (one round trip)
  const results = await db().batch(statements, 'write')
  const revs: Record<string, number> = {}
  const stale: string[] = []
  results.forEach((result, index) => {
    const key = entries[index]![0]
    const row = result.rows[0] // no row: the WHERE refused a stale revision
    if (row) revs[key] = Number(row.rev)
    else stale.push(key)
  })
  if (stale.length === 0) return json(200, { revs })
  const current = await db().execute({
    sql: `SELECT key, rev, data FROM user_state WHERE user_id = ? AND key IN (${stale.map(() => '?').join(',')})`,
    args: [userId, ...stale],
  })
  const conflicts: Record<string, { rev: number; data: unknown }> = {}
  for (const row of current.rows)
    conflicts[String(row.key)] = { rev: Number(row.rev), data: JSON.parse(String(row.data)) }
  return json(409, { revs, conflicts })
}

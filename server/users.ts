import { db } from './db.js'
import { HttpError } from './http.js'

export interface User {
  id: string
  email: string | null
  phone: string | null
  name: string | null
  hasGoogle: boolean
  hasTelegram: boolean
}

export async function getUser(id: string): Promise<User> {
  const result = await db().execute({
    sql: 'SELECT id, email, phone, name, google_sub, telegram_id FROM users WHERE id = ?',
    args: [id],
  })
  const row = result.rows[0]
  if (!row) throw new HttpError(401, 'signed_out')
  return {
    id: String(row.id),
    email: row.email === null ? null : String(row.email),
    phone: row.phone === null ? null : String(row.phone),
    name: row.name === null ? null : String(row.name),
    hasGoogle: row.google_sub !== null,
    hasTelegram: row.telegram_id !== null,
  }
}

/** Pro is the server's word: an active row in subscriptions (written only by the payment flow). */
export async function proStatus(userId: string, now = Date.now()) {
  const result = await db().execute({
    sql: 'SELECT plan, source, expires_at FROM subscriptions WHERE user_id = ?',
    args: [userId],
  })
  const row = result.rows[0]
  const expiresAt = row ? Number(row.expires_at) : 0
  return {
    active: expiresAt > now,
    plan: row && expiresAt > now ? String(row.plan) : null,
    source: row && expiresAt > now ? String(row.source) : null,
    expiresAt: expiresAt > now ? expiresAt : null,
  }
}

/** Everything the account holds, deleted on the parent's request (privacy page: "delete my data"). */
export async function deleteUser(userId: string): Promise<void> {
  await db().batch(
    [
      { sql: 'DELETE FROM sessions WHERE user_id = ?', args: [userId] },
      { sql: 'DELETE FROM user_state WHERE user_id = ?', args: [userId] },
      { sql: 'DELETE FROM subscriptions WHERE user_id = ?', args: [userId] },
      { sql: 'DELETE FROM payments WHERE user_id = ?', args: [userId] },
      { sql: 'DELETE FROM users WHERE id = ?', args: [userId] },
    ],
    'write',
  )
}

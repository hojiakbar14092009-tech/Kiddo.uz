import { randomToken, sha256 } from './crypto.js'
import { db } from './db.js'
import { cookie, HttpError, isSecure, parseCookies } from './http.js'

const DAY = 86_400_000
const SESSION_DAYS = 30

/**
 * Sessions: a random 256-bit token in an httpOnly cookie; the database keeps only its SHA-256,
 * so a leaked table cannot be replayed. `__Host-` (Secure, Path=/, no Domain) on https.
 */
export const sessionCookieName = (request: Request) =>
  isSecure(request) ? '__Host-kiddo_session' : 'kiddo_session'

export interface Session {
  userId: string
  idHash: string
}

export async function getSession(request: Request, now = Date.now()): Promise<Session | null> {
  const token = parseCookies(request)[sessionCookieName(request)]
  if (!token || token.length > 100) return null
  const idHash = sha256(token)
  const result = await db().execute({
    sql: 'SELECT user_id, expires_at, last_seen_at FROM sessions WHERE id_hash = ?',
    args: [idHash],
  })
  const row = result.rows[0]
  if (!row || Number(row.expires_at) <= now) return null
  // a session in use stays alive; written at most once a day, not on every request
  if (now - Number(row.last_seen_at) > DAY) {
    await db().execute({
      sql: 'UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE id_hash = ?',
      args: [now, now + SESSION_DAYS * DAY, idHash],
    })
  }
  return { userId: String(row.user_id), idHash }
}

export async function requireSession(request: Request): Promise<Session> {
  const session = await getSession(request)
  if (!session) throw new HttpError(401, 'signed_out')
  return session
}

/**
 * A new session after every sign-in (the old one of this browser, if any, is deleted), so a
 * session id planted before the sign-in is never promoted. Returns the Set-Cookie value.
 */
export async function startSession(
  request: Request,
  userId: string,
  now = Date.now(),
): Promise<string> {
  const old = parseCookies(request)[sessionCookieName(request)]
  const token = randomToken()
  await db().batch(
    [
      ...(old ? [{ sql: 'DELETE FROM sessions WHERE id_hash = ?', args: [sha256(old)] }] : []),
      {
        sql: 'INSERT INTO sessions (id_hash, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)',
        args: [sha256(token), userId, now, now + SESSION_DAYS * DAY, now],
      },
    ],
    'write',
  )
  return cookie(request, sessionCookieName(request), token, SESSION_DAYS * 86_400)
}

export async function endSession(request: Request): Promise<string> {
  const token = parseCookies(request)[sessionCookieName(request)]
  if (token)
    await db().execute({ sql: 'DELETE FROM sessions WHERE id_hash = ?', args: [sha256(token)] })
  return cookie(request, sessionCookieName(request), '', 0)
}

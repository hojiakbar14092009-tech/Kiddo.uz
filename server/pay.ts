import { randomId } from './crypto.js'
import { db } from './db.js'
import { env } from './env.js'
import { HttpError, json, readJson } from './http.js'
import { rateLimit } from './rateLimit.js'
import { requireSession } from './session.js'
import { proStatus } from './users.js'

/*
 * Pro on the server (MVP): the price list, and a payment in TEST mode (no money moves, no
 * provider yet). The server alone writes `subscriptions`; the app only reads it (GET /api/me).
 * A repeated request with the same idempotency key never pays twice.
 */
const DAY = 86_400_000
export const PLANS = {
  month: { amount: 24_990, days: 30 },
  year: { amount: 238_990, days: 365 },
} as const
export type Plan = keyof typeof PLANS

export const prices = () => json(200, { currency: 'UZS', mode: payMode(), plans: PLANS })

/** test until a real provider is connected; anything else is refused (no live payments by accident) */
const payMode = () => env('PAYMENT_MODE') ?? 'test'

export async function checkout(request: Request, now = Date.now()): Promise<Response> {
  const { userId } = await requireSession(request)
  if (payMode() !== 'test') throw new HttpError(503, 'payments_not_live')
  const body = await readJson<{ plan?: unknown; idempotencyKey?: unknown }>(request, 1024)
  const plan = body.plan === 'month' || body.plan === 'year' ? body.plan : null
  const key =
    typeof body.idempotencyKey === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(body.idempotencyKey)
      ? body.idempotencyKey
      : null
  if (!plan || !key) throw new HttpError(400, 'bad_request')
  await rateLimit(`pay:${userId}`, 10, 3600)
  const inserted = await db().execute({
    sql: `INSERT INTO payments (id, user_id, provider, plan, amount, currency, mode, status, idempotency_key, created_at)
          VALUES (?, ?, 'test', ?, ?, 'UZS', 'test', 'paid', ?, ?)
          ON CONFLICT(user_id, idempotency_key) DO NOTHING`,
    args: [randomId(), userId, plan, PLANS[plan].amount, key, now],
  })
  if (inserted.rowsAffected === 1) {
    // a new payment: the plan's days are added after what is left of the current one
    await db().execute({
      sql: `INSERT INTO subscriptions (user_id, plan, source, expires_at, updated_at) VALUES (?, ?, 'test', ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET plan = excluded.plan, source = excluded.source,
              expires_at = MAX(subscriptions.expires_at, ?) + ?, updated_at = excluded.updated_at`,
      args: [userId, plan, now + PLANS[plan].days * DAY, now, now, PLANS[plan].days * DAY],
    })
  }
  return json(200, { pro: await proStatus(userId, now), repeated: inserted.rowsAffected !== 1 })
}

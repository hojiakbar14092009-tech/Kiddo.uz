import { emailStart, emailVerify, googleCallback, googleStart, methods } from './auth.js'
import { ready } from './db.js'
import { assertSameOrigin, clientIp, errorSummary, HttpError, json } from './http.js'
import {
  assertCron,
  dailyCron,
  notifyLink,
  notifySettings,
  saveNotifySettings,
  weeklyCron,
} from './notify.js'
import { memoryLimit } from './rateLimit.js'
import { endSession, requireSession } from './session.js'
import { checkout, prices } from './pay.js'
import { getState, putState } from './sync.js'
import {
  telegramResend,
  telegramStart,
  telegramStatus,
  telegramVerify,
  telegramWebhook,
  assertWebhookSecret,
} from './telegram.js'
import { deleteUser, getUser, proStatus } from './users.js'

type Handler = (request: Request, url: URL) => Promise<Response>

/** Every API route, in ONE Vercel function (Hobby allows 12 per deployment). */
const routes: Record<string, Handler> = {
  'GET health': async () => json(200, { ok: true }),
  'GET me': async (request) => {
    const { userId } = await requireSession(request)
    const [user, pro] = await Promise.all([getUser(userId), proStatus(userId)])
    return json(200, { user, pro })
  },
  'POST auth/logout': async (request) =>
    json(200, { ok: true }, { 'set-cookie': await endSession(request) }),
  'POST account/delete': async (request) => {
    const { userId } = await requireSession(request)
    await deleteUser(userId)
    return json(200, { ok: true }, { 'set-cookie': await endSession(request) })
  },
  'GET sync': getState,
  'PUT sync': putState,
  // signing in (MVP): Google, a code by e-mail, a code by Telegram
  'GET auth/methods': async () => methods(),
  'POST auth/email/start': (request) => emailStart(request),
  'POST auth/email/verify': (request) => emailVerify(request),
  'GET auth/google/start': (request) => googleStart(request),
  'GET auth/google/callback': (request, url) => googleCallback(request, url),
  'POST auth/telegram/start': (request) => telegramStart(request),
  'GET auth/telegram/status': (request, url) => telegramStatus(request, url),
  'POST auth/telegram/resend': (request) => telegramResend(request),
  'POST auth/telegram/verify': (request) => telegramVerify(request),
  'POST telegram/webhook': (request) => telegramWebhook(request),
  // the parents' Telegram notifications (stage 9) and their Vercel cron jobs (vercel.json)
  'GET notify/settings': (request) => notifySettings(request),
  'PUT notify/settings': (request) => saveNotifySettings(request),
  'POST notify/link': (request) => notifyLink(request),
  'GET cron/weekly': (request) => weeklyCron(request),
  'GET cron/daily': (request) => dailyCron(request),
  // Pro (MVP: test payments)
  'GET pay/prices': async () => prices(),
  'POST pay/checkout': (request) => checkout(request),
}

/** Answered without the database (they work, and say what is set up, before Turso is). */
const NO_DATABASE = new Set(['GET health', 'GET auth/methods', 'GET pay/prices'])

/** Webhooks and cron jobs prove themselves with a secret, not with a browser Origin. */
const WEBHOOKS = new Set<string>(['POST telegram/webhook', 'GET cron/weekly', 'GET cron/daily'])

/**
 * The route: /api/<path> in the dev server, or /api?path=<path> after the vercel.json rewrite.
 */
export function routeOf(url: URL): string {
  const fromQuery = url.searchParams.get('path')
  const path = fromQuery ?? url.pathname.replace(/^\/api\/?/, '')
  return path.replace(/^\/+|\/+$/g, '')
}

export async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const route = `${request.method} ${routeOf(url)}`
  const handler = routes[route]
  try {
    if (!handler) throw new HttpError(404, 'not_found')
    if (!WEBHOOKS.has(route)) assertSameOrigin(request)
    // a coarse limit per IP over every route, in memory (no database write per request);
    // the sensitive routes (codes, sign-in, writes, payments) add their own in Turso
    // Telegram's servers share a few IPs: the webhook has a higher bucket of its own
    if (route === 'POST telegram/webhook') memoryLimit(`hook-ip:${clientIp(request)}`, 600, 60)
    else memoryLimit(`ip:${clientIp(request)}`, 300, 60)
    // a webhook or cron call without its secret is refused before the database is touched
    if (route === 'POST telegram/webhook') assertWebhookSecret(request)
    if (route.startsWith('GET cron/')) assertCron(request)
    if (!NO_DATABASE.has(route)) await ready()
    return await handler(request, url)
  } catch (error) {
    if (error instanceof HttpError) {
      const headers: Record<string, string> = {}
      if (error.status === 429 && typeof error.extra?.retryAfter === 'number')
        headers['retry-after'] = String(error.extra.retryAfter)
      return json(error.status, { error: error.code, ...error.extra }, headers)
    }
    // the route and a short safe reason (name, code, message without addresses): never the request, cookies or secrets
    console.error('[api] failed', route, errorSummary(error))
    return json(500, { error: 'server_error' })
  }
}

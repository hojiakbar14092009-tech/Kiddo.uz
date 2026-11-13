import { createRemoteJWKSet, jwtVerify } from 'jose'
import { hmac, randomId, randomToken, sameText, sha256, sixDigits } from './crypto.js'
import { db } from './db.js'
import { env, requireEnv } from './env.js'
import { clientIp, cookie, HttpError, json, parseCookies, readJson, redirect } from './http.js'
import { rateLimit } from './rateLimit.js'
import { startSession } from './session.js'

/*
 * Signing in (MVP): Google, a code by e-mail, a code by Telegram (telegram.ts). Codes are
 * 6 digits, kept only as an HMAC with AUTH_SECRET, valid 5 minutes, used once, 5 tries.
 * Every sign-in starts a new session (session.ts). Nothing here logs a code, token or address.
 */
export const CODE_MS = 5 * 60_000
export const MAX_TRIES = 5

const codeHash = (channel: string, target: string, code: string) =>
  hmac(`${channel}:${target}:${code}`)

/** A new code for this target (an e-mail, or a Telegram sign-in); the older ones stop working. */
export async function issueCode(
  channel: 'email' | 'telegram',
  target: string,
  now = Date.now(),
): Promise<string> {
  const code = sixDigits()
  await db().batch(
    [
      {
        sql: 'UPDATE auth_codes SET used_at = ? WHERE channel = ? AND target = ? AND used_at IS NULL',
        args: [now, channel, target],
      },
      {
        sql: 'INSERT INTO auth_codes (id, channel, target, code_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
        args: [randomId(), channel, target, codeHash(channel, target, code), now, now + CODE_MS],
      },
    ],
    'write',
  )
  return code
}

/** Accepts the code once; a wrong one counts a try; too many tries or an old code is refused. */
export async function useCode(
  channel: 'email' | 'telegram',
  target: string,
  code: string,
  now = Date.now(),
): Promise<void> {
  if (!/^\d{6}$/.test(code)) throw new HttpError(400, 'wrong_code')
  const found = await db().execute({
    sql: `SELECT id, code_hash, attempts, expires_at FROM auth_codes
          WHERE channel = ? AND target = ? AND used_at IS NULL ORDER BY created_at DESC LIMIT 1`,
    args: [channel, target],
  })
  const row = found.rows[0]
  if (!row || Number(row.expires_at) <= now) throw new HttpError(400, 'code_expired')
  if (Number(row.attempts) >= MAX_TRIES) throw new HttpError(429, 'too_many_tries')
  if (!sameText(String(row.code_hash), codeHash(channel, target, code))) {
    await db().execute({
      sql: 'UPDATE auth_codes SET attempts = attempts + 1 WHERE id = ?',
      args: [String(row.id)],
    })
    throw new HttpError(400, 'wrong_code', { triesLeft: MAX_TRIES - Number(row.attempts) - 1 })
  }
  // one use, even if two requests race: only the first UPDATE changes the row
  const used = await db().execute({
    sql: 'UPDATE auth_codes SET used_at = ? WHERE id = ? AND used_at IS NULL',
    args: [now, String(row.id)],
  })
  if (used.rowsAffected !== 1) throw new HttpError(400, 'code_expired')
}

type Identity = {
  email?: string
  phone?: string
  googleSub?: string
  telegramId?: string
  name?: string
}

/** The account with this identity (Google, e-mail, phone, Telegram), made on the first sign-in. */
export async function userFor(identity: Identity, now = Date.now()): Promise<string> {
  const checks: [string, string | undefined][] = [
    ['google_sub', identity.googleSub],
    ['telegram_id', identity.telegramId],
    ['email', identity.email],
    ['phone', identity.phone],
  ]
  for (const [column, value] of checks) {
    if (!value) continue
    const found = await db().execute({
      sql: `SELECT id FROM users WHERE ${column} = ?`,
      args: [value],
    })
    const id = found.rows[0]?.id
    if (id === undefined) continue
    // the same parent signing in another way: the new identity joins the account (never replaces one)
    await db().execute({
      sql: `UPDATE users SET email = COALESCE(email, ?), phone = COALESCE(phone, ?), google_sub = COALESCE(google_sub, ?),
            telegram_id = COALESCE(telegram_id, ?), name = COALESCE(name, ?), updated_at = ? WHERE id = ?`,
      args: [
        identity.email ?? null,
        identity.phone ?? null,
        identity.googleSub ?? null,
        identity.telegramId ?? null,
        identity.name ?? null,
        now,
        id,
      ],
    })
    return String(id)
  }
  const id = randomId()
  await db().execute({
    sql: `INSERT INTO users (id, email, phone, google_sub, telegram_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      identity.email ?? null,
      identity.phone ?? null,
      identity.googleSub ?? null,
      identity.telegramId ?? null,
      identity.name ?? null,
      now,
      now,
    ],
  })
  return id
}

export async function signedIn(request: Request, userId: string): Promise<Response> {
  return json(200, { ok: true, userId }, { 'set-cookie': await startSession(request, userId) })
}

// ---- e-mail ----

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/
export function cleanEmail(raw: unknown): string {
  const email = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if (!EMAIL.test(email)) throw new HttpError(400, 'bad_email')
  return email
}

export const MAIL_TEXT = {
  uz: {
    subject: 'Kiddo: kirish kodi',
    body: (code: string) =>
      `Kiddo'ga kirish kodingiz: ${code}\nKod 5 daqiqa amal qiladi. Siz so'ramagan bo'lsangiz, bu xatni e'tiborsiz qoldiring.`,
  },
  ru: {
    subject: 'Kiddo: код для входа',
    body: (code: string) =>
      `Ваш код для входа в Kiddo: ${code}\nКод действует 5 минут. Если вы его не запрашивали, просто проигнорируйте письмо.`,
  },
  en: {
    subject: 'Kiddo: your sign-in code',
    body: (code: string) =>
      `Your Kiddo sign-in code: ${code}\nIt works for 5 minutes. If you did not ask for it, ignore this e-mail.`,
  },
} as const
export type Lang = keyof typeof MAIL_TEXT
export const langOf = (raw: unknown): Lang => (raw === 'ru' || raw === 'en' ? raw : 'uz')

/** Sends through SMTP (nodemailer); tests replace it. */
export let sendMail = async (to: string, subject: string, text: string): Promise<void> => {
  const { createTransport } = await import('nodemailer')
  const port = Number(requireEnv('SMTP_PORT'))
  await createTransport({
    host: requireEnv('SMTP_HOST'),
    port,
    secure: port === 465,
    auth: { user: requireEnv('SMTP_USER'), pass: requireEnv('SMTP_PASS') },
  }).sendMail({ from: requireEnv('SMTP_FROM'), to, subject, text })
}
export function useMailerForTests(send: typeof sendMail): void {
  sendMail = send
}

/** A per-day mail cap: over it the parent is told to use Telegram or Google (code email_limited). */
async function dailyEmailLimit(key: string, max: number): Promise<void> {
  try {
    await rateLimit(key, max, 86_400)
  } catch (error) {
    if (error instanceof HttpError && error.status === 429)
      throw new HttpError(429, 'email_limited')
    throw error
  }
}

export async function emailStart(request: Request): Promise<Response> {
  const body = await readJson<{ email?: unknown; language?: unknown }>(request, 4096)
  const email = cleanEmail(body.email)
  const ip = clientIp(request)
  await rateLimit(`email-ip:${ip}`, 20, 3600)
  await rateLimit(`email-to:${email}`, 3, 600)
  // daily caps protect the mail quota; Telegram and Google sign-in never touch them.
  // Narrow ones first: a caller refused there does not use up the whole site's cap.
  await dailyEmailLimit(`email-to-day:${email}`, 5)
  await dailyEmailLimit(`email-ip-day:${ip}`, 15)
  await dailyEmailLimit('email-day', Number(env('EMAIL_DAILY_CAP')) || 200)
  for (const name of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'])
    requireEnv(name)
  const text = MAIL_TEXT[langOf(body.language)]
  await sendMail(email, text.subject, text.body(await issueCode('email', email)))
  // the same answer whether or not the address has an account (no way to test who is a customer)
  return json(200, { ok: true })
}

export async function emailVerify(request: Request): Promise<Response> {
  const body = await readJson<{ email?: unknown; code?: unknown }>(request, 4096)
  const email = cleanEmail(body.email)
  await rateLimit(`verify-ip:${clientIp(request)}`, 30, 600)
  await useCode('email', email, String(body.code ?? ''))
  return signedIn(request, await userFor({ email }))
}

// ---- Google (OAuth 2.0 code flow with PKCE, the ID token checked against Google's keys) ----

const GOOGLE_COOKIE = 'kiddo_oauth'
const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))
const callbackUrl = (request: Request) => `${new URL(request.url).origin}/api/auth/google/callback`
const challengeOf = (verifier: string) => Buffer.from(sha256(verifier), 'hex').toString('base64url')

export async function googleStart(request: Request): Promise<Response> {
  const clientId = requireEnv('GOOGLE_CLIENT_ID')
  requireEnv('GOOGLE_CLIENT_SECRET')
  await rateLimit(`google-ip:${clientIp(request)}`, 30, 600)
  const state = randomToken(24)
  const verifier = randomToken(48)
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl(request),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: challengeOf(verifier),
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString()
  return redirect(url.toString(), [cookie(request, GOOGLE_COOKIE, `${state}.${verifier}`, 600)])
}

/** Exchanges the code; tests replace it (no network). */
export let googleToken = async (
  code: string,
  verifier: string,
  redirectUri: string,
): Promise<string> => {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      code_verifier: verifier,
      client_id: requireEnv('GOOGLE_CLIENT_ID'),
      client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  const body = (await response.json().catch(() => ({}))) as { id_token?: string }
  if (!response.ok || !body.id_token) throw new HttpError(400, 'google_failed')
  return body.id_token
}
export let verifyGoogleToken = async (idToken: string) =>
  (
    await jwtVerify(idToken, googleKeys, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: requireEnv('GOOGLE_CLIENT_ID'),
    })
  ).payload
export function useGoogleForTests(
  token: typeof googleToken,
  verify: typeof verifyGoogleToken,
): void {
  googleToken = token
  verifyGoogleToken = verify
}

/** Why a Google sign-in failed: fixed codes only (no token, e-mail or Google text in a log or an address). */
export type GoogleFailure =
  | 'denied'
  | 'no_state'
  | 'state_mismatch'
  | 'no_code'
  | 'token_failed'
  | 'bad_token'
  | 'email_unverified'
  | 'server_error'

export async function googleCallback(request: Request, url: URL): Promise<Response> {
  const clear = cookie(request, GOOGLE_COOKIE, '', 0)
  const failed = (reason: GoogleFailure) => {
    console.error('google_signin_failed', reason)
    return redirect(`/parent/auth?signin=failed&reason=${reason}`, [clear])
  }
  // the parent pressed "Cancel" on Google's screen (or Google refused): Google says so in `error`
  if (url.searchParams.has('error')) return failed('denied')
  const [state, verifier] = (parseCookies(request)[GOOGLE_COOKIE] ?? '').split('.')
  const given = url.searchParams.get('state') ?? ''
  const code = url.searchParams.get('code')
  // a callback this browser did not start (CSRF / a stolen link) is refused
  if (!state || !verifier) return failed('no_state')
  if (!sameText(state, given)) return failed('state_mismatch')
  if (!code) return failed('no_code')
  let idToken: string
  try {
    idToken = await googleToken(code, verifier, callbackUrl(request))
  } catch {
    return failed('token_failed')
  }
  let claims: Awaited<ReturnType<typeof verifyGoogleToken>>
  try {
    claims = await verifyGoogleToken(idToken)
  } catch {
    return failed('bad_token')
  }
  if (
    typeof claims.sub !== 'string' ||
    claims.email_verified !== true ||
    typeof claims.email !== 'string'
  )
    return failed('email_unverified')
  try {
    const userId = await userFor({
      googleSub: claims.sub,
      email: claims.email.toLowerCase(),
      name: typeof claims.name === 'string' ? claims.name.slice(0, 80) : undefined,
    })
    return redirect('/parent/auth?signin=google', [clear, await startSession(request, userId)])
  } catch {
    return failed('server_error')
  }
}

/** Which ways to sign in are set up on this server (the screen hides the others). */
export function methods(): Response {
  return json(200, {
    google: !!(env('GOOGLE_CLIENT_ID') && env('GOOGLE_CLIENT_SECRET')),
    email: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'].every((name) =>
      env(name),
    ),
    telegram: !!(
      env('TELEGRAM_BOT_TOKEN') &&
      env('TELEGRAM_BOT_USERNAME') &&
      env('TELEGRAM_WEBHOOK_SECRET')
    ),
  })
}

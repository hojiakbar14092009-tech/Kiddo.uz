import { issueCode, langOf, signedIn, useCode, userFor, type Lang } from './auth.js'
import { hmac, randomToken, sameText, sha256 } from './crypto.js'
import { db } from './db.js'
import { botUsername, requireEnv } from './env.js'
import { clientIp, HttpError, json, readJson } from './http.js'
import { memoryLimit, rateLimit } from './rateLimit.js'

/*
 * Signing in with a code from Telegram (MVP):
 * 1. the site sends the phone; the server makes a one-time token (10 min) and the link
 *    t.me/<bot>?start=<token> (Telegram allows 64 characters; ours is 32);
 * 2. in the bot the parent presses Start, then shares their number (request_contact);
 *    the bot accepts only their OWN contact (contact.user_id == from.id) and only the phone
 *    typed on the site, then sends a 6-digit code;
 * 3. the code typed on the site signs in. Resending: 30 s apart, at most 5 per sign-in.
 * Telegram calls the webhook with a secret header (derived from AUTH_SECRET).
 */
export const LOGIN_MS = 10 * 60_000
export const RESEND_MS = 30_000
export const MAX_SENDS = 5

/** +998 and 9 digits, from what a person or Telegram writes (spaces, dashes, no plus, local form). */
export function normalizePhone(raw: unknown): string | null {
  const digits = typeof raw === 'string' ? raw.replace(/\D/g, '') : ''
  if (/^998\d{9}$/.test(digits)) return `+${digits}`
  if (/^\d{9}$/.test(digits)) return `+998${digits}`
  return null
}

export const webhookSecret = () => hmac('telegram-webhook').slice(0, 64)

export const BOT_TEXT: Record<
  Lang,
  Record<'hello' | 'share' | 'notYours' | 'otherPhone' | 'expired' | 'code' | 'unknown', string>
> = {
  uz: {
    hello:
      'Salom! Bu Kiddo boti. Kirish kodini olish uchun pastdagi «Raqamni ulashish» tugmasini bosing.',
    share: '📱 Raqamni ulashish',
    notYours: 'Faqat o‘zingizning raqamingizni ulashing (pastdagi tugma orqali).',
    otherPhone:
      'Bu raqam saytda yozilgan raqamga mos emas. Saytdagi raqamni tekshirib, qaytadan urinib ko‘ring.',
    expired:
      'Bu havola eskirgan yoki ishlatilgan. Saytda «Telegram’da kod olish» tugmasini qaytadan bosing.',
    code: 'Kiddo kirish kodingiz: {code}\nKodni saytga yozing. U 5 daqiqa amal qiladi.',
    unknown: 'Kirish uchun saytdagi «Telegram’da kod olish» tugmasidan foydalaning.',
  },
  ru: {
    hello:
      'Здравствуйте! Это бот Kiddo. Чтобы получить код входа, нажмите кнопку «Поделиться номером» ниже.',
    share: '📱 Поделиться номером',
    notYours: 'Поделитесь, пожалуйста, своим номером (кнопкой ниже).',
    otherPhone:
      'Этот номер не совпадает с номером на сайте. Проверьте номер на сайте и попробуйте снова.',
    expired:
      'Ссылка устарела или уже использована. Нажмите на сайте «Получить код в Telegram» ещё раз.',
    code: 'Ваш код входа в Kiddo: {code}\nВведите его на сайте. Код действует 5 минут.',
    unknown: 'Чтобы войти, используйте кнопку «Получить код в Telegram» на сайте.',
  },
  en: {
    hello: 'Hi! This is the Kiddo bot. To get your sign-in code, tap “Share my number” below.',
    share: '📱 Share my number',
    notYours: 'Please share your own number (with the button below).',
    otherPhone: 'This number does not match the one on the website. Check it there and try again.',
    expired:
      'This link has expired or was already used. Tap “Get the code in Telegram” on the website again.',
    code: 'Your Kiddo sign-in code: {code}\nType it on the website. It works for 5 minutes.',
    unknown: 'To sign in, use the “Get the code in Telegram” button on the website.',
  },
}

/** Calls the Bot API; tests replace it. */
export let botSend = async (
  chatId: string,
  text: string,
  extra: Record<string, unknown> = {},
): Promise<void> => {
  const response = await fetch(
    `https://api.telegram.org/bot${requireEnv('TELEGRAM_BOT_TOKEN')}/sendMessage`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, ...extra }),
    },
  )
  if (!response.ok) throw new HttpError(502, 'telegram_failed')
}
export function useBotForTests(send: typeof botSend): void {
  botSend = send
}

const tokenOf = (raw: unknown) =>
  typeof raw === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(raw) ? raw : null

async function loginBy(tokenHash: string) {
  const found = await db().execute({
    sql: 'SELECT * FROM telegram_logins WHERE token_hash = ?',
    args: [tokenHash],
  })
  return found.rows[0]
}

/** The site: a phone in, a one-time deep link out. */
export async function telegramStart(request: Request): Promise<Response> {
  const bot = botUsername()
  if (!bot) throw new HttpError(503, 'not_configured', { setting: 'TELEGRAM_BOT_USERNAME' })
  requireEnv('TELEGRAM_BOT_TOKEN')
  const body = await readJson<{ phone?: unknown; language?: unknown }>(request, 4096)
  const phone = normalizePhone(body.phone)
  if (!phone) throw new HttpError(400, 'bad_phone')
  await rateLimit(`tg-ip:${clientIp(request)}`, 20, 3600)
  await rateLimit(`tg-phone:${phone}`, 5, 600)
  const token = randomToken(24) // 32 characters, Telegram's start parameter allows 64
  const now = Date.now()
  await db().execute({
    sql: `INSERT INTO telegram_logins (token_hash, phone, status, language, created_at, expires_at)
          VALUES (?, ?, 'waiting', ?, ?, ?)`,
    args: [sha256(token), phone, langOf(body.language), now, now + LOGIN_MS],
  })
  return json(200, { token, link: `https://t.me/${bot}?start=${token}`, expiresAt: now + LOGIN_MS })
}

/** What the site shows while it waits: waiting → code sent → used, or expired. */
export async function telegramStatus(
  _request: Request,
  url: URL,
  now = Date.now(),
): Promise<Response> {
  const token = tokenOf(url.searchParams.get('token'))
  if (!token) throw new HttpError(400, 'bad_token')
  memoryLimit(`tg-status:${token}`, 40, 60) // the page asks every few seconds
  const login = await loginBy(sha256(token))
  if (!login) throw new HttpError(404, 'not_found')
  const expired = Number(login.expires_at) <= now && login.status !== 'used'
  const lastSent = login.last_sent_at === null ? null : Number(login.last_sent_at)
  return json(200, {
    status: expired ? 'expired' : String(login.status),
    expiresAt: Number(login.expires_at),
    resendAt: lastSent === null ? null : lastSent + RESEND_MS,
    sendsLeft: MAX_SENDS - Number(login.sends),
  })
}

async function sendCode(login: Record<string, unknown>, now: number): Promise<void> {
  const code = await issueCode('telegram', String(login.token_hash), now)
  const text = BOT_TEXT[langOf(login.language)].code.replace('{code}', code)
  await botSend(String(login.chat_id), text, { reply_markup: { remove_keyboard: true } })
  await db().execute({
    sql: `UPDATE telegram_logins SET status = 'code_sent', sends = sends + 1, last_sent_at = ? WHERE token_hash = ?`,
    args: [now, login.token_hash as string],
  })
}

/** "Send again": only after a code went out, 30 s apart, at most five times. */
export async function telegramResend(request: Request, now = Date.now()): Promise<Response> {
  const body = await readJson<{ token?: unknown }>(request, 1024)
  const token = tokenOf(body.token)
  if (!token) throw new HttpError(400, 'bad_token')
  await rateLimit(`tg-resend-ip:${clientIp(request)}`, 30, 3600)
  const login = await loginBy(sha256(token))
  if (!login || Number(login.expires_at) <= now || login.status === 'used')
    throw new HttpError(410, 'expired')
  if (login.status !== 'code_sent' || login.chat_id === null)
    throw new HttpError(409, 'not_started')
  if (Number(login.sends) >= MAX_SENDS) throw new HttpError(429, 'too_many_sends')
  const wait = Number(login.last_sent_at) + RESEND_MS - now
  if (wait > 0) throw new HttpError(429, 'rate_limited', { retryAfter: Math.ceil(wait / 1000) })
  await sendCode(login, now)
  return json(200, { ok: true, resendAt: now + RESEND_MS })
}

/** The code typed on the site: signs in to the account of that phone (made on the first time). */
export async function telegramVerify(request: Request, now = Date.now()): Promise<Response> {
  const body = await readJson<{ token?: unknown; code?: unknown }>(request, 1024)
  const token = tokenOf(body.token)
  if (!token) throw new HttpError(400, 'bad_token')
  await rateLimit(`verify-ip:${clientIp(request)}`, 30, 600)
  const tokenHash = sha256(token)
  const login = await loginBy(tokenHash)
  if (!login || Number(login.expires_at) <= now || login.status === 'used')
    throw new HttpError(410, 'expired')
  await useCode('telegram', tokenHash, String(body.code ?? ''), now)
  const used = await db().execute({
    sql: `UPDATE telegram_logins SET status = 'used' WHERE token_hash = ? AND status = 'code_sent'`,
    args: [tokenHash],
  })
  if (used.rowsAffected !== 1) throw new HttpError(410, 'expired')
  return signedIn(
    request,
    await userFor({ phone: String(login.phone), telegramId: String(login.telegram_user_id) }, now),
  )
}

interface Update {
  message?: {
    chat?: { id?: number }
    from?: { id?: number; language_code?: string; is_bot?: boolean }
    text?: string
    contact?: { phone_number?: string; user_id?: number }
  }
}

const langOfTelegram = (code: string | undefined): Lang =>
  code?.startsWith('ru') ? 'ru' : code?.startsWith('en') ? 'en' : 'uz'

/** Telegram → us. Always 200 for a real call (Telegram retries otherwise); the secret header first. */
export async function telegramWebhook(request: Request, now = Date.now()): Promise<Response> {
  const secret = request.headers.get('x-telegram-bot-api-secret-token') ?? ''
  if (!sameText(secret, webhookSecret())) throw new HttpError(401, 'bad_secret')
  const update = await readJson<Update>(request, 64 * 1024)
  const message = update.message
  const chatId = message?.chat?.id
  const fromId = message?.from?.id
  if (!message || chatId === undefined || fromId === undefined || message.from?.is_bot)
    return json(200, { ok: true })
  memoryLimit(`tg-from:${fromId}`, 20, 60)
  let lang = langOfTelegram(message.from?.language_code)
  const say = (key: keyof (typeof BOT_TEXT)['uz'], extra?: Record<string, unknown>) =>
    botSend(String(chatId), BOT_TEXT[lang][key], extra)

  const start = message.text?.match(/^\/start(?:\s+(\S+))?$/)
  if (start) {
    const token = tokenOf(start[1])
    const login = token ? await loginBy(sha256(token)) : undefined
    if (!login || login.status !== 'waiting' || Number(login.expires_at) <= now) {
      await say(token ? 'expired' : 'unknown')
      return json(200, { ok: true })
    }
    lang = langOf(login.language)
    await db().execute({
      sql: 'UPDATE telegram_logins SET telegram_user_id = ?, chat_id = ? WHERE token_hash = ?',
      args: [String(fromId), String(chatId), login.token_hash as string],
    })
    await say('hello', {
      reply_markup: {
        keyboard: [[{ text: BOT_TEXT[lang].share, request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    })
    return json(200, { ok: true })
  }

  if (message.contact) {
    // someone else's contact card (forwarded or picked from the address book) never proves anything
    if (message.contact.user_id !== fromId) {
      await say('notYours')
      return json(200, { ok: true })
    }
    const found = await db().execute({
      sql: `SELECT * FROM telegram_logins WHERE telegram_user_id = ? AND status = 'waiting' AND expires_at > ?
            ORDER BY created_at DESC LIMIT 1`,
      args: [String(fromId), now],
    })
    const login = found.rows[0]
    if (!login) {
      await say('expired')
      return json(200, { ok: true })
    }
    lang = langOf(login.language)
    if (normalizePhone(message.contact.phone_number) !== login.phone) {
      await say('otherPhone')
      return json(200, { ok: true })
    }
    await sendCode(login, now)
    return json(200, { ok: true })
  }

  await say('unknown')
  return json(200, { ok: true })
}

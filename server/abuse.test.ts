import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGoogleForTests, useMailerForTests } from './auth.js'
import { sha256 } from './crypto.js'
import { db } from './db.js'
import { clientIp } from './http.js'
import { rateLimit } from './rateLimit.js'
import { useBotForTests, webhookSecret } from './telegram.js'
import { call, freshDb } from './testHelpers.js'

const mails: string[] = []
const DAY = 86_400_000
let day = 0

beforeEach(async () => {
  await freshDb()
  mails.length = 0
  Object.assign(process.env, {
    SMTP_HOST: 'smtp.test',
    SMTP_PORT: '465',
    SMTP_USER: 'u',
    SMTP_PASS: 'p',
    SMTP_FROM: 'Kiddo <a@b.c>',
    TELEGRAM_BOT_TOKEN: 'bot-token',
    TELEGRAM_BOT_USERNAME: 'kiddo_test_bot',
    TELEGRAM_WEBHOOK_SECRET: 'webhook-secret-for-tests_123',
    GOOGLE_CLIENT_ID: 'google-id',
    GOOGLE_CLIENT_SECRET: 'google-secret',
    CRON_SECRET: 'cron-secret-for-tests',
  })
  delete process.env.EMAIL_DAILY_CAP
  useMailerForTests(async (to) => void mails.push(to))
  useBotForTests(async () => undefined)
  useGoogleForTests(
    async () => 'id-token',
    async () => ({ sub: 'g', email: 'g@x.uz', email_verified: true }),
  )
  // each test on its own day: the daily counters are per UTC day
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(Date.parse('2026-11-13T09:00:00Z') + (day += 1) * DAY))
})
afterEach(() => vi.useRealTimers())

const ask = (email: string, ip: string | null, extra: Record<string, string> = {}) =>
  call('POST', 'auth/email/start', {
    body: { email, language: 'en' },
    headers: { ...(ip ? { 'x-real-ip': ip } : {}), ...extra },
  })
const code = async (response: Response) =>
  ((await response.json()) as { error?: string }).error ?? 'ok'
const minutes = (n: number) => vi.setSystemTime(new Date(Date.now() + n * 60_000))

describe('e-mail daily limits (the mail quota)', () => {
  it('one address gets 5 codes a day, then is told to use Telegram or Google', async () => {
    for (let i = 0; i < 5; i += 1) {
      expect(await code(await ask('a@x.uz', '1.1.1.1'))).toBe('ok')
      minutes(11) // past the 3-per-10-minutes limit
    }
    const sixth = await ask('a@x.uz', '1.1.1.1')
    expect(sixth.status).toBe(429)
    expect(await code(sixth)).toBe('email_limited')
    expect(mails).toHaveLength(5)
  })

  it('one IP gets 15 mails a day across different addresses', async () => {
    for (let i = 0; i < 15; i += 1) {
      expect(await code(await ask(`u${i}@x.uz`, '2.2.2.2'))).toBe('ok')
    }
    expect(await code(await ask('u99@x.uz', '2.2.2.2'))).toBe('email_limited')
    // another IP is not affected
    expect(await code(await ask('other@x.uz', '3.3.3.3'))).toBe('ok')
  })

  it('the whole site is capped (EMAIL_DAILY_CAP, default 200); the narrow limits go first', async () => {
    process.env.EMAIL_DAILY_CAP = '3'
    for (let i = 0; i < 3; i += 1)
      expect(await code(await ask(`g${i}@x.uz`, `9.9.9.${i}`))).toBe('ok')
    expect(await code(await ask('late@x.uz', '9.9.9.9'))).toBe('email_limited')
    expect(mails).toHaveLength(3)
    // a caller turned away by its own address limit did not use up the site's cap
    delete process.env.EMAIL_DAILY_CAP
    for (let i = 0; i < 5; i += 1) {
      await ask('same@x.uz', '8.8.8.8')
      minutes(11)
    }
    const site = async () =>
      Number(
        (
          await db().execute({
            sql: 'SELECT count FROM rate_limits WHERE key = ?',
            args: [sha256('email-day')],
          })
        ).rows[0]!.count,
      )
    const used = await site()
    expect(await code(await ask('same@x.uz', '8.8.8.8'))).toBe('email_limited')
    expect(await site()).toBe(used)
  })

  it('Telegram and Google sign-in do not depend on the e-mail caps', async () => {
    process.env.EMAIL_DAILY_CAP = '1'
    expect(await code(await ask('a@x.uz', '4.4.4.4'))).toBe('ok')
    expect(await code(await ask('b@x.uz', '4.4.4.5'))).toBe('email_limited')
    const telegram = await call('POST', 'auth/telegram/start', {
      body: { phone: '901234567', language: 'uz' },
      headers: { 'x-real-ip': '4.4.4.6' },
    })
    expect(telegram.status).toBe(200)
    const google = await call('GET', 'auth/google/start', { headers: { 'x-real-ip': '4.4.4.7' } })
    expect(google.status).toBe(302)
  })
})

describe('the caller’s IP', () => {
  const ip = (headers: Record<string, string>) =>
    clientIp(new Request('https://kiddo.test/api/x', { headers }))

  it('reads only Vercel’s own headers; a sent x-forwarded-for changes nothing', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect(ip({ 'x-real-ip': '5.5.5.5' })).toBe('5.5.5.5')
    expect(ip({ 'x-vercel-forwarded-for': '6.6.6.6, 7.7.7.7' })).toBe('6.6.6.6')
    expect(ip({ 'x-real-ip': '5.5.5.5', 'x-forwarded-for': '1.2.3.4' })).toBe('5.5.5.5')
    expect(ip({ 'x-forwarded-for': '1.2.3.4' })).toBe('unknown')
    expect(ip({})).toBe('unknown')
  })

  it('a spoofed x-forwarded-for does not dodge the per-IP limit', async () => {
    for (let i = 0; i < 15; i += 1)
      await ask(`s${i}@x.uz`, '5.5.5.5', { 'x-forwarded-for': `10.0.0.${i}` })
    expect(await code(await ask('s99@x.uz', '5.5.5.5', { 'x-forwarded-for': '10.9.9.9' }))).toBe(
      'email_limited',
    )
    // without Vercel's header all callers share one bucket, whatever they send
    for (let i = 0; i < 15; i += 1)
      await ask(`n${i}@x.uz`, null, { 'x-forwarded-for': `10.1.0.${i}` })
    expect(await code(await ask('n99@x.uz', null, { 'x-forwarded-for': '10.8.8.8' }))).toBe(
      'email_limited',
    )
  })
})

describe('the order: memory first, Turso only for what passed', () => {
  it('a caller over the limit on this instance costs no database write', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(1) // no sweep of old windows
    const spy = vi.spyOn(db(), 'execute')
    const results = []
    for (let i = 0; i < 6; i += 1)
      results.push(
        await rateLimit('order-test', 2, 60).then(
          () => 'ok',
          () => '429',
        ),
      )
    expect(results).toEqual(['ok', 'ok', '429', '429', '429', '429'])
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('a webhook or cron call without its secret never reaches the database', async () => {
    const spy = vi.spyOn(db(), 'execute')
    const batch = vi.spyOn(db(), 'batch')
    const hook = await call('POST', 'telegram/webhook', {
      body: { message: { chat: { id: 1 }, from: { id: 1 }, text: '/start' } },
      origin: null,
    })
    const wrong = await call('POST', 'telegram/webhook', {
      body: {},
      origin: null,
      headers: { 'x-telegram-bot-api-secret-token': 'wrong' },
    })
    const cron = await call('GET', 'cron/weekly', { origin: null })
    const badCron = await call('GET', 'cron/daily', {
      origin: null,
      headers: { authorization: 'Bearer nope' },
    })
    expect([hook.status, wrong.status, cron.status, badCron.status]).toEqual([401, 401, 401, 401])
    expect(spy).not.toHaveBeenCalled()
    expect(batch).not.toHaveBeenCalled()
  })

  it('the real webhook and cron still work with their secrets', async () => {
    const hook = await call('POST', 'telegram/webhook', {
      body: { message: { chat: { id: 1 }, from: { id: 1 }, text: 'salom' } },
      origin: null,
      headers: { 'x-telegram-bot-api-secret-token': webhookSecret() },
    })
    expect(hook.status).toBe(200)
    const cron = await call('GET', 'cron/weekly', {
      origin: null,
      headers: { authorization: 'Bearer cron-secret-for-tests' },
    })
    expect(cron.status).toBe(200)
  })
})

describe('coarse per-IP buckets', () => {
  it('the webhook allows 600 a minute per IP (Telegram shares IPs), the 601st is refused', async () => {
    const hit = () =>
      call('POST', 'telegram/webhook', {
        body: {},
        origin: null,
        headers: { 'x-real-ip': '149.154.0.1' },
      })
    let last = 0
    for (let i = 0; i < 601; i += 1) last = (await hit()).status
    expect(last).toBe(429)
  })

  it('the sign-in status poll allows 120 a minute per IP, whatever the token', async () => {
    let last = 0
    for (let i = 0; i < 121; i += 1)
      last = (
        await call('GET', `auth/telegram/status?token=${String(i).padStart(20, 'a')}`, {
          headers: { 'x-real-ip': '7.7.7.7' },
        })
      ).status
    expect(last).toBe(429)
  })
})

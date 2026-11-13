import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGoogleForTests, useMailerForTests } from './auth.js'
import { MIGRATIONS } from './migrations.js'
import { useBotForTests, webhookSecret } from './telegram.js'
import { call, freshDb, makeUser, ORIGIN } from './testHelpers.js'

const mails: { to: string; text: string }[] = []
const bot: { chat: string; text: string; extra: Record<string, unknown> }[] = []
const codeIn = (text: string) => text.match(/\b(\d{6})\b/)![1]!
const cookieOf = (response: Response) =>
  response.headers
    .getSetCookie()
    .find((c) => c.includes('kiddo_session'))
    ?.split(';')[0]

beforeEach(async () => {
  await freshDb()
  mails.length = 0
  bot.length = 0
  Object.assign(process.env, {
    SMTP_HOST: 'smtp.test',
    SMTP_PORT: '465',
    SMTP_USER: 'u',
    SMTP_PASS: 'p',
    SMTP_FROM: 'Kiddo <a@b.c>',
    TELEGRAM_BOT_TOKEN: 'bot-token',
    TELEGRAM_BOT_USERNAME: '@kiddo_test_bot ',
    TELEGRAM_WEBHOOK_SECRET: 'webhook-secret-for-tests_123',
    GOOGLE_CLIENT_ID: 'google-id',
    GOOGLE_CLIENT_SECRET: 'google-secret',
  })
  useMailerForTests(async (to, _subject, text) => void mails.push({ to, text }))
  useBotForTests(async (chat, text, extra = {}) => void bot.push({ chat, text, extra }))
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-13T09:00:00Z'))
})
afterEach(() => vi.useRealTimers())

describe('the Turso schema', () => {
  it('only ever adds: CREATE ... IF NOT EXISTS, never DROP, DELETE or ALTER', () => {
    for (const { statements } of MIGRATIONS) {
      for (const sql of statements) {
        expect(sql).toMatch(/^\s*CREATE (TABLE|INDEX) IF NOT EXISTS /)
        expect(sql).not.toMatch(/\b(DROP|DELETE|ALTER|UPDATE|INSERT)\b/i)
      }
    }
  })
})

describe('a code by e-mail', () => {
  const start = (email: string, origin?: string | null) =>
    call('POST', 'auth/email/start', { body: { email, language: 'ru' }, origin })
  const verify = (email: string, code: string) =>
    call('POST', 'auth/email/verify', { body: { email, code } })

  it('sends a 6-digit code in the parent’s language and signs in once with it', async () => {
    expect((await start(' Ona@Mail.uz ')).status).toBe(200)
    expect(mails[0]!.to).toBe('ona@mail.uz')
    expect(mails[0]!.text).toContain('Ваш код')
    const code = codeIn(mails[0]!.text)
    const ok = await verify('ona@mail.uz', code)
    expect(ok.status).toBe(200)
    expect(cookieOf(ok)).toBeTruthy()
    // used once: the same code again is refused
    expect((await verify('ona@mail.uz', code)).status).toBe(400)
  })

  it('five wrong tries lock the code; an old code is refused', async () => {
    await start('a@b.uz')
    const code = codeIn(mails[0]!.text)
    const wrong = code === '000000' ? '111111' : '000000'
    for (let n = 0; n < 5; n += 1) expect((await verify('a@b.uz', wrong)).status).toBe(400)
    expect((await verify('a@b.uz', code)).status).toBe(429)
    await start('c@d.uz')
    vi.setSystemTime(Date.now() + 5 * 60_000 + 1)
    expect(await (await verify('c@d.uz', codeIn(mails[1]!.text))).json()).toMatchObject({
      error: 'code_expired',
    })
  })

  it('a fourth code to one address in 10 minutes is refused; another site cannot ask (CSRF)', async () => {
    for (let n = 0; n < 3; n += 1) expect((await start('x@y.uz')).status).toBe(200)
    expect((await start('x@y.uz')).status).toBe(429)
    expect((await start('z@y.uz', 'https://evil.example')).status).toBe(403)
  })

  it('rejects what is not an address (and nothing reaches SQL as text)', async () => {
    expect((await start("a@b.uz' OR 1=1 --")).status).toBe(400)
    expect(mails).toHaveLength(0)
  })
})

describe('a code by Telegram', () => {
  const hook = (message: Record<string, unknown>, secret = webhookSecret()) =>
    call('POST', 'telegram/webhook', {
      body: { message: { chat: { id: 77 }, from: { id: 42, language_code: 'uz' }, ...message } },
      origin: null,
      headers: { 'x-telegram-bot-api-secret-token': secret },
    })
  const begin = async (phone = '90 123-45-67') => {
    const response = await call('POST', 'auth/telegram/start', { body: { phone, language: 'uz' } })
    return (await response.json()) as { token: string; link: string }
  }
  const status = async (token: string) =>
    (await (await call('GET', `auth/telegram/status?token=${token}`)).json()) as Record<
      string,
      unknown
    >

  it('gives a one-time deep link to the bot (start parameter within Telegram’s 64)', async () => {
    const { token, link } = await begin()
    expect(link).toBe(`https://t.me/kiddo_test_bot?start=${token}`)
    expect(token.length).toBeLessThanOrEqual(64)
    expect(await status(token)).toMatchObject({ status: 'waiting' })
  })

  it('Start → own number → code → signed in; the link works once', async () => {
    const { token } = await begin()
    await hook({ text: `/start ${token}` })
    expect(bot[0]!.extra.reply_markup).toMatchObject({ keyboard: [[{ request_contact: true }]] })
    await hook({ contact: { user_id: 42, phone_number: '998901234567' } })
    expect(await status(token)).toMatchObject({ status: 'code_sent', sendsLeft: 4 })
    const code = codeIn(bot[1]!.text)
    const ok = await call('POST', 'auth/telegram/verify', { body: { token, code } })
    expect(ok.status).toBe(200)
    expect(cookieOf(ok)).toBeTruthy()
    expect(await status(token)).toMatchObject({ status: 'used' })
    expect((await call('POST', 'auth/telegram/verify', { body: { token, code } })).status).toBe(410)
  })

  it('someone else’s contact card is refused (contact.user_id must be the sender)', async () => {
    const { token } = await begin()
    await hook({ text: `/start ${token}` })
    await hook({ contact: { user_id: 999, phone_number: '+998901234567' } })
    expect(bot.at(-1)!.text).toContain('o‘zingizning')
    expect(await status(token)).toMatchObject({ status: 'waiting' })
  })

  it('a number other than the one typed on the site gets no code', async () => {
    const { token } = await begin()
    await hook({ text: `/start ${token}` })
    await hook({ contact: { user_id: 42, phone_number: '+998935554433' } })
    expect(bot.at(-1)!.text).toContain('mos emas')
    expect(await status(token)).toMatchObject({ status: 'waiting' })
  })

  it('resend: not before 30 s, at most five codes', async () => {
    const { token } = await begin()
    await hook({ text: `/start ${token}` })
    await hook({ contact: { user_id: 42, phone_number: '998901234567' } })
    const resend = () => call('POST', 'auth/telegram/resend', { body: { token } })
    const early = await resend()
    expect(early.status).toBe(429)
    expect(Number(early.headers.get('retry-after'))).toBeGreaterThan(0)
    for (let n = 0; n < 4; n += 1) {
      vi.setSystemTime(Date.now() + 30_000)
      expect((await resend()).status).toBe(200)
    }
    vi.setSystemTime(Date.now() + 30_000)
    expect(await (await resend()).json()).toMatchObject({ error: 'too_many_sends' })
    // only the newest code works
    const newest = codeIn(bot.at(-1)!.text)
    const older = codeIn(bot.at(-2)!.text)
    if (older !== newest)
      expect(
        (await call('POST', 'auth/telegram/verify', { body: { token, code: older } })).status,
      ).toBe(400)
  })

  it('an old link expires: the site says so, the bot says so', async () => {
    const { token } = await begin()
    vi.setSystemTime(Date.now() + 10 * 60_000 + 1)
    expect(await status(token)).toMatchObject({ status: 'expired' })
    await hook({ text: `/start ${token}` })
    expect(bot.at(-1)!.text).toContain('eskirgan')
  })

  it('the webhook needs Telegram’s secret header; a bad phone and a missing bot are clear errors', async () => {
    expect((await hook({ text: '/start x' }, 'wrong')).status).toBe(401)
    // a prefix of the secret, or one character longer, is still wrong (no length or prefix shortcut)
    expect((await hook({ text: '/start x' }, webhookSecret().slice(0, -1))).status).toBe(401)
    expect((await hook({ text: '/start x' }, `${webhookSecret()}x`)).status).toBe(401)
    // no header at all
    const bare = await call('POST', 'telegram/webhook', {
      body: { message: { chat: { id: 77 }, from: { id: 42 }, text: '/start x' } },
      origin: null,
    })
    expect(bare.status).toBe(401)
    expect(bot).toHaveLength(0) // nothing was answered for a refused update
    expect((await call('POST', 'auth/telegram/start', { body: { phone: '12345' } })).status).toBe(
      400,
    )
    delete process.env.TELEGRAM_BOT_USERNAME
    expect(
      await (await call('POST', 'auth/telegram/start', { body: { phone: '901234567' } })).json(),
    ).toMatchObject({
      error: 'not_configured',
    })
  })
})

describe('Google', () => {
  it('starts with state and PKCE; a callback this browser did not start is refused', async () => {
    const response = await call('GET', 'auth/google/start')
    const location = new URL(response.headers.get('location')!)
    expect(location.searchParams.get('code_challenge_method')).toBe('S256')
    expect(location.searchParams.get('redirect_uri')).toBe(`${ORIGIN}/api/auth/google/callback`)
    const forged = await call('GET', 'auth/google/callback?code=c&state=someone-elses')
    expect(forged.headers.get('location')).toBe('/parent/auth?signin=failed&reason=no_state')
  })

  it('every failure carries a fixed reason code, logged without secrets', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const start = await call('GET', 'auth/google/start')
    const flow = start.headers.getSetCookie()[0]!.split(';')[0]!
    const state = new URL(start.headers.get('location')!).searchParams.get('state')
    const reason = async (query: string) =>
      new URL(
        (await call('GET', `auth/google/callback?${query}`, { cookie: flow })).headers.get(
          'location',
        )!,
        ORIGIN,
      ).searchParams.get('reason')
    expect(await reason(`error=access_denied&state=${state}`)).toBe('denied')
    expect(await reason('code=c&state=other')).toBe('state_mismatch')
    expect(await reason(`state=${state}`)).toBe('no_code')
    useGoogleForTests(
      async () => {
        throw new Error('google said: secret-ish text')
      },
      async () => ({}),
    )
    expect(await reason(`code=c&state=${state}`)).toBe('token_failed')
    useGoogleForTests(
      async () => 'id-token',
      async () => {
        throw new Error('bad signature')
      },
    )
    expect(await reason(`code=c&state=${state}`)).toBe('bad_token')
    // the log holds the code only: never the token, the state or Google's own words
    for (const args of errors.mock.calls) {
      expect(args).toHaveLength(2)
      expect(args[0]).toBe('google_signin_failed')
      expect(args[1]).toMatch(/^[a-z_]+$/)
    }
    errors.mockRestore()
  })

  it('signs in with a verified Google e-mail only', async () => {
    const start = await call('GET', 'auth/google/start')
    const flow = start.headers.getSetCookie()[0]!.split(';')[0]!
    const state = new URL(start.headers.get('location')!).searchParams.get('state')
    useGoogleForTests(
      async () => 'id-token',
      async () => ({ sub: 'g-1', email: 'Ota@Gmail.com', email_verified: true }),
    )
    const ok = await call('GET', `auth/google/callback?code=c&state=${state}`, { cookie: flow })
    expect(ok.headers.get('location')).toBe('/parent/auth?signin=google')
    expect(cookieOf(ok)).toBeTruthy()
    useGoogleForTests(
      async () => 'id-token',
      async () => ({ sub: 'g-2', email: 'x@gmail.com', email_verified: false }),
    )
    const unverified = await call('GET', `auth/google/callback?code=c&state=${state}`, {
      cookie: flow,
    })
    expect(unverified.headers.get('location')).toBe(
      '/parent/auth?signin=failed&reason=email_unverified',
    )
  })
})

describe('Pro on the server (test payments)', () => {
  it('needs a session, pays once per key, adds the plan’s days', async () => {
    process.env.PAYMENT_MODE = 'test'
    expect(
      (await call('POST', 'pay/checkout', { body: { plan: 'month', idempotencyKey: 'k1-abcdef' } }))
        .status,
    ).toBe(401)
    const cookie = await makeUser('u1')
    const pay = (key: string, plan = 'month') =>
      call('POST', 'pay/checkout', { cookie, body: { plan, idempotencyKey: key } })
    const first = (await (await pay('k1-abcdef')).json()) as {
      pro: { active: boolean; expiresAt: number }
    }
    expect(first.pro.active).toBe(true)
    const again = (await (await pay('k1-abcdef')).json()) as {
      pro: { expiresAt: number }
      repeated: boolean
    }
    expect(again.repeated).toBe(true)
    expect(again.pro.expiresAt).toBe(first.pro.expiresAt)
    const year = (await (await pay('k2-abcdef', 'year')).json()) as {
      pro: { expiresAt: number; plan: string }
    }
    expect(year.pro.expiresAt - first.pro.expiresAt).toBe(365 * 86_400_000)
    expect((await pay('bad key!')).status).toBe(400)
  })

  it('prices: 24 990 and 238 990 so‘m', async () => {
    expect(await (await call('GET', 'pay/prices')).json()).toMatchObject({
      currency: 'UZS',
      plans: { month: { amount: 24_990 }, year: { amount: 238_990 } },
    })
  })

  it.each([
    ['unset', undefined, 503],
    ['empty', '', 503],
    ['live', 'live', 503],
    ['unknown', 'TEST', 503],
    ['test', 'test', 200],
  ])('PAYMENT_MODE %s: checkout answers %s', async (_name, mode, status) => {
    if (mode === undefined) delete process.env.PAYMENT_MODE
    else process.env.PAYMENT_MODE = mode
    const cookie = await makeUser('u2')
    const pay = await call('POST', 'pay/checkout', {
      cookie,
      body: { plan: 'month', idempotencyKey: 'k1-abcdef' },
    })
    expect(pay.status).toBe(status)
    if (status === 503) expect(await pay.json()).toMatchObject({ error: 'payments_not_live' })
    delete process.env.PAYMENT_MODE
  })
})

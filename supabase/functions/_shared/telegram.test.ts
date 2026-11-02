import { describe, expect, it, vi } from 'vitest'
import {
  handleTelegram,
  readCommand,
  readMessage,
  sendTelegramMessage,
  telegramSendJob,
  type ChatInfo,
  type ClaimResult,
  type TelegramDeps,
} from './telegram.ts'
import {
  childrenLine,
  formatPro,
  formatReport,
  showLetter,
  TEXTS,
  type ChildReport,
  type Report,
} from './telegramText.ts'
import { PermanentJobError } from './worker.ts'

const SECRET = 's'.repeat(40)
const CODE = '0123456789abcdef0123456789abcdef'

const child = (over: Partial<ChildReport> = {}): ChildReport => ({
  name: 'Aziz',
  age: 5,
  days_active: 3,
  minutes: 19,
  tasks: 2,
  letters: ['a', 'sh'],
  hard: ['o‘'],
  last_day: '2026-11-03',
  ...over,
})

const report = (over: Partial<Report> = {}): Report => ({
  chat_id: 77,
  language: 'uz',
  kind: 'weekly',
  days: 7,
  children: [child()],
  ...over,
})

function deps(over: Partial<TelegramDeps> = {}): TelegramDeps {
  return {
    env: (name) => (name === 'TELEGRAM_WEBHOOK_SECRET' ? SECRET : undefined),
    claim: vi.fn(async (): Promise<ClaimResult> => ({
      status: 'linked',
      language: 'uz',
      children: [
        { name: 'Aziz', age: 5 },
        { name: 'Madina', age: 4 },
      ],
    })),
    unlink: vi.fn(async () => true),
    setLanguage: vi.fn(async () => true),
    chat: vi.fn(async (): Promise<ChatInfo | null> => null),
    report: vi.fn(async () => report()),
    ...over,
  }
}

function update(
  text: string,
  chat: Record<string, unknown> = { id: 77, type: 'private' },
  language = 'uz',
) {
  return {
    update_id: 1,
    message: { message_id: 1, chat, from: { id: 77, language_code: language }, text },
  }
}

function post(body: unknown, secret: string | null = SECRET): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (secret !== null) headers['X-Telegram-Bot-Api-Secret-Token'] = secret
  return new Request('https://x.supabase.co/functions/v1/telegram', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

async function replyText(response: Response): Promise<string | null> {
  if (response.headers.get('Content-Type') !== 'application/json') return null
  const body = (await response.json()) as { method: string; chat_id: number; text: string }
  expect(body.method).toBe('sendMessage')
  expect(body.chat_id).toBe(77)
  return body.text
}

describe('telegram webhook (Phase 56)', () => {
  it('refuses a request without the webhook secret', async () => {
    const d = deps()
    expect((await handleTelegram(post(update('/start ' + CODE), null), d)).status).toBe(401)
    expect((await handleTelegram(post(update('/start ' + CODE), 'x'.repeat(40)), d)).status).toBe(
      401,
    )
    expect(d.claim).not.toHaveBeenCalled()
  })

  it('is unavailable without a long enough secret, and only takes POST', async () => {
    const d = deps({ env: () => 'short' })
    expect((await handleTelegram(post(update('/help'), 'short'), d)).status).toBe(503)
    const get = new Request('https://x.supabase.co/functions/v1/telegram')
    expect((await handleTelegram(get, deps())).status).toBe(405)
  })

  it('links a chat with a one-time code and names the children', async () => {
    const d = deps()
    const text = await replyText(await handleTelegram(post(update(`/start ${CODE}`)), d))
    expect(d.claim).toHaveBeenCalledWith(CODE, 77)
    expect(text).toContain('Aziz (5 yosh) va Madina (4 yosh) ulandi')
  })

  it('never takes a name or anything but a code as a link', async () => {
    const d = deps()
    const text = await replyText(await handleTelegram(post(update('/start Aziz')), d))
    expect(d.claim).not.toHaveBeenCalled()
    expect(text).toBe(TEXTS.uz.invalid)
  })

  it('says when a code is used, expired, or the family has five chats', async () => {
    const invalid = deps({
      claim: vi.fn(async (): Promise<ClaimResult> => ({ status: 'invalid' })),
    })
    expect(await replyText(await handleTelegram(post(update(`/start ${CODE}`)), invalid))).toBe(
      TEXTS.uz.invalid,
    )
    const tooMany = deps({
      claim: vi.fn(async (): Promise<ClaimResult> => ({ status: 'too_many', language: 'ru' })),
    })
    expect(await replyText(await handleTelegram(post(update(`/start ${CODE}`)), tooMany))).toBe(
      TEXTS.ru.tooMany,
    )
  })

  it('answers in the language the code was made in', async () => {
    const d = deps({
      claim: vi.fn(async (): Promise<ClaimResult> => ({
        status: 'linked',
        language: 'ru',
        children: [{ name: 'Аня', age: 6 }],
      })),
    })
    expect(await replyText(await handleTelegram(post(update(`/start ${CODE}`)), d))).toContain(
      'Подключено: Аня (возраст: 6)',
    )
  })

  it('greets a new chat in its Telegram language, and helps a linked one', async () => {
    expect(
      await replyText(await handleTelegram(post(update('/start', undefined, 'en')), deps())),
    ).toBe(TEXTS.en.welcome)
    const linked = deps({
      chat: vi.fn(async () => ({ link_id: 5, language: 'ru' as const, pro: null })),
    })
    expect(await replyText(await handleTelegram(post(update('/start')), linked))).toBe(
      TEXTS.ru.help,
    )
  })

  it('/stop unlinks the chat', async () => {
    const d = deps()
    expect(await replyText(await handleTelegram(post(update('/stop')), d))).toBe(TEXTS.uz.stopped)
    expect(d.unlink).toHaveBeenCalledWith(77)
    const none = deps({ unlink: vi.fn(async () => false) })
    expect(await replyText(await handleTelegram(post(update('/stop@KiddoBot')), none))).toBe(
      TEXTS.uz.notLinked,
    )
  })

  it('/report sends this week now, only to a linked chat', async () => {
    expect(await replyText(await handleTelegram(post(update('/report')), deps()))).toBe(
      TEXTS.uz.notLinked,
    )
    const linked = deps({
      chat: vi.fn(async () => ({ link_id: 5, language: 'uz' as const, pro: null })),
    })
    const text = await replyText(await handleTelegram(post(update('/report')), linked))
    expect(linked.report).toHaveBeenCalledWith(5, 'weekly')
    expect(text).toContain('Haftalik hisobot')
  })

  it('/pro shows only the status and end date, /lang changes the language', async () => {
    const linked = deps({
      chat: vi.fn(async () => ({
        link_id: 5,
        language: 'uz' as const,
        pro: { plan: 'yearly' as const, expires_at: '2027-01-31T00:00:00Z' },
      })),
    })
    expect(await replyText(await handleTelegram(post(update('/pro')), linked))).toBe(
      'PRO: yillik, 31.01.2027 gacha.',
    )
    expect(await replyText(await handleTelegram(post(update('/lang en')), linked))).toBe(
      TEXTS.en.languageSet,
    )
    expect(linked.setLanguage).toHaveBeenCalledWith(77, 'en')
    expect(await replyText(await handleTelegram(post(update('/lang de')), linked))).toBe(
      TEXTS.uz.languagePick,
    )
  })

  it('ignores groups, channels, non-text updates and broken JSON', async () => {
    const d = deps()
    for (const body of [
      update(`/start ${CODE}`, { id: -100, type: 'group' }),
      { update_id: 2, edited_message: update('/stop').message },
      { update_id: 3, message: { chat: { id: 77, type: 'private' }, photo: [] } },
      '{not json',
    ]) {
      const response = await handleTelegram(post(body), d)
      expect(response.status).toBe(200)
      expect(await response.text()).toBe('ok')
    }
    expect(d.claim).not.toHaveBeenCalled()
    expect(d.unlink).not.toHaveBeenCalled()
  })

  it('answers 200 when the database fails (Telegram would only repeat the update)', async () => {
    const log = vi.fn()
    const d = deps({ chat: vi.fn(async () => Promise.reject(new Error('db down'))), log })
    const response = await handleTelegram(post(update('/help')), d)
    expect(response.status).toBe(200)
    expect(log).toHaveBeenCalledWith('[telegram] update failed', expect.any(Error))
    // the message itself is not in the log
    expect(JSON.stringify(log.mock.calls)).not.toContain('/help')
  })

  it('reads commands and messages strictly', () => {
    expect(readCommand('/start@KiddoBot abc')).toEqual({ command: 'start', argument: 'abc' })
    expect(readCommand('hello')).toBeNull()
    expect(readMessage(update('x', { id: 1.5, type: 'private' }))).toBeNull()
    expect(readMessage(update('x', { id: 9, type: 'private' }, 'ru-RU'))?.userLanguage).toBe('ru')
  })
})

describe('telegram messages (Phase 56)', () => {
  it('a weekly report: days, minutes, exercises and letters, no more', () => {
    const text = formatReport(report())!
    expect(text).toContain('Aziz, 5 yosh')
    expect(text).toContain('Shug‘ullangan kunlar: 3 / 7')
    expect(text).toContain('Vaqt: 19 daqiqa')
    expect(text).toContain('Yaxshi bajargan harflari: A, Sh')
    expect(text).toContain('Qiynalgan harflari: O‘')
  })

  it('a child who did not play this week is said so, kindly', () => {
    const text = formatReport(
      report({ children: [child({ tasks: 0, minutes: 0, letters: [], hard: [] })] }),
    )!
    expect(text).toContain(TEXTS.uz.noPlayWeek)
  })

  it('a daily summary leaves out children who did not play, and is not sent for none', () => {
    const daily = report({
      kind: 'daily',
      days: 1,
      children: [child({ name: 'Aziz' }), child({ name: 'Lola', tasks: 0, minutes: 0 })],
    })
    expect(formatReport(daily)).not.toContain('Lola')
    expect(formatReport({ ...daily, children: [child({ tasks: 0, minutes: 0 })] })).toBeNull()
    expect(formatReport(report({ children: [] }))).toBeNull()
  })

  it('a reminder names the children in every language', () => {
    const two = [child({ name: 'Aziz' }), child({ name: 'Madina' })]
    expect(formatReport(report({ kind: 'reminder', children: two }))).toContain('Aziz va Madina')
    expect(formatReport(report({ kind: 'reminder', language: 'ru', children: two }))).toContain(
      'Aziz и Madina',
    )
    expect(formatReport(report({ kind: 'reminder', language: 'en', children: two }))).toContain(
      'Aziz and Madina',
    )
  })

  it('every text exists in all three languages', () => {
    for (const language of ['uz', 'ru', 'en'] as const) {
      for (const [key, value] of Object.entries(TEXTS[language])) {
        expect(value, `${language}.${key}`).toBeTruthy()
      }
    }
    expect(childrenLine([{ name: 'A', age: 4 }], 'en')).toBe('A (age 4)')
    expect(showLetter('ch')).toBe('Ch')
    expect(formatPro(null, 'en')).toBe(TEXTS.en.proNone)
    expect(formatPro({ plan: 'lifetime', expires_at: null }, 'ru')).toBe(TEXTS.ru.proLifetime)
  })
})

describe('telegram_send job (Phase 56)', () => {
  const env = (name: string) => (name === 'TELEGRAM_BOT_TOKEN' ? 'TOKEN-123' : undefined)

  it('sends the report to the linked chat', async () => {
    const fetchFn = vi.fn(async () => new Response('{"ok":true}', { status: 200 }))
    const job = telegramSendJob({
      env,
      report: async () => report(),
      unlink: vi.fn(),
      fetch: fetchFn,
    })
    await job({ link_id: 5, kind: 'weekly' })
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.telegram.org/botTOKEN-123/sendMessage')
    expect(JSON.parse(String(init.body))).toMatchObject({ chat_id: 77 })
  })

  it('unlinks a chat that blocked the bot instead of retrying', async () => {
    const unlink = vi.fn(async () => true)
    const fetchFn = vi.fn(
      async () =>
        new Response('{"ok":false,"description":"Forbidden: bot was blocked"}', { status: 403 }),
    )
    await telegramSendJob({ env, report: async () => report(), unlink, fetch: fetchFn })({
      link_id: 5,
      kind: 'daily',
    })
    expect(unlink).toHaveBeenCalledWith(77)
  })

  it('throws on a passing failure (retried later) without the token in the error', async () => {
    const fetchFn = vi.fn(async () => new Response('busy', { status: 429 }))
    const job = telegramSendJob({
      env,
      report: async () => report(),
      unlink: vi.fn(),
      fetch: fetchFn,
    })
    const error = await job({ link_id: 5, kind: 'weekly' }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(Error)
    expect(String(error)).not.toContain('TOKEN-123')
  })

  it('a bad payload ends the job; a chat unlinked since is skipped', async () => {
    const fetchFn = vi.fn()
    const job = telegramSendJob({ env, report: async () => null, unlink: vi.fn(), fetch: fetchFn })
    await expect(job({ link_id: 'x', kind: 'weekly' })).rejects.toBeInstanceOf(PermanentJobError)
    await expect(job({ link_id: 5, kind: 'spam' })).rejects.toBeInstanceOf(PermanentJobError)
    await job({ link_id: 5, kind: 'weekly' })
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('a network failure never carries the token (the URL holds it) and the send has a time limit', async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError(
        'error sending request for url (https://api.telegram.org/botTOKEN-123/sendMessage)',
      )
    })
    const job = telegramSendJob({
      env,
      report: async () => report(),
      unlink: vi.fn(),
      fetch: fetchFn,
    })
    const error = await job({ link_id: 5, kind: 'weekly' }).catch((e: unknown) => e)
    expect(String(error)).toBe('Error: telegram: network')
    const init = (fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1]
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('/report for a family with no child says so', async () => {
    const linked = deps({
      chat: vi.fn(async () => ({ link_id: 5, language: 'en' as const, pro: null })),
      report: vi.fn(async () => report({ children: [] })),
    })
    expect(await replyText(await handleTelegram(post(update('/report')), linked))).toBe(
      TEXTS.en.noChildren,
    )
  })

  it('sendTelegramMessage: "chat not found" is gone, other 400s throw', async () => {
    const gone = vi.fn(
      async () => new Response('{"description":"Bad Request: chat not found"}', { status: 400 }),
    )
    expect(await sendTelegramMessage('t', 1, 'x', gone)).toBe('gone')
    const bad = vi.fn(
      async () =>
        new Response('{"description":"Bad Request: message is too long"}', { status: 400 }),
    )
    await expect(sendTelegramMessage('t', 1, 'x', bad)).rejects.toThrow('telegram: 400')
  })
})

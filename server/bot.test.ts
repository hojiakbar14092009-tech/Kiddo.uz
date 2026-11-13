import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ALERT_MS, FEEDBACK_MAX } from './bot.js'
import { db } from './db.js'
import { helpText, menuKeyboard, NOTIFY_TEXT, usePauseForTests } from './notify.js'
import { useBotApiForTests, useBotForTests, webhookSecret } from './telegram.js'
import { call, freshDb, makeUser, ORIGIN } from './testHelpers.js'

const sent: { chat: string; text: string; extra: Record<string, unknown> }[] = []
const api: { method: string; body: Record<string, unknown> }[] = []
let minute = 0

beforeEach(async () => {
  await freshDb()
  sent.length = 0
  api.length = 0
  Object.assign(process.env, {
    TELEGRAM_BOT_TOKEN: 'bot-token',
    TELEGRAM_BOT_USERNAME: 'kiddo_test_bot',
    TELEGRAM_WEBHOOK_SECRET: 'webhook-secret-for-tests_123',
  })
  delete process.env.ADMIN_TELEGRAM_CHAT_ID
  useBotForTests(async (chat, text, extra = {}) => void sent.push({ chat, text, extra }))
  useBotApiForTests(async (method, body) => void api.push({ method, body }))
  usePauseForTests(async () => undefined)
  vi.useFakeTimers({ toFake: ['Date'] })
  // each test in its own minute: the webhook's per-sender limit (20 a minute) counts in memory
  vi.setSystemTime(new Date(Date.parse('2026-11-13T09:00:00Z') + (minute += 2) * 60_000))
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const webhook = (body: Record<string, unknown>) =>
  call('POST', 'telegram/webhook', {
    body,
    origin: null,
    headers: { 'x-telegram-bot-api-secret-token': webhookSecret() },
  })
const say = (text: string, chat = 500, from = chat) =>
  webhook({ message: { chat: { id: chat }, from: { id: from, language_code: 'uz' }, text } })
let pressId = 0
const press = (data: string, chat = 500, from = chat, messageId = 10) =>
  webhook({
    callback_query: {
      id: `cb${(pressId += 1)}`,
      from: { id: from, language_code: 'uz' },
      message: { chat: { id: chat }, message_id: messageId },
      data,
    },
  })
const answers = () => api.filter((c) => c.method === 'answerCallbackQuery')

/** A parent with a linked chat (500), weekly report on. */
async function parent(id = 'p1', chat = '500') {
  const cookie = await makeUser(id)
  await db().execute({
    sql: `INSERT INTO notification_prefs (user_id, chat_id, weekly, events, language, updated_at) VALUES (?, ?, 1, 0, 'uz', 0)`,
    args: [id, chat],
  })
  return cookie
}
const prefs = async (id = 'p1') =>
  (
    await db().execute({
      sql: `SELECT n.weekly, n.events, b.security, b.feedback_until FROM notification_prefs n
            LEFT JOIN bot_prefs b ON b.user_id = n.user_id WHERE n.user_id = ?`,
      args: [id],
    })
  ).rows[0]!

describe('the menu and help', () => {
  it('/menu and /yordam answer with the menu; the website button opens the parent area', async () => {
    await parent()
    await say('/menu')
    expect(sent.at(-1)!.text).toBe(NOTIFY_TEXT.uz.menu)
    const keyboard = menuKeyboard('uz', ORIGIN)
    expect(sent.at(-1)!.extra.reply_markup).toEqual(keyboard)
    expect(
      keyboard.inline_keyboard.flat().map((b) => ('url' in b ? b.url : b.callback_data)),
    ).toEqual(['m:report', 'm:settings', 'm:lang', 'm:help', `${ORIGIN}/parent/dashboard`])
    await say('/yordam')
    expect(sent.at(-1)!.text).toBe(helpText('uz', ORIGIN))
    expect(sent.at(-1)!.text.split('\n').length).toBeLessThanOrEqual(6)
    expect(sent.at(-1)!.text).toContain(`${ORIGIN}/parent`)
  })

  it('unknown text gets short help and the menu, from a parent or a stranger; a bare /start is unchanged', async () => {
    await parent()
    await say('salom')
    expect(sent.at(-1)!.text).toBe(helpText('uz', ORIGIN))
    expect(sent.at(-1)!.extra.reply_markup).toEqual(menuKeyboard('uz', ORIGIN))
    await say('nima gap', 900)
    expect(sent.at(-1)!.chat).toBe('900')
    expect(sent.at(-1)!.text).toBe(helpText('uz', ORIGIN))
    await say('/start', 900)
    expect(sent.at(-1)!.text).not.toBe(helpText('uz', ORIGIN))
    expect(sent.at(-1)!.text).toContain('Telegram')
  })

  it('menu buttons run their commands and every press is answered', async () => {
    await parent()
    await press('m:report')
    expect(sent.at(-1)!.text.startsWith('📒')).toBe(true)
    expect(sent.at(-1)!.extra.reply_markup).toEqual(menuKeyboard('uz', ORIGIN))
    await press('m:settings')
    expect(sent.at(-1)!.text.startsWith(NOTIFY_TEXT.uz.settingsTitle)).toBe(true)
    await press('m:help')
    expect(sent.at(-1)!.text).toBe(helpText('uz', ORIGIN))
    await press('m:nothing')
    expect(answers()).toHaveLength(4)
  })
})

describe('/sozlamalar', () => {
  it('shows the three switches (security on by default) and edits the message in place', async () => {
    await parent()
    await say('/sozlamalar')
    expect(sent.at(-1)!.text.split('\n')).toEqual([
      NOTIFY_TEXT.uz.settingsTitle,
      `${NOTIFY_TEXT.uz.weeklyName}: ${NOTIFY_TEXT.uz.stateOn}`,
      `${NOTIFY_TEXT.uz.eventsName}: ${NOTIFY_TEXT.uz.stateOff}`,
      `${NOTIFY_TEXT.uz.securityName}: ${NOTIFY_TEXT.uz.stateOn}`,
    ])
    const buttons = (
      sent.at(-1)!.extra.reply_markup as { inline_keyboard: { callback_data: string }[][] }
    ).inline_keyboard
      .flat()
      .map((b) => b.callback_data)
    expect(buttons).toEqual(['s:weekly:0', 's:events:1', 's:security:0'])

    await press('s:events:1', 500, 500, 77)
    expect(Number((await prefs()).events)).toBe(1)
    const edit = api.find((c) => c.method === 'editMessageText')!
    expect(edit.body).toMatchObject({ chat_id: '500', message_id: 77 })
    expect(String(edit.body.text)).toContain(
      `${NOTIFY_TEXT.uz.eventsName}: ${NOTIFY_TEXT.uz.stateOn}`,
    )
    expect(answers().at(-1)!.body.text).toBe(NOTIFY_TEXT.uz.saved)

    // the same button again: the same state, no error (the button sets, it does not toggle)
    await press('s:events:1', 500, 500, 77)
    expect(Number((await prefs()).events)).toBe(1)
    await press('s:weekly:0')
    await press('s:security:0')
    const after = await prefs()
    expect([Number(after.weekly), Number(after.security)]).toEqual([0, 0])
    await press('s:security:1')
    expect(Number((await prefs()).security)).toBe(1)
    expect(answers()).toHaveLength(5)
  })

  it('another Telegram user or a group cannot change anything', async () => {
    await parent()
    const before = await prefs()
    await press('s:weekly:0', 500, 501) // someone else pressing in the parent's chat
    await press('s:weekly:0', -100500, 500) // the parent's id, but in a group
    await press('s:weekly:0', 501, 501) // a stranger's own chat
    expect(await prefs()).toEqual(before)
    expect(api.some((c) => c.method === 'editMessageText')).toBe(false)
    expect(answers().map((a) => a.body.text)).toEqual([
      NOTIFY_TEXT.uz.notAllowed,
      NOTIFY_TEXT.uz.notAllowed,
      NOTIFY_TEXT.uz.notLinked,
    ])
  })

  it('bad button data changes nothing', async () => {
    await parent()
    const before = await prefs()
    for (const data of ['s:chat_id:1', 's:weekly:2', 's:weekly = 0; --:1', 's', ''])
      await press(data)
    expect(await prefs()).toEqual(before)
  })
})

describe('/fikr', () => {
  it('saves the next message (up to 1000 characters), thanks, 3 an hour, never logs the text', async () => {
    const logs = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const info = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    await parent()
    const saved = async () =>
      (await db().execute("SELECT text, language FROM feedback WHERE user_id = 'p1'")).rows
    await say('/fikr')
    expect(sent.at(-1)!.text).toBe(NOTIFY_TEXT.uz.feedbackAsk)
    await say('x'.repeat(FEEDBACK_MAX + 1))
    expect(sent.at(-1)!.text).toBe(NOTIFY_TEXT.uz.feedbackTooLong)
    expect(await saved()).toHaveLength(0)
    // still waiting: a text that fits is taken
    await say('Harflar o‘yini juda qiziq')
    expect(sent.at(-1)!.text).toBe(NOTIFY_TEXT.uz.feedbackThanks)
    expect((await saved()).map((r) => r.text)).toEqual(['Harflar o‘yini juda qiziq'])
    // the waiting ended: the next text is just help
    await say('yana bir gap')
    expect(sent.at(-1)!.text).toBe(helpText('uz', ORIGIN))
    for (const text of ['ikkinchi', 'uchinchi']) {
      await say('/fikr')
      await say(text)
    }
    expect(await saved()).toHaveLength(3)
    await say('/fikr')
    await say('to‘rtinchi')
    expect(sent.at(-1)!.text).toBe(NOTIFY_TEXT.uz.feedbackTooMany)
    expect(await saved()).toHaveLength(3)
    const logged = [...logs.mock.calls, ...info.mock.calls].flat().join(' ')
    expect(logged).not.toMatch(/qiziq|ikkinchi|uchinchi|to‘rtinchi/)
  })

  it('a command cancels the waiting; it ends by itself after 10 minutes', async () => {
    await parent()
    await say('/fikr')
    await say('/menu')
    await say('bu fikr emas')
    expect(sent.at(-1)!.text).toBe(helpText('uz', ORIGIN))
    await say('/fikr')
    vi.setSystemTime(new Date(Date.now() + 10 * 60_000 + 1))
    await say('kech qoldi')
    expect(sent.at(-1)!.text).toBe(helpText('uz', ORIGIN))
    expect((await db().execute('SELECT COUNT(*) AS n FROM feedback')).rows[0]!.n).toBe(0)
  })

  it('tells the admin chat, if one is set, without the text; a stranger cannot leave feedback', async () => {
    process.env.ADMIN_TELEGRAM_CHAT_ID = '-1009'
    await parent()
    await say('/fikr')
    await say('Maxfiy fikr matni')
    const notice = sent.find((m) => m.chat === '-1009')!
    expect(notice.text).toBe('📝 Kiddo: yangi fikr (uz, 17 belgi).')
    expect(notice.text).not.toContain('Maxfiy')
    await say('/fikr', 900)
    expect(sent.at(-1)!.text).toBe(NOTIFY_TEXT.uz.notLinked)
    await say('begona fikr', 900)
    expect((await db().execute('SELECT COUNT(*) AS n FROM feedback')).rows[0]!.n).toBe(1)
  })
})

describe('"this was not me"', () => {
  const CHROME =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
  const SAFARI =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
  const signIn = async (ua: string) => {
    const { startSession } = await import('./session.js')
    await startSession(new Request(`${ORIGIN}/api/x`, { headers: { 'user-agent': ua } }), 'p1')
  }
  const sessions = async () =>
    Number(
      (await db().execute("SELECT COUNT(*) AS n FROM sessions WHERE user_id = 'p1'")).rows[0]!.n,
    )

  /** A parent signed in on two devices; the second one's message carries the button. */
  async function alerted() {
    await parent() // makeUser opens one session (no user agent)
    await signIn(CHROME)
    sent.length = 0
    await signIn(SAFARI)
    const message = sent.at(-1)!
    const button = (
      message.extra.reply_markup as { inline_keyboard: { callback_data: string }[][] }
    ).inline_keyboard[0]![0]!
    return { message, data: button.callback_data }
  }

  it('the new-device message has the button; pressed in the parent’s chat it signs every device out, once', async () => {
    const { message, data } = await alerted()
    expect(message.text).toContain('Safari, iOS')
    expect(data).toMatch(/^nm:[0-9a-f]{32}$/)
    expect(await sessions()).toBe(3)
    await press(data, 500, 500, 42)
    expect(await sessions()).toBe(0)
    expect(sent.at(-1)!.text).toBe(NOTIFY_TEXT.uz.notMeDone)
    expect(api.find((c) => c.method === 'editMessageReplyMarkup')!.body).toMatchObject({
      chat_id: '500',
      message_id: 42,
      reply_markup: { inline_keyboard: [] },
    })
    // pressed again (or a new session after it): nothing happens, a clear answer
    await signIn(CHROME)
    sent.length = 0
    await press(data)
    expect(await sessions()).toBe(1)
    expect(answers().at(-1)!.body.text).toBe(NOTIFY_TEXT.uz.notMeStale)
    expect(sent).toHaveLength(0)
  })

  it('a session cookie stops working after it', async () => {
    const cookie = await parent()
    expect((await call('GET', 'notify/settings', { cookie })).status).toBe(200)
    await signIn(CHROME)
    await signIn(SAFARI)
    const data = (
      sent.at(-1)!.extra.reply_markup as { inline_keyboard: { callback_data: string }[][] }
    ).inline_keyboard[0]![0]!.callback_data
    await press(data)
    expect((await call('GET', 'notify/settings', { cookie })).status).toBe(401)
  })

  it('another user, a group, another linked parent or an old message cannot use it', async () => {
    const { data } = await alerted()
    await parent('p2', '600')
    await press(data, 500, 501) // someone else in the parent's chat
    await press(data, -100500, 500) // a group
    await press(data, 600, 600) // another parent's own chat
    await press('nm:not-an-id')
    expect(await sessions()).toBe(3)
    vi.setSystemTime(new Date(Date.now() + ALERT_MS + 1))
    await press(data)
    expect(await sessions()).toBe(3)
    expect(sent.some((m) => m.text === NOTIFY_TEXT.uz.notMeDone)).toBe(false)
  })

  it('no message (and no button) while security messages are off', async () => {
    await parent()
    await press('s:security:0')
    await signIn(CHROME)
    sent.length = 0
    await signIn(SAFARI)
    expect(sent).toHaveLength(0)
    expect((await db().execute('SELECT COUNT(*) AS n FROM device_alerts')).rows[0]!.n).toBe(0)
  })

  it('/stop turns security messages off too; /start turns them back on', async () => {
    await parent()
    await say('/stop')
    expect(Number((await prefs()).security)).toBe(0)
    await say('/start')
    expect(Number((await prefs()).security)).toBe(1)
  })
})

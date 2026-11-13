import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from './db.js'
import {
  deviceType,
  NOTIFY_TEXT,
  reportText,
  reportWeek,
  tashkentDay,
  usePauseForTests,
  weekFacts,
  weekStart,
} from './notify.js'
import { TelegramError, useBotForTests, webhookSecret } from './telegram.js'
import { call, freshDb, makeUser } from './testHelpers.js'

const bot: { chat: string; text: string; extra: Record<string, unknown> }[] = []
let failNext: TelegramError[] = []
const pauses: number[] = []
const CRON = 'cron-secret-for-tests'
// Sunday 15:00 UTC = 20:00 in Tashkent, the weekly report's time
const SUNDAY_EVENING = new Date('2026-11-15T15:00:00Z')

beforeEach(async () => {
  await freshDb()
  bot.length = 0
  failNext = []
  pauses.length = 0
  Object.assign(process.env, {
    TELEGRAM_BOT_TOKEN: 'bot-token',
    TELEGRAM_BOT_USERNAME: 'kiddo_test_bot',
    TELEGRAM_WEBHOOK_SECRET: 'webhook-secret-for-tests_123',
    CRON_SECRET: CRON,
  })
  useBotForTests(async (chat, text, extra = {}) => {
    const failure = failNext.shift()
    if (failure) throw failure
    bot.push({ chat, text, extra })
  })
  usePauseForTests(async (ms) => void pauses.push(ms))
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(SUNDAY_EVENING)
})
afterEach(() => vi.useRealTimers())

const cron = (which: 'weekly' | 'daily', secret: string | null = CRON) =>
  call('GET', `cron/${which}`, {
    origin: null,
    headers: secret === null ? {} : { authorization: `Bearer ${secret}` },
  })
const hook = (text: string, chat = 500, from = 500) =>
  call('POST', 'telegram/webhook', {
    body: { message: { chat: { id: chat }, from: { id: from, language_code: 'uz' }, text } },
    origin: null,
    headers: { 'x-telegram-bot-api-secret-token': webhookSecret() },
  })

/** A parent with a linked chat (500) and the given settings. */
async function parent(
  id: string,
  { weekly = true, events = false, language = 'uz', chat = '500' as string | null } = {},
) {
  const cookie = await makeUser(id)
  await db().execute({
    sql: `INSERT INTO notification_prefs (user_id, chat_id, weekly, events, language, updated_at) VALUES (?, ?, ?, ?, ?, 0)`,
    args: [id, chat, weekly ? 1 : 0, events ? 1 : 0, language],
  })
  return cookie
}

/** The app's synced state for one child (the shapes of familyStore and progressStore). */
async function childState(
  userId: string,
  progress: Record<string, unknown>,
  name: string | null = 'Ali',
) {
  const family = { state: { children: [{ id: 'c1', name }], activeChildId: 'c1' }, version: 0 }
  for (const [key, data] of [
    ['family', family],
    ['progress', { state: { byChild: { c1: progress } }, version: 0 }],
  ] as const) {
    await db().execute({
      sql: 'INSERT INTO user_state (user_id, key, rev, data, updated_at) VALUES (?, ?, 1, ?, 0)',
      args: [userId, key, JSON.stringify(data)],
    })
  }
}

const played = (at: string, letterIds: string[] = ['a', 'sh']) => ({
  id: at,
  type: 'trace',
  language: 'uz',
  letterIds,
  mistakes: 0,
  mistakeDetails: [],
  coins: 1,
  stars: 3,
  stickerId: null,
  day: at.slice(0, 10),
  finishedAt: at,
})

describe('the cron endpoints', () => {
  it('answer 401 without the secret or with a wrong one, and work with the right one', async () => {
    for (const which of ['weekly', 'daily'] as const) {
      expect((await cron(which, null)).status).toBe(401)
      expect((await cron(which, 'wrong')).status).toBe(401)
      expect((await cron(which, `${CRON}x`)).status).toBe(401)
      expect((await cron(which)).status).toBe(200)
    }
    const plain = await call('GET', 'cron/weekly', {
      origin: null,
      headers: { authorization: CRON },
    })
    expect(plain.status).toBe(401)
  })

  it('are closed (503) while CRON_SECRET is not set', async () => {
    delete process.env.CRON_SECRET
    expect((await cron('weekly', 'anything')).status).toBe(503)
  })
})

describe('the weekly report', () => {
  it('goes once a week per parent, even if the cron runs again', async () => {
    await parent('p1')
    await childState('p1', {
      results: [played('2026-11-12T10:00:00Z')],
      minutesByDay: { '2026-11-12': 14 },
    })
    expect(await (await cron('weekly')).json()).toMatchObject({ sent: 1, week: '2026-11-09' })
    expect((await (await cron('weekly')).json()) as object).toMatchObject({ sent: 0 })
    expect(bot).toHaveLength(1)
    expect(bot[0]!.chat).toBe('500')
    expect(bot[0]!.text).toContain('Ali')
    expect(bot[0]!.text).toContain('14')
    expect(bot[0]!.text).toContain('A, Sh')
    // the next Sunday is a new week
    vi.setSystemTime(new Date('2026-11-22T15:30:00Z'))
    await cron('weekly')
    expect(bot).toHaveLength(2)
  })

  it('sends nothing to a parent who did not turn it on (the default)', async () => {
    await parent('p1', { weekly: false })
    await makeUser('p2') // no settings row at all
    await cron('weekly')
    expect(bot).toHaveLength(0)
  })

  it('sends nothing after /stop; /start turns it back on', async () => {
    await parent('p1', { events: true })
    await hook('/stop')
    expect(bot.at(-1)!.text).toBe(NOTIFY_TEXT.uz.stopped)
    const row = (
      await db().execute("SELECT weekly, events FROM notification_prefs WHERE user_id = 'p1'")
    ).rows[0]!
    expect([Number(row.weekly), Number(row.events)]).toEqual([0, 0])
    bot.length = 0
    await cron('weekly')
    await cron('daily')
    expect(bot).toHaveLength(0)
    await hook('/start')
    expect(bot.at(-1)!.text).toBe(NOTIFY_TEXT.uz.started)
    await cron('weekly')
    expect(bot.at(-1)!.text).toContain(NOTIFY_TEXT.uz.title)
  })

  it('a blocked bot (403) or a lost chat turns notifications off, without a retry', async () => {
    await parent('p1')
    await parent('p2', { chat: '501' })
    failNext = [new TelegramError(403, 'Forbidden: bot was blocked by the user')]
    const result = (await (await cron('weekly')).json()) as Record<string, number>
    expect(result).toMatchObject({ sent: 1, blocked: 1 })
    expect(bot).toHaveLength(1) // the other parent still got theirs
    const off = await db().execute('SELECT user_id FROM notification_prefs WHERE weekly = 0')
    expect(off.rows.map((r) => r.user_id)).toHaveLength(1)
    // "chat not found" is the same
    await db().execute('UPDATE notification_prefs SET weekly = 0')
    await parent('p3', { chat: '502' })
    failNext = [new TelegramError(400, 'Bad Request: chat not found')]
    vi.setSystemTime(new Date('2026-11-22T15:00:00Z'))
    await cron('weekly')
    const p3 = (await db().execute("SELECT weekly FROM notification_prefs WHERE user_id = 'p3'"))
      .rows[0]!
    expect(Number(p3.weekly)).toBe(0)
  })

  it('429 waits retry_after once; another failure leaves the week to try again', async () => {
    await parent('p1')
    failNext = [new TelegramError(429, 'Too Many Requests', 2)]
    await cron('weekly')
    expect(pauses).toContain(2000)
    expect(bot).toHaveLength(1)
    // a long retry_after stops the batch and gives the claim back
    await parent('p2', { chat: '501' })
    vi.setSystemTime(new Date('2026-11-22T15:00:00Z'))
    failNext = [new TelegramError(429, 'Too Many Requests', 60)]
    const result = (await (await cron('weekly')).json()) as Record<string, number>
    expect(result.failed).toBe(1)
    const unclaimed = await db().execute(
      "SELECT user_id FROM notification_prefs WHERE last_report_week IS NULL OR last_report_week <> '2026-11-16'",
    )
    expect(unclaimed.rows.length).toBeGreaterThan(0)
  })

  it('keeps ~20 messages a second when sending to many parents', async () => {
    for (let i = 0; i < 5; i += 1) await parent(`p${i}`, { chat: String(600 + i) })
    await cron('weekly')
    expect(bot).toHaveLength(5)
    expect(pauses.filter((ms) => ms === 50)).toHaveLength(5)
  })

  it('is written in the language the parent chose with /til', async () => {
    await parent('p1')
    await childState('p1', { results: [played('2026-11-12T10:00:00Z', ['zh'])] })
    await hook('/til')
    expect(bot.at(-1)!.extra.reply_markup).toMatchObject({
      keyboard: [[{ text: 'O‘zbekcha' }, { text: 'Русский' }, { text: 'English' }]],
    })
    await hook('Русский')
    expect(bot.at(-1)!.text).toBe(NOTIFY_TEXT.ru.languageSet)
    await cron('weekly')
    expect(bot.at(-1)!.text).toContain(NOTIFY_TEXT.ru.title)
  })

  it('/hisobot sends the latest report now, at most twice an hour', async () => {
    await parent('p1')
    await hook('/hisobot')
    await hook('/hisobot')
    expect(bot.filter((m) => m.text.startsWith(NOTIFY_TEXT.uz.title))).toHaveLength(2)
    await hook('/hisobot')
    expect(bot.at(-1)!.text).toBe(NOTIFY_TEXT.uz.tooOften)
    // anything else from a linked parent: a short help
    await hook('salom')
    expect(bot.at(-1)!.text).toBe(NOTIFY_TEXT.uz.help)
  })
})

describe('the report text', () => {
  // grades, scores, ranks and comparisons never reach a parent, in any language
  const FORBIDDEN = [
    'yomon',
    'zaif',
    'orqada',
    'yaxshi natija',
    'ball',
    'reyting',
    'eng yaxshi',
    'boshqa bola',
    'плохо',
    'слаб',
    'отста',
    'хороший результат',
    'балл',
    'рейтинг',
    'лучш',
    'других дет',
    'bad',
    'weak',
    'behind',
    'good result',
    'score',
    'rank',
    'best',
    'other kids',
    'other children',
  ]
  const facts = { activities: 4, minutes: 23, letters: ['A', 'B'], practice: ['Sh'] }
  const empty = { activities: 0, minutes: 0, letters: [], practice: [] }

  it('has no grading or comparing words (active and quiet weeks, every language)', () => {
    for (const lang of ['uz', 'ru', 'en'] as const) {
      for (const week of [facts, empty]) {
        for (const names of [
          { parent: 'Dilnoza', child: 'Ali' },
          { parent: null, child: null },
        ]) {
          const text = reportText(lang, names, week).toLowerCase()
          for (const word of FORBIDDEN) expect(text, `${lang}: ${word}`).not.toContain(word)
        }
      }
      const events = [NOTIFY_TEXT[lang].stage, NOTIFY_TEXT[lang].quiet].join(' ').toLowerCase()
      for (const word of FORBIDDEN) expect(events, `${lang}: ${word}`).not.toContain(word)
    }
  })

  it('names the parent and the child when known; a quiet week is short and kind', () => {
    const text = reportText('uz', { parent: 'Dilnoza', child: 'Ali' }, facts)
    expect(text).toContain('Dilnoza')
    expect(text).toContain('Ali')
    expect(text).toContain('23')
    expect(text).toContain('A, B')
    expect(text).toContain('Sh')
    const quiet = reportText('uz', { parent: null, child: 'Ali' }, empty)
    expect(quiet.split('\n')).toHaveLength(3)
    expect(quiet).toContain(NOTIFY_TEXT.uz.empty)
  })
})

describe('Asia/Tashkent time', () => {
  it('a week runs from Monday 00:00 Tashkent (Sunday 19:00 UTC)', () => {
    const monday = Date.parse('2026-11-08T19:00:00Z') // Monday 9 Nov 00:00 in Tashkent
    expect(weekStart(monday)).toBe(monday)
    expect(weekStart(monday - 1)).toBe(monday - 7 * 86_400_000)
    expect(weekStart(Date.parse('2026-11-15T18:59:59Z'))).toBe(monday) // Sunday 23:59:59 Tashkent
    expect(weekStart(Date.parse('2026-11-15T19:00:00Z'))).toBe(monday + 7 * 86_400_000)
    expect(tashkentDay(Date.parse('2026-11-15T19:00:00Z'))).toBe('2026-11-16')
  })

  it('an activity at Sunday 23:59 Tashkent counts in that week, at Monday 00:00 in the next', () => {
    const start = Date.parse('2026-11-08T19:00:00Z')
    const progress = {
      results: [
        played('2026-11-15T18:59:00Z'),
        played('2026-11-15T19:00:00Z'),
        played('2026-11-08T18:59:00Z'),
      ],
      minutesByDay: { '2026-11-15': 10, '2026-11-16': 99, '2026-11-08': 99 },
    }
    expect(weekFacts(progress, start)).toMatchObject({ activities: 1, minutes: 10 })
  })

  it('the report is "out" from Sunday 19:00 Tashkent: before it, the week before is reported', () => {
    const thisWeek = Date.parse('2026-11-08T19:00:00Z')
    expect(reportWeek(Date.parse('2026-11-15T14:00:00Z'))).toBe(thisWeek) // Sunday 19:00
    expect(reportWeek(Date.parse('2026-11-15T13:59:00Z'))).toBe(thisWeek - 7 * 86_400_000)
    expect(reportWeek(Date.parse('2026-11-16T05:00:00Z'))).toBe(thisWeek) // Monday morning
  })
})

describe('events', () => {
  it('a new stage once, at most one event message a day, a quiet-days note once a week', async () => {
    await parent('p1', { weekly: false, events: true })
    const learned = (count: number) => ({ uz: 'abdefghijklmnop'.slice(0, count).split('') })
    await childState('p1', { learned: learned(4), results: [played('2026-11-15T08:00:00Z')] })
    // the first look notes the stage, says nothing
    await cron('daily')
    expect(bot).toHaveLength(0)
    await db().execute({
      sql: "UPDATE user_state SET data = ? WHERE user_id = 'p1' AND key = 'progress'",
      args: [
        JSON.stringify({
          state: {
            byChild: { c1: { learned: learned(5), results: [played('2026-11-11T08:00:00Z')] } },
          },
        }),
      ],
    })
    await cron('daily')
    expect(bot).toHaveLength(1)
    expect(bot[0]!.text).toContain('Ali')
    expect(bot[0]!.text).toContain('5')
    // the same day: no second event (the quiet note waits)
    await cron('daily')
    expect(bot).toHaveLength(1)
    vi.setSystemTime(new Date('2026-11-16T15:00:00Z'))
    await cron('daily')
    expect(bot).toHaveLength(2)
    expect(bot[1]!.text).toContain('bir necha kundan beri')
    // the quiet note is weekly at most
    vi.setSystemTime(new Date('2026-11-17T15:00:00Z'))
    await cron('daily')
    expect(bot).toHaveLength(2)
  })

  it('events stay silent unless turned on separately', async () => {
    await parent('p1', { weekly: true, events: false })
    await childState('p1', { results: [played('2026-11-01T08:00:00Z')] })
    await cron('daily')
    expect(bot).toHaveLength(0)
  })
})

describe('turning it on and linking a chat', () => {
  it('is off by default; a Telegram sign-in’s chat links itself when turned on', async () => {
    const cookie = await makeUser('p1')
    await db().execute("UPDATE users SET telegram_id = '4242' WHERE id = 'p1'")
    const before = (await (await call('GET', 'notify/settings', { cookie })).json()) as Record<
      string,
      unknown
    >
    expect(before).toMatchObject({ weekly: false, events: false, linked: false, viaTelegram: true })
    const saved = await call('PUT', 'notify/settings', {
      cookie,
      body: { weekly: true, language: 'ru' },
    })
    expect(await saved.json()).toMatchObject({ weekly: true, linked: true, language: 'ru' })
    await cron('weekly')
    expect(bot[0]!.chat).toBe('4242')
    // turning off works any time
    await call('PUT', 'notify/settings', { cookie, body: { weekly: false } })
    vi.setSystemTime(new Date('2026-11-22T15:00:00Z'))
    await cron('weekly')
    expect(bot).toHaveLength(1)
  })

  it('needs a session and our own page', async () => {
    expect((await call('GET', 'notify/settings')).status).toBe(401)
    const cookie = await makeUser('p1')
    const foreign = await call('PUT', 'notify/settings', {
      cookie,
      body: { weekly: true },
      origin: 'https://evil.test',
    })
    expect(foreign.status).toBe(403)
  })

  it('Google/e-mail parents link with a one-time, short-lived link_ token', async () => {
    const cookie = await makeUser('p1')
    await call('PUT', 'notify/settings', { cookie, body: { weekly: true } })
    const { link } = (await (await call('POST', 'notify/link', { cookie })).json()) as {
      link: string
    }
    const payload = new URL(link).searchParams.get('start')!
    expect(link.startsWith('https://t.me/kiddo_test_bot?start=link_')).toBe(true)
    expect(payload.length).toBeLessThanOrEqual(64)
    await hook(`/start ${payload}`, 700, 700)
    expect(bot.at(-1)!.text).toBe(NOTIFY_TEXT.uz.linked)
    // the same link a second time does nothing
    await hook(`/start ${payload}`, 701, 701)
    expect(bot.at(-1)!.text).toBe(NOTIFY_TEXT.uz.linkExpired)
    await cron('weekly')
    expect(bot.at(-1)!.chat).toBe('700')
    // an old link has expired
    const second = (await (await call('POST', 'notify/link', { cookie })).json()) as {
      link: string
    }
    vi.setSystemTime(new Date(SUNDAY_EVENING.getTime() + 11 * 60_000))
    await hook(`/start ${new URL(second.link).searchParams.get('start')}`, 702, 702)
    expect(bot.at(-1)!.text).toBe(NOTIFY_TEXT.uz.linkExpired)
  })

  it('a link_ payload never reaches the sign-in flow; a bare /start from a stranger gets the sign-in help', async () => {
    await hook('/start link_aaaaaaaaaaaaaaaaaaaaaaaa')
    expect(bot.at(-1)!.text).toBe(NOTIFY_TEXT.uz.linkExpired)
    expect(bot.at(-1)!.extra.reply_markup).toBeUndefined()
    await hook('/start')
    expect(bot.at(-1)!.text).toContain('Telegram')
    await hook('/stop')
    expect(bot.at(-1)!.text).toBe(NOTIFY_TEXT.uz.notLinked)
  })

  it('a notification command from a chat that is not linked says how to turn them on (not the sign-in help)', async () => {
    const ru = (text: string) =>
      call('POST', 'telegram/webhook', {
        body: { message: { chat: { id: 900 }, from: { id: 900, language_code: 'ru' }, text } },
        origin: null,
        headers: { 'x-telegram-bot-api-secret-token': webhookSecret() },
      })
    for (const command of ['/hisobot', '/til', '/stop', '/hisobot@kiddo_test_bot']) {
      await ru(command)
      expect(bot.at(-1)!.text).toBe(NOTIFY_TEXT.ru.notLinked)
    }
    expect(bot).toHaveLength(4)
    // a parent whose notifications are off but who never linked gets the same, not a report
    await parent('p1', { weekly: false, chat: null })
    await db().execute("UPDATE users SET telegram_id = '900' WHERE id = 'p1'")
    await ru('/hisobot')
    expect(bot.at(-1)!.text).toBe(NOTIFY_TEXT.ru.notLinked)
  })

  it('a Telegram sign-in with notifications on but no chat yet is linked by its own private chat', async () => {
    await parent('p1', { chat: null })
    await db().execute("UPDATE users SET telegram_id = '500' WHERE id = 'p1'")
    await hook('/hisobot')
    expect(bot.at(-1)!.text.startsWith(NOTIFY_TEXT.uz.title)).toBe(true)
    const row = (await db().execute("SELECT chat_id FROM notification_prefs WHERE user_id = 'p1'"))
      .rows[0]!
    expect(row.chat_id).toBe('500')
    await hook('/til')
    expect(bot.at(-1)!.text).toBe(NOTIFY_TEXT.uz.chooseLanguage)
    await hook('/stop')
    expect(bot.at(-1)!.text).toBe(NOTIFY_TEXT.uz.stopped)
  })

  it('a group chat never links someone’s account by the sender', async () => {
    await parent('p1', { chat: null })
    await db().execute("UPDATE users SET telegram_id = '500' WHERE id = 'p1'")
    await hook('/hisobot', -100500, 500)
    expect(bot.at(-1)!.text).toBe(NOTIFY_TEXT.uz.notLinked)
    const row = (await db().execute("SELECT chat_id FROM notification_prefs WHERE user_id = 'p1'"))
      .rows[0]!
    expect(row.chat_id).toBeNull()
  })

  it('deleting the account deletes its notification settings and devices', async () => {
    const cookie = await parent('p1')
    expect((await call('POST', 'account/delete', { cookie })).status).toBe(200)
    for (const table of ['notification_prefs', 'user_devices']) {
      const left = await db().execute(`SELECT COUNT(*) AS n FROM ${table} WHERE user_id = 'p1'`)
      expect(Number(left.rows[0]!.n)).toBe(0)
    }
  })
})

describe('a sign-in from a new device', () => {
  const CHROME_WINDOWS =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
  const SAFARI_IPHONE =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
  const signIn = async (ua: string) => {
    const { startSession } = await import('./session.js')
    await startSession(
      new Request('https://kiddo.test/api/x', { headers: { 'user-agent': ua } }),
      'p1',
    )
  }

  it('knows the kind of browser and system only', () => {
    expect(deviceType(CHROME_WINDOWS)).toBe('Chrome, Windows')
    expect(deviceType(SAFARI_IPHONE)).toBe('Safari, iOS')
    expect(deviceType('')).toBe('Browser, unknown')
  })

  it('the first sign-in is not "new"; a new kind tells the parent with Tashkent time; IP and UA are never kept', async () => {
    await db().execute("INSERT INTO users (id, created_at, updated_at) VALUES ('p1', 0, 0)")
    await db().execute(
      "INSERT INTO notification_prefs (user_id, chat_id, weekly, language, updated_at) VALUES ('p1', '500', 1, 'uz', 0)",
    )
    await signIn(CHROME_WINDOWS)
    expect(bot).toHaveLength(0)
    await signIn(CHROME_WINDOWS)
    expect(bot).toHaveLength(0)
    await signIn(SAFARI_IPHONE)
    expect(bot).toHaveLength(1)
    expect(bot[0]!.text).toContain('Safari, iOS')
    expect(bot[0]!.text).toContain('2026-11-15 20:00')
    const devices = await db().execute("SELECT * FROM user_devices WHERE user_id = 'p1'")
    expect(devices.rows).toHaveLength(2)
    for (const row of devices.rows) {
      expect(String(row.device_hash)).toMatch(/^[0-9a-f]{16}$/)
      expect(JSON.stringify(row)).not.toMatch(/Mozilla|Safari|Windows/)
    }
  })

  it('says nothing while notifications are off', async () => {
    await db().execute("INSERT INTO users (id, created_at, updated_at) VALUES ('p1', 0, 0)")
    await signIn(CHROME_WINDOWS)
    await signIn(SAFARI_IPHONE)
    expect(bot).toHaveLength(0)
  })
})

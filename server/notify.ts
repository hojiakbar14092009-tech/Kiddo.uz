import { langOf, type Lang } from './auth.js'
import { randomToken, sameText, sha256 } from './crypto.js'
import { db } from './db.js'
import { botUsername, requireEnv } from './env.js'
import { HttpError, json, readJson } from './http.js'
import { LETTERS } from './letters.js'
import { memoryLimit, rateLimit } from './rateLimit.js'
import { requireSession } from './session.js'
import { botSend, TelegramError } from './telegram.js'

/*
 * The parents' Telegram notifications (stage 9). Off until the parent turns them on in the
 * parent area; a parent who signed in with Telegram is already in a chat with the bot (their
 * Telegram id is the chat id), anyone else links a chat once with t.me/<bot>?start=link_<token>.
 * Weekly report: Sunday 20:00 Tashkent (Vercel cron 0 15 * * 0 UTC). Events (a new stage, a
 * gentle nudge after 3 quiet days): a daily cron, at most one event message a day.
 * Only neutral facts reach a parent: no grades, scores, ranks or comparisons with other children.
 */

const HOUR = 3_600_000
const DAY = 24 * HOUR
/** Asia/Tashkent is UTC+5 all year (no daylight saving). */
const TASHKENT = 5 * HOUR
export const LINK_MS = 10 * 60_000
/** ~20 messages a second at most when sending to many parents (Telegram allows ~30). */
const GAP_MS = 50
/** The function may run 10 s (vercel.json); a batch stops in time and the rest waits. */
const BUDGET_MS = 7_000
/** A 3-day quiet spell gets one gentle note; a new stage every 5 letters learned. */
const QUIET_DAYS = 3
const STAGE_LETTERS = 5

// ---- time (Asia/Tashkent) ----

/** Monday 00:00 Tashkent of the week holding `at`, as a UTC timestamp. */
export function weekStart(at: number): number {
  const day = Math.floor((at + TASHKENT) / DAY) // 1970-01-01 was a Thursday
  return (day - ((day + 3) % 7)) * DAY - TASHKENT
}
/** The Tashkent calendar day of `at`, YYYY-MM-DD. */
export const tashkentDay = (at: number) => new Date(at + TASHKENT).toISOString().slice(0, 10)
const weekKey = (start: number) => tashkentDay(start)
/** The week of the latest report: it is "out" from Sunday 19:00 Tashkent (cron jitter ≤ 1 h). */
export const reportWeek = (now: number) => {
  const start = weekStart(now)
  return now >= start + 6 * DAY + 19 * HOUR ? start : start - 7 * DAY
}
const tashkentTime = (at: number) =>
  new Date(at + TASHKENT).toISOString().slice(0, 16).replace('T', ' ')

// ---- texts ----

type Text = Record<
  | 'title'
  | 'hello'
  | 'helloNamed'
  | 'week'
  | 'weekNamed'
  | 'activities'
  | 'minutes'
  | 'letters'
  | 'practice'
  | 'closing'
  | 'empty'
  | 'stage'
  | 'quiet'
  | 'yourChild'
  | 'linked'
  | 'linkExpired'
  | 'stopped'
  | 'started'
  | 'off'
  | 'help'
  | 'tooOften'
  | 'chooseLanguage'
  | 'languageSet'
  | 'device'
  | 'notLinked',
  string
>

export const NOTIFY_TEXT: Record<Lang, Text> = {
  uz: {
    title: '📒 Kiddo: haftalik hisobot',
    hello: 'Assalomu alaykum!',
    helloNamed: 'Assalomu alaykum, {parent}!',
    week: 'Bu hafta Kiddo’da:',
    weekNamed: '{child} bu hafta Kiddo’da:',
    activities: '• Bajarilgan mashg‘ulotlar: {count}',
    minutes: '• O‘yin vaqti: {minutes} daqiqa',
    letters: '• Mashq qilingan harflar: {list}',
    practice: '• Yana takrorlash foydali: {list}',
    closing: 'Birga o‘rganishda davom eting! 🌱',
    empty: 'Bu hafta Kiddo’da mashg‘ulot bo‘lmadi. Qulay paytda birga 10 daqiqa o‘ynab ko‘ring 🌱',
    stage: '🎉 {child} yangi bosqichga chiqdi: {count} ta harf o‘rganildi!',
    quiet:
      '🌱 {child} bir necha kundan beri Kiddo’ga kirmadi. Qulay paytda birga 10 daqiqa o‘ynab ko‘ring.',
    yourChild: 'Farzandingiz',
    linked:
      'Tayyor! Kiddo xabarnomalari shu chatga ulandi. Haftalik hisobot yakshanba kuni 20:00 da keladi.\n/hisobot — oxirgi hisobot, /til — til, /stop — o‘chirish',
    linkExpired:
      'Bu ulash havolasi eskirgan yoki ishlatilgan. Kiddo sozlamalaridan yangisini oling.',
    stopped: 'Barcha Kiddo xabarnomalari o‘chirildi. Qayta yoqish uchun /start bosing.',
    started: 'Kiddo xabarnomalari qayta yoqildi. Haftalik hisobot yakshanba kuni 20:00 da keladi.',
    off: 'Xabarnomalar o‘chiq. Yoqish uchun /start bosing.',
    help: 'Kiddo buyruqlari:\n/hisobot — oxirgi haftalik hisobot\n/til — xabarlar tili\n/stop — xabarlarni o‘chirish\n/start — qayta yoqish',
    tooOften: 'Hisobotni soatiga 2 martagacha so‘rash mumkin. Birozdan keyin urinib ko‘ring.',
    chooseLanguage: 'Xabarlar tilini tanlang:',
    languageSet: 'Endi xabarlar o‘zbek tilida keladi.',
    notLinked:
      'Bu chat Kiddo xabarnomalariga hali ulanmagan. Avval saytda Ota-ona bo‘limi → Sozlamalar → «Telegram xabarnomalari»ni yoqing, keyin /hisobot, /til va /stop ishlaydi.',
    device:
      '🔐 Kiddo hisobingizga yangi qurilmadan kirildi: {device}, {time} (Toshkent vaqti). Bu siz bo‘lmasangiz, Google akkauntingiz yoki pochtangizni tekshiring va Kiddo’da hisobdan chiqing.',
  },
  ru: {
    title: '📒 Kiddo: недельный отчёт',
    hello: 'Здравствуйте!',
    helloNamed: 'Здравствуйте, {parent}!',
    week: 'На этой неделе в Kiddo:',
    weekNamed: '{child} на этой неделе в Kiddo:',
    activities: '• Выполнено занятий: {count}',
    minutes: '• Время в игре: {minutes} мин',
    letters: '• Буквы, которые повторяли: {list}',
    practice: '• Полезно повторить ещё: {list}',
    closing: 'Учитесь вместе и дальше! 🌱',
    empty:
      'На этой неделе занятий в Kiddo не было. Найдите удобную минуту поиграть вместе 10 минут 🌱',
    stage: '🎉 {child} перешёл(ла) на новый этап: выучено букв — {count}!',
    quiet:
      '🌱 {child} несколько дней не заходил(а) в Kiddo. В удобный момент поиграйте вместе 10 минут.',
    yourChild: 'Ваш ребёнок',
    linked:
      'Готово! Уведомления Kiddo подключены к этому чату. Недельный отчёт приходит в воскресенье в 20:00.\n/hisobot — последний отчёт, /til — язык, /stop — отключить',
    linkExpired: 'Ссылка устарела или уже использована. Получите новую в настройках Kiddo.',
    stopped: 'Все уведомления Kiddo отключены. Чтобы включить снова, нажмите /start.',
    started: 'Уведомления Kiddo снова включены. Недельный отчёт приходит в воскресенье в 20:00.',
    off: 'Уведомления отключены. Чтобы включить, нажмите /start.',
    help: 'Команды Kiddo:\n/hisobot — последний недельный отчёт\n/til — язык сообщений\n/stop — отключить сообщения\n/start — включить снова',
    tooOften: 'Отчёт можно запросить не чаще 2 раз в час. Попробуйте немного позже.',
    chooseLanguage: 'Выберите язык сообщений:',
    languageSet: 'Теперь сообщения будут на русском.',
    notLinked:
      'Этот чат ещё не подключён к уведомлениям Kiddo. Сначала включите на сайте «Уведомления в Telegram» (Родительский раздел → Настройки), после этого заработают /hisobot, /til и /stop.',
    device:
      '🔐 Вход в ваш аккаунт Kiddo с нового устройства: {device}, {time} (время Ташкента). Если это были не вы, проверьте свой Google-аккаунт или почту и выйдите из Kiddo.',
  },
  en: {
    title: '📒 Kiddo: weekly report',
    hello: 'Hello!',
    helloNamed: 'Hello, {parent}!',
    week: 'This week in Kiddo:',
    weekNamed: '{child} this week in Kiddo:',
    activities: '• Activities finished: {count}',
    minutes: '• Time playing: {minutes} min',
    letters: '• Letters practised: {list}',
    practice: '• Worth practising again: {list}',
    closing: 'Keep learning together! 🌱',
    empty:
      'There were no Kiddo activities this week. Try 10 minutes of play together when it suits you 🌱',
    stage: '🎉 {child} reached a new stage: {count} letters learned!',
    quiet:
      '🌱 {child} has not opened Kiddo for a few days. Try 10 minutes of play together when it suits you.',
    yourChild: 'Your child',
    linked:
      'Done! Kiddo notifications are linked to this chat. The weekly report comes on Sunday at 20:00.\n/hisobot — the latest report, /til — language, /stop — turn off',
    linkExpired: 'This link has expired or was already used. Get a new one in Kiddo’s settings.',
    stopped: 'All Kiddo notifications are off. Tap /start to turn them on again.',
    started: 'Kiddo notifications are on again. The weekly report comes on Sunday at 20:00.',
    off: 'Notifications are off. Tap /start to turn them on.',
    help: 'Kiddo commands:\n/hisobot — the latest weekly report\n/til — message language\n/stop — turn messages off\n/start — turn them on again',
    tooOften: 'The report can be asked for up to 2 times an hour. Please try a little later.',
    chooseLanguage: 'Choose the language of the messages:',
    languageSet: 'Messages will now come in English.',
    notLinked:
      'This chat is not linked to Kiddo notifications yet. First turn on “Telegram notifications” on the website (Parent area → Settings); then /hisobot, /til and /stop will work.',
    device:
      '🔐 Someone signed in to your Kiddo account from a new device: {device}, {time} (Tashkent time). If it was not you, check your Google account or e-mail and sign out of Kiddo.',
  },
}

/** The /til buttons: what a parent taps is the text the bot receives. */
export const LANGUAGE_BUTTONS: Record<Lang, string> = {
  uz: 'O‘zbekcha',
  ru: 'Русский',
  en: 'English',
}

const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''))

// ---- what the account holds (user_state, synced by the app) ----

interface Result {
  language?: string
  letterIds?: string[]
  finishedAt?: string
}
interface Progress {
  results?: Result[]
  minutesByDay?: Record<string, number>
  learned?: Record<string, string[]>
  struggles?: Record<string, Record<string, number>>
}
interface Child {
  name: string | null
  progress: Progress
}

const parse = (raw: unknown): Record<string, unknown> => {
  try {
    const value = JSON.parse(String(raw)) as { state?: unknown }
    return value && typeof value.state === 'object' && value.state
      ? (value.state as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

/** The child the parent last chose (one child for now), with their progress; read, never kept. */
async function childOf(userId: string): Promise<Child> {
  const rows = await db().execute({
    sql: `SELECT key, data FROM user_state WHERE user_id = ? AND key IN ('family', 'progress')`,
    args: [userId],
  })
  const state = Object.fromEntries(rows.rows.map((row) => [String(row.key), parse(row.data)]))
  const children = Array.isArray(state.family?.children)
    ? (state.family.children as { id?: unknown; name?: unknown }[])
    : []
  const child = children.find((c) => c.id === state.family?.activeChildId) ?? children[0]
  const byChild = (state.progress?.byChild ?? {}) as Record<string, Progress>
  const name = typeof child?.name === 'string' ? child.name.trim().split(/\s+/)[0] || null : null
  return { name, progress: (child && typeof child.id === 'string' && byChild[child.id]) || {} }
}

const letterName = (language: string, id: string) =>
  LETTERS[language as Lang]?.[id] ?? id.toUpperCase()

export interface WeekFacts {
  activities: number
  minutes: number
  letters: string[]
  practice: string[]
}

/** Facts about one Tashkent week (Monday 00:00 to the next Monday): counts and letters only. */
export function weekFacts(progress: Progress, start: number): WeekFacts {
  const end = start + 7 * DAY
  const results = (Array.isArray(progress.results) ? progress.results : []).filter((r) => {
    const at = Date.parse(String(r?.finishedAt))
    return at >= start && at < end
  })
  const days = new Set(Array.from({ length: 7 }, (_, i) => tashkentDay(start + i * DAY)))
  const minutes = Object.entries(progress.minutesByDay ?? {})
    .filter(([day]) => days.has(day))
    .reduce((sum, [, value]) => sum + (Number(value) || 0), 0)
  const letters = new Set<string>()
  for (const r of results)
    for (const id of Array.isArray(r.letterIds) ? r.letterIds : [])
      letters.add(letterName(String(r.language), String(id)))
  const practice = Object.entries(progress.struggles ?? {})
    .flatMap(([language, counts]) =>
      Object.entries(counts ?? {}).map(([id, count]) => ({
        name: letterName(language, id),
        count: Number(count) || 0,
      })),
    )
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
    .map((entry) => entry.name)
  return {
    activities: results.length,
    minutes: Math.round(minutes),
    letters: [...letters].slice(0, 8),
    practice,
  }
}

/** The weekly message: names when known, facts, nothing that grades or compares. */
export function reportText(
  lang: Lang,
  names: { parent: string | null; child: string | null },
  facts: WeekFacts,
): string {
  const t = NOTIFY_TEXT[lang]
  const lines = [t.title, names.parent ? fill(t.helloNamed, { parent: names.parent }) : t.hello]
  if (facts.activities === 0 && facts.minutes === 0) return [...lines, t.empty].join('\n')
  lines.push(names.child ? fill(t.weekNamed, { child: names.child }) : t.week)
  if (facts.activities > 0) lines.push(fill(t.activities, { count: facts.activities }))
  if (facts.minutes > 0) lines.push(fill(t.minutes, { minutes: facts.minutes }))
  if (facts.letters.length > 0) lines.push(fill(t.letters, { list: facts.letters.join(', ') }))
  if (facts.practice.length > 0) lines.push(fill(t.practice, { list: facts.practice.join(', ') }))
  return [...lines, t.closing].join('\n')
}

async function reportFor(userId: string, lang: Lang, start: number): Promise<string> {
  const [child, user] = await Promise.all([
    childOf(userId),
    db().execute({ sql: 'SELECT name FROM users WHERE id = ?', args: [userId] }),
  ])
  const parent = user.rows[0]?.name
    ? String(user.rows[0].name).trim().split(/\s+/)[0] || null
    : null
  return reportText(lang, { parent, child: child.name }, weekFacts(child.progress, start))
}

// ---- sending ----

/** Waits between messages; tests make it instant. */
export let pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
export function usePauseForTests(wait: typeof pause): void {
  pause = wait
}

type Outcome = 'sent' | 'blocked' | 'failed' | 'throttled'

/**
 * One message. A chat that blocked the bot (403) or is gone ("chat not found") turns the
 * parent's notifications off, never retried; 429 waits Telegram's retry_after once (≤ 5 s),
 * longer stops the batch. Logs carry codes only, never a chat id, token or text.
 */
async function deliver(
  userId: string,
  chatId: string,
  text: string,
  now: number,
): Promise<Outcome> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await botSend(chatId, text)
      return 'sent'
    } catch (error) {
      if (!(error instanceof TelegramError)) {
        console.error('[notify] send failed', 'network')
        return 'failed'
      }
      if (error.telegramStatus === 403 || /chat not found/i.test(error.description)) {
        await db().execute({
          sql: 'UPDATE notification_prefs SET weekly = 0, events = 0, updated_at = ? WHERE user_id = ?',
          args: [now, userId],
        })
        console.error('[notify] chat closed, notifications off', error.telegramStatus)
        return 'blocked'
      }
      if (error.telegramStatus === 429) {
        const wait = error.retryAfter ?? 1
        if (attempt === 0 && wait <= 5) {
          await pause(wait * 1000)
          continue
        }
        console.error('[notify] throttled', 429)
        return 'throttled'
      }
      console.error('[notify] send failed', error.telegramStatus)
      return 'failed'
    }
  }
}

/** Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; compared in constant time. */
function assertCron(request: Request): void {
  const secret = requireEnv('CRON_SECRET')
  const given = request.headers.get('authorization') ?? ''
  if (!given || !sameText(sha256(given), sha256(`Bearer ${secret}`)))
    throw new HttpError(401, 'bad_secret')
}

interface Row {
  user_id: string
  chat_id: string
  language: string
  [column: string]: unknown
}

/**
 * Sends to every row in turn: a claim first (a second run of the cron finds nothing to do),
 * the claim given back if the message did not go out, ~20 a second, within the time budget.
 */
async function sendAll(
  rows: Row[],
  claim: (row: Row) => Promise<boolean>,
  release: (row: Row) => Promise<void>,
  text: (row: Row) => Promise<string | null>,
  now: number,
) {
  const started = performance.now()
  const count = { sent: 0, blocked: 0, failed: 0, left: 0 }
  for (const [index, row] of rows.entries()) {
    // shortcut: what does not fit in one 10 s run waits for the next run; a queue when there are thousands
    if (performance.now() - started > BUDGET_MS) {
      count.left = rows.length - index
      break
    }
    try {
      if (!(await claim(row))) continue
      const message = await text(row)
      if (message === null) continue
      const outcome = await deliver(row.user_id, row.chat_id, message, now)
      if (outcome === 'sent') count.sent += 1
      else if (outcome === 'blocked') count.blocked += 1
      else {
        count.failed += 1
        await release(row)
        if (outcome === 'throttled') {
          count.left = rows.length - index - 1
          break
        }
      }
      await pause(GAP_MS)
    } catch (error) {
      // one parent's bad data never stops the others
      count.failed += 1
      console.error('[notify] row failed', error instanceof Error ? error.name : 'unknown')
    }
  }
  return count
}

const rowsOf = (result: { rows: unknown[] }) => result.rows as unknown as Row[]

/** Sunday 20:00 Tashkent: last week's report to each parent who asked for it, once a week. */
export async function weeklyCron(request: Request, now = Date.now()): Promise<Response> {
  assertCron(request)
  const start = reportWeek(now)
  const week = weekKey(start)
  const due = rowsOf(
    await db().execute({
      sql: `SELECT user_id, chat_id, language, last_report_week FROM notification_prefs
            WHERE weekly = 1 AND chat_id IS NOT NULL AND (last_report_week IS NULL OR last_report_week <> ?)
            LIMIT 1000`,
      args: [week],
    }),
  )
  const count = await sendAll(
    due,
    async (row) =>
      (
        await db().execute({
          sql: `UPDATE notification_prefs SET last_report_week = ? WHERE user_id = ? AND weekly = 1
                AND (last_report_week IS NULL OR last_report_week <> ?)`,
          args: [week, row.user_id, week],
        })
      ).rowsAffected === 1,
    async (row) => {
      await db().execute({
        sql: 'UPDATE notification_prefs SET last_report_week = ? WHERE user_id = ?',
        args: [(row.last_report_week as string | null) ?? null, row.user_id],
      })
    },
    (row) => reportFor(row.user_id, langOf(row.language), start),
    now,
  )
  return json(200, { ok: true, week, ...count })
}

const learnedCount = (progress: Progress) =>
  Object.values(progress.learned ?? {}).reduce(
    (sum, ids) => sum + (Array.isArray(ids) ? new Set(ids).size : 0),
    0,
  )

/** When the child last played: the latest finished activity or day with minutes. */
function lastPlayed(progress: Progress): number | null {
  const times = [
    ...(Array.isArray(progress.results) ? progress.results : []).map((r) =>
      Date.parse(String(r?.finishedAt)),
    ),
    ...Object.entries(progress.minutesByDay ?? {})
      .filter(([, minutes]) => Number(minutes) > 0)
      .map(([day]) => Date.parse(`${day}T12:00:00+05:00`)),
  ].filter((at) => Number.isFinite(at))
  return times.length > 0 ? Math.max(...times) : null
}

/** Daily: a new stage (every 5 letters learned) or, after 3 quiet days, one gentle note a week. */
export async function dailyCron(request: Request, now = Date.now()): Promise<Response> {
  assertCron(request)
  const today = tashkentDay(now)
  const week = weekKey(weekStart(now))
  const due = rowsOf(
    await db().execute({
      sql: `SELECT user_id, chat_id, language, milestone, last_event_day, last_nudge_week FROM notification_prefs
            WHERE events = 1 AND chat_id IS NOT NULL AND (last_event_day IS NULL OR last_event_day <> ?)
            LIMIT 1000`,
      args: [today],
    }),
  )
  const count = await sendAll(
    due,
    // at most one event message a day per parent, even if the cron runs twice
    async (row) =>
      (
        await db().execute({
          sql: `UPDATE notification_prefs SET last_event_day = ? WHERE user_id = ? AND events = 1
                AND (last_event_day IS NULL OR last_event_day <> ?)`,
          args: [today, row.user_id, today],
        })
      ).rowsAffected === 1,
    async (row) => {
      await db().execute({
        sql: 'UPDATE notification_prefs SET last_event_day = ? WHERE user_id = ?',
        args: [(row.last_event_day as string | null) ?? null, row.user_id],
      })
    },
    async (row) => {
      const t = NOTIFY_TEXT[langOf(row.language)]
      const child = await childOf(row.user_id)
      const learned = learnedCount(child.progress)
      const stage = Math.floor(learned / STAGE_LETTERS)
      const known = row.milestone === null ? null : Number(row.milestone)
      if (known === null || stage !== known) {
        await db().execute({
          sql: 'UPDATE notification_prefs SET milestone = ? WHERE user_id = ?',
          args: [stage, row.user_id],
        })
      }
      // the first look only notes where the child is: no message for stages reached before
      if (known !== null && stage > known)
        return fill(t.stage, { child: child.name ?? t.yourChild, count: learned })
      const played = lastPlayed(child.progress)
      if (played !== null && now - played >= QUIET_DAYS * DAY && row.last_nudge_week !== week) {
        await db().execute({
          sql: 'UPDATE notification_prefs SET last_nudge_week = ? WHERE user_id = ?',
          args: [week, row.user_id],
        })
        return fill(t.quiet, { child: child.name ?? t.yourChild })
      }
      // nothing to say: the day's claim is given back
      await db().execute({
        sql: 'UPDATE notification_prefs SET last_event_day = ? WHERE user_id = ?',
        args: [(row.last_event_day as string | null) ?? null, row.user_id],
      })
      return null
    },
    now,
  )
  return json(200, { ok: true, day: today, ...count })
}

// ---- the parent area: settings and linking ----

async function prefsOf(userId: string) {
  const found = await db().execute({
    sql: 'SELECT chat_id, weekly, events, language FROM notification_prefs WHERE user_id = ?',
    args: [userId],
  })
  return found.rows[0]
}

const view = (row: Record<string, unknown> | undefined, viaTelegram: boolean) => ({
  weekly: Number(row?.weekly ?? 0) === 1,
  events: Number(row?.events ?? 0) === 1,
  linked: row?.chat_id !== null && row?.chat_id !== undefined,
  language: langOf(row?.language),
  viaTelegram,
})

const telegramIdOf = async (userId: string) => {
  const found = await db().execute({
    sql: 'SELECT telegram_id FROM users WHERE id = ?',
    args: [userId],
  })
  const id = found.rows[0]?.telegram_id
  return id === null || id === undefined ? null : String(id)
}

export async function notifySettings(request: Request): Promise<Response> {
  const { userId } = await requireSession(request)
  const [row, telegramId] = await Promise.all([prefsOf(userId), telegramIdOf(userId)])
  return json(200, view(row, telegramId !== null))
}

/** Turning on is the parent's explicit choice; a Telegram sign-in's chat is linked right away. */
export async function saveNotifySettings(request: Request, now = Date.now()): Promise<Response> {
  const { userId } = await requireSession(request)
  memoryLimit(`notify-save:${userId}`, 30, 60)
  const body = await readJson<{ weekly?: unknown; events?: unknown; language?: unknown }>(
    request,
    1024,
  )
  const old = await prefsOf(userId)
  const weekly = typeof body.weekly === 'boolean' ? body.weekly : Number(old?.weekly ?? 0) === 1
  const events = typeof body.events === 'boolean' ? body.events : Number(old?.events ?? 0) === 1
  const language = body.language === undefined ? langOf(old?.language) : langOf(body.language)
  const telegramId = await telegramIdOf(userId)
  const chat = old?.chat_id ?? (weekly || events ? telegramId : null)
  await db().execute({
    sql: `INSERT INTO notification_prefs (user_id, chat_id, weekly, events, language, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET chat_id = excluded.chat_id, weekly = excluded.weekly,
            events = excluded.events, language = excluded.language, updated_at = excluded.updated_at`,
    args: [
      userId,
      chat === null || chat === undefined ? null : String(chat),
      weekly ? 1 : 0,
      events ? 1 : 0,
      language,
      now,
    ],
  })
  return json(200, view(await prefsOf(userId), telegramId !== null))
}

/** A one-time link for a parent who signed in with Google or e-mail: 10 minutes, works once. */
export async function notifyLink(request: Request, now = Date.now()): Promise<Response> {
  const { userId } = await requireSession(request)
  const bot = botUsername()
  if (!bot) throw new HttpError(503, 'not_configured', { setting: 'TELEGRAM_BOT_USERNAME' })
  await rateLimit(`notify-link:${userId}`, 10, 3600)
  const token = randomToken(24) // "link_" + 32 characters, within Telegram's 64
  await db().execute({
    sql: `INSERT INTO notification_prefs (user_id, link_hash, link_expires_at, updated_at) VALUES (?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET link_hash = excluded.link_hash,
            link_expires_at = excluded.link_expires_at, updated_at = excluded.updated_at`,
    args: [userId, sha256(token), now + LINK_MS, now],
  })
  return json(200, { link: `https://t.me/${bot}?start=link_${token}`, expiresAt: now + LINK_MS })
}

// ---- the bot: linking and commands ----

const NOTIFY_COMMANDS = new Set(['/hisobot', '/report', '/til', '/lang', '/stop'])
const LINK_START = /^\/start\s+link_([A-Za-z0-9_-]{16,64})$/

/** Is this /start payload an account-linking one (not a sign-in token)? */
export const isLinkStart = (text: string) => LINK_START.test(text.trim())

/**
 * The bot's notification side. Returns false when the chat is not a linked parent's and the
 * message is not a linking link: the sign-in flow answers it then.
 */
export async function botCommand(
  chatId: string,
  raw: string,
  fallback: Lang,
  now = Date.now(),
  fromId: string = chatId,
): Promise<boolean> {
  const text = raw.trim()
  const say = (lang: Lang, key: keyof Text, extra?: Record<string, unknown>) =>
    botSend(chatId, NOTIFY_TEXT[lang][key], extra)

  const link = text.match(LINK_START)
  if (link) {
    // one use: the hash is cleared in the same statement that links the chat
    const linked = await db().execute({
      sql: `UPDATE notification_prefs SET chat_id = ?, link_hash = NULL, link_expires_at = NULL, updated_at = ?
            WHERE link_hash = ? AND link_expires_at > ? RETURNING language`,
      args: [chatId, now, sha256(link[1]!), now],
    })
    const row = linked.rows[0]
    await say(row ? langOf(row.language) : fallback, row ? 'linked' : 'linkExpired')
    return true
  }

  const found = await db().execute({
    sql: 'SELECT user_id, weekly, events, language FROM notification_prefs WHERE chat_id = ? LIMIT 1',
    args: [chatId],
  })
  const command = text.split(/[\s@]/)[0]!.toLowerCase()
  // a Telegram sign-in that turned notifications on while the account had no Telegram id yet:
  // its private chat (chat id = the sender's id, proven by the webhook secret) is linked now
  const prefs =
    found.rows[0] ??
    (chatId === fromId
      ? (
          await db().execute({
            sql: `UPDATE notification_prefs SET chat_id = ?, updated_at = ?
                  WHERE chat_id IS NULL AND (weekly = 1 OR events = 1)
                    AND user_id = (SELECT id FROM users WHERE telegram_id = ?)
                  RETURNING user_id, weekly, events, language`,
            args: [chatId, now, fromId],
          })
        ).rows[0]
      : undefined)
  if (!prefs) {
    // a notification command from a chat that is not linked: say how to turn them on,
    // not the sign-in help (a bare /start and other text still get that)
    if (!NOTIFY_COMMANDS.has(command)) return false
    await say(fallback, 'notLinked')
    return true
  }
  const userId = String(prefs.user_id)
  const lang = langOf(prefs.language)
  const on = Number(prefs.weekly) === 1 || Number(prefs.events) === 1

  if (command === '/stop') {
    await db().execute({
      sql: 'UPDATE notification_prefs SET weekly = 0, events = 0, link_hash = NULL, link_expires_at = NULL, updated_at = ? WHERE chat_id = ?',
      args: [now, chatId],
    })
    await say(lang, 'stopped')
  } else if (command === '/start') {
    await db().execute({
      sql: 'UPDATE notification_prefs SET weekly = 1, updated_at = ? WHERE chat_id = ?',
      args: [now, chatId],
    })
    await say(lang, 'started')
  } else if (command === '/hisobot' || command === '/report') {
    if (!on) {
      await say(lang, 'off')
      return true
    }
    try {
      await rateLimit(`notify-report:${chatId}`, 2, 3600, now)
    } catch (error) {
      if (error instanceof HttpError && error.status === 429) {
        await say(lang, 'tooOften')
        return true
      }
      throw error
    }
    await botSend(chatId, await reportFor(userId, lang, reportWeek(now)))
  } else if (command === '/til' || command === '/lang') {
    await say(lang, 'chooseLanguage', {
      reply_markup: {
        keyboard: [Object.values(LANGUAGE_BUTTONS).map((label) => ({ text: label }))],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    })
  } else {
    const chosen = (Object.keys(LANGUAGE_BUTTONS) as Lang[]).find(
      (key) => LANGUAGE_BUTTONS[key] === text,
    )
    if (chosen) {
      await db().execute({
        sql: 'UPDATE notification_prefs SET language = ?, updated_at = ? WHERE chat_id = ?',
        args: [chosen, now, chatId],
      })
      await say(chosen, 'languageSet', { reply_markup: { remove_keyboard: true } })
    } else {
      await say(lang, 'help')
    }
  }
  return true
}

// ---- a sign-in from a new device ----

/** "Chrome, Windows": the kind of browser and system only, never the full user agent. */
export function deviceType(ua: string): string {
  const browser = /Edg(e|A|iOS)?\//.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/.test(ua)
      ? 'Opera'
      : /YaBrowser/.test(ua)
        ? 'Yandex'
        : /SamsungBrowser/.test(ua)
          ? 'Samsung Internet'
          : /Firefox|FxiOS/.test(ua)
            ? 'Firefox'
            : /Chrome|CriOS/.test(ua)
              ? 'Chrome'
              : /Safari/.test(ua)
                ? 'Safari'
                : 'Browser'
  const system = /Windows/.test(ua)
    ? 'Windows'
    : /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad|iPod/.test(ua)
        ? 'iOS'
        : /CrOS/.test(ua)
          ? 'ChromeOS'
          : /Mac OS X|Macintosh/.test(ua)
            ? 'macOS'
            : /Linux/.test(ua)
              ? 'Linux'
              : 'unknown'
  return `${browser}, ${system}`
}

/**
 * Remembers the device kind of each sign-in (a 16-character hash with the account id) and tells
 * the parent in Telegram when a new kind appears. The very first sign-in is not "new".
 * shortcut: two computers with the same browser and system count as one; a device cookie if that matters.
 */
export async function noticeDevice(
  request: Request,
  userId: string,
  now = Date.now(),
): Promise<void> {
  const device = deviceType(request.headers.get('user-agent') ?? '')
  const hash = sha256(`${userId}|${device}`).slice(0, 16)
  const known = await db().execute({
    sql: 'SELECT device_hash FROM user_devices WHERE user_id = ?',
    args: [userId],
  })
  if (known.rows.some((row) => row.device_hash === hash)) return
  await db().execute({
    sql: 'INSERT OR IGNORE INTO user_devices (user_id, device_hash, created_at) VALUES (?, ?, ?)',
    args: [userId, hash, now],
  })
  if (known.rows.length === 0) return
  const prefs = await prefsOf(userId)
  if (!prefs?.chat_id || (Number(prefs.weekly) !== 1 && Number(prefs.events) !== 1)) return
  const text = fill(NOTIFY_TEXT[langOf(prefs.language)].device, { device, time: tashkentTime(now) })
  await deliver(userId, String(prefs.chat_id), text, now)
}

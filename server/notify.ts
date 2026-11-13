import { langOf, type Lang } from './auth.js'
import { randomId, randomToken, sameText, sha256 } from './crypto.js'
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

// Playful and warm for reports and moments (Kiddo's robots Mini and Piku say hello);
// plain and serious for security, /stop and errors. Never a grade, a score or a comparison.
const UZ = {
  title: '📒 {child} · {from}–{to}',
  greet: '🤖 Mini: Salom! Mana bu haftamiz:',
  greetNamed: '🤖 Mini: Salom, {parent}! Mana bu haftamiz:',
  activities: '🎯 Mashg‘ulotlar: {count}',
  minutes: '⏱ O‘yin vaqti: {minutes} daqiqa',
  letters: '🔤 Mashq qilingan harflar: {list}',
  practice: '🔁 Takrorlash foydali: {list}',
  tipPractice: '💡 Bugun 5 daqiqa «{letter}» harfini birga takrorlang.',
  tipLetters: '💡 Bugun 5 daqiqa «{letter}» harfi bilan boshlanadigan so‘zlar topib o‘ynang.',
  tipAny: '💡 Bugun 5 daqiqa birga bitta yangi harfni o‘ynab ko‘ring.',
  empty:
    '🤖 Piku: Bu hafta biz dam oldik 😊 Qulay paytda 5 daqiqa birga o‘ynab ko‘ring, yangi harflar kutib turibdi!',
  stage:
    '🎉 Piku xabari: {child} yangi bosqichga chiqdi, {count} ta harf o‘rganildi! Birga quvoning!',
  quiet:
    '🌱 Mini sog‘indi: {child} bir necha kundan beri Kiddo’ga kirmadi. Qulay paytda 5 daqiqa birga o‘ynab ko‘ring.',
  yourChild: 'Farzandingiz',
  menu: '🤖 Kiddo menyusi. Kerakli bo‘limni tanlang:',
  btnReport: '📒 Hisobot',
  btnSettings: '⚙️ Sozlamalar',
  btnLanguage: '🌐 Til',
  btnHelp: '❓ Yordam',
  btnSite: '🔗 Saytni ochish',
  help: 'Kiddo boti ota-onalar uchun: haftalik hisobot, muhim voqealar va xavfsizlik xabarlari.\n/hisobot — oxirgi hisobot, /sozlamalar — nima kelishini tanlash\n/til — til, /fikr — fikr yozish, /menu — menyu\nBolani baholamaymiz va hech kim bilan taqqoslamaymiz.\n/stop — barcha xabarlarni o‘chirish.\nOta-ona bo‘limi: {site}',
  settingsTitle: '⚙️ Kiddo xabarnomalari',
  weeklyName: 'Haftalik hisobot',
  eventsName: 'Muhim voqealar',
  securityName: 'Xavfsizlik xabarlari',
  stateOn: '✅ yoqilgan',
  stateOff: '⛔ o‘chiq',
  turnOn: 'Yoqish: {name}',
  turnOff: 'O‘chirish: {name}',
  saved: 'Saqlandi',
  feedbackAsk: '✍️ Fikringizni keyingi xabarda yozing (1000 belgigacha). 10 daqiqa kutaman.',
  feedbackThanks: 'Rahmat! Fikringiz Kiddo jamoasiga yetkazildi.',
  feedbackTooLong: 'Xabar juda uzun. Iltimos, 1000 belgigacha yozing.',
  feedbackTooMany: 'Bir soatda 3 tagacha fikr yuborish mumkin. Iltimos, keyinroq yozing.',
  adminFeedback: '📝 Kiddo: yangi fikr ({lang}, {length} belgi).',
  linked:
    'Tayyor! Kiddo xabarnomalari shu chatga ulandi. Haftalik hisobot yakshanba kuni 20:00 da keladi. Menyu: /menu',
  linkExpired: 'Bu ulash havolasi eskirgan yoki ishlatilgan. Kiddo sozlamalaridan yangisini oling.',
  stopped: 'Barcha Kiddo xabarnomalari o‘chirildi. Qayta yoqish uchun /start bosing.',
  started: 'Kiddo xabarnomalari qayta yoqildi. Haftalik hisobot yakshanba kuni 20:00 da keladi.',
  off: 'Xabarnomalar o‘chiq. Yoqish uchun /start bosing.',
  tooOften: 'Hisobotni soatiga 2 martagacha so‘rash mumkin. Birozdan keyin urinib ko‘ring.',
  chooseLanguage: 'Xabarlar tilini tanlang:',
  languageSet: 'Endi xabarlar o‘zbek tilida keladi.',
  notLinked:
    'Bu chat Kiddo xabarnomalariga hali ulanmagan. Avval saytda Ota-ona bo‘limi → Sozlamalar → «Telegram xabarnomalari»ni yoqing, keyin /hisobot, /til va /stop ishlaydi.',
  device:
    '🔐 Kiddo hisobingizga yangi qurilmadan kirildi: {device}, {time} (Toshkent vaqti). Bu siz bo‘lmasangiz, «Bu men emas» tugmasini bosing va Google akkauntingiz yoki pochtangizni tekshiring.',
  btnNotMe: '🚫 Bu men emas',
  notMeDone:
    '🔐 Kiddo hisobingizdan barcha qurilmalar chiqarildi. Qayta kirish kerak bo‘ladi. Google akkauntingiz yoki pochtangiz parolini tekshiring.',
  notMeStale: 'Bu tugma endi ishlamaydi: amal allaqachon bajarilgan yoki muddati o‘tgan.',
  notAllowed: 'Bu amal faqat hisob egasining shaxsiy chatida ishlaydi.',
}

export type Text = Record<keyof typeof UZ, string>

export const NOTIFY_TEXT: Record<Lang, Text> = {
  uz: UZ,
  ru: {
    title: '📒 {child} · {from}–{to}',
    greet: '🤖 Мини: Привет! Вот наша неделя:',
    greetNamed: '🤖 Мини: Привет, {parent}! Вот наша неделя:',
    activities: '🎯 Занятия: {count}',
    minutes: '⏱ Время в игре: {minutes} мин',
    letters: '🔤 Повторяли буквы: {list}',
    practice: '🔁 Полезно повторить: {list}',
    tipPractice: '💡 Сегодня 5 минут повторите вместе букву «{letter}».',
    tipLetters: '💡 Сегодня 5 минут поиграйте: найдите слова на букву «{letter}».',
    tipAny: '💡 Сегодня 5 минут поиграйте вместе с одной новой буквой.',
    empty:
      '🤖 Пику: На этой неделе мы отдыхали 😊 В удобный момент поиграйте вместе 5 минут, новые буквы уже ждут!',
    stage:
      '🎉 Новость от Пику: {child} перешёл(ла) на новый этап, выучено букв: {count}! Порадуйтесь вместе!',
    quiet:
      '🌱 Мини скучает: {child} несколько дней не заходил(а) в Kiddo. В удобный момент поиграйте вместе 5 минут.',
    yourChild: 'Ваш ребёнок',
    menu: '🤖 Меню Kiddo. Выберите раздел:',
    btnReport: '📒 Отчёт',
    btnSettings: '⚙️ Настройки',
    btnLanguage: '🌐 Язык',
    btnHelp: '❓ Помощь',
    btnSite: '🔗 Открыть сайт',
    help: 'Бот Kiddo для родителей: недельный отчёт, важные события и сообщения безопасности.\n/hisobot — последний отчёт, /sozlamalar — что присылать\n/til — язык, /fikr — написать отзыв, /menu — меню\nМы не оцениваем ребёнка и ни с кем не сравниваем.\n/stop — отключить все сообщения.\nРодительский раздел: {site}',
    settingsTitle: '⚙️ Уведомления Kiddo',
    weeklyName: 'Недельный отчёт',
    eventsName: 'Важные события',
    securityName: 'Сообщения безопасности',
    stateOn: '✅ включено',
    stateOff: '⛔ выключено',
    turnOn: 'Включить: {name}',
    turnOff: 'Выключить: {name}',
    saved: 'Сохранено',
    feedbackAsk: '✍️ Напишите отзыв следующим сообщением (до 1000 символов). Жду 10 минут.',
    feedbackThanks: 'Спасибо! Ваш отзыв передан команде Kiddo.',
    feedbackTooLong: 'Сообщение слишком длинное. Пожалуйста, до 1000 символов.',
    feedbackTooMany: 'Можно отправить до 3 отзывов в час. Пожалуйста, напишите позже.',
    adminFeedback: '📝 Kiddo: новый отзыв ({lang}, {length} симв.).',
    linked:
      'Готово! Уведомления Kiddo подключены к этому чату. Недельный отчёт приходит в воскресенье в 20:00. Меню: /menu',
    linkExpired: 'Ссылка устарела или уже использована. Получите новую в настройках Kiddo.',
    stopped: 'Все уведомления Kiddo отключены. Чтобы включить снова, нажмите /start.',
    started: 'Уведомления Kiddo снова включены. Недельный отчёт приходит в воскресенье в 20:00.',
    off: 'Уведомления отключены. Чтобы включить, нажмите /start.',
    tooOften: 'Отчёт можно запросить не чаще 2 раз в час. Попробуйте немного позже.',
    chooseLanguage: 'Выберите язык сообщений:',
    languageSet: 'Теперь сообщения будут на русском.',
    notLinked:
      'Этот чат ещё не подключён к уведомлениям Kiddo. Сначала включите на сайте «Уведомления в Telegram» (Родительский раздел → Настройки), после этого заработают /hisobot, /til и /stop.',
    device:
      '🔐 Вход в ваш аккаунт Kiddo с нового устройства: {device}, {time} (время Ташкента). Если это были не вы, нажмите «Это не я» и проверьте свой Google-аккаунт или почту.',
    btnNotMe: '🚫 Это не я',
    notMeDone:
      '🔐 Все устройства вышли из вашего аккаунта Kiddo. Нужно будет войти заново. Проверьте пароль своего Google-аккаунта или почты.',
    notMeStale: 'Эта кнопка больше не работает: действие уже выполнено или срок истёк.',
    notAllowed: 'Это действие работает только в личном чате владельца аккаунта.',
  },
  en: {
    title: '📒 {child} · {from}–{to}',
    greet: '🤖 Mini: Hi! Here is our week:',
    greetNamed: '🤖 Mini: Hi, {parent}! Here is our week:',
    activities: '🎯 Activities: {count}',
    minutes: '⏱ Time playing: {minutes} min',
    letters: '🔤 Letters practised: {list}',
    practice: '🔁 Worth practising: {list}',
    tipPractice: '💡 Today, practise the letter «{letter}» together for 5 minutes.',
    tipLetters: '💡 Today, spend 5 minutes finding words that start with «{letter}».',
    tipAny: '💡 Today, play with one new letter together for 5 minutes.',
    empty:
      '🤖 Piku: We had a restful week 😊 When it suits you, play together for 5 minutes, new letters are waiting!',
    stage:
      '🎉 News from Piku: {child} reached a new stage, {count} letters learned! Celebrate together!',
    quiet:
      '🌱 Mini misses {child}: no Kiddo for a few days. When it suits you, play together for 5 minutes.',
    yourChild: 'Your child',
    menu: '🤖 Kiddo menu. Choose a section:',
    btnReport: '📒 Report',
    btnSettings: '⚙️ Settings',
    btnLanguage: '🌐 Language',
    btnHelp: '❓ Help',
    btnSite: '🔗 Open the website',
    help: 'The Kiddo bot for parents: a weekly report, important moments and security messages.\n/hisobot — the latest report, /sozlamalar — what to receive\n/til — language, /fikr — send feedback, /menu — menu\nWe never grade your child or compare them with anyone.\n/stop — turn all messages off.\nParent area: {site}',
    settingsTitle: '⚙️ Kiddo notifications',
    weeklyName: 'Weekly report',
    eventsName: 'Important moments',
    securityName: 'Security messages',
    stateOn: '✅ on',
    stateOff: '⛔ off',
    turnOn: 'Turn on: {name}',
    turnOff: 'Turn off: {name}',
    saved: 'Saved',
    feedbackAsk:
      '✍️ Write your feedback in your next message (up to 1000 characters). I will wait 10 minutes.',
    feedbackThanks: 'Thank you! Your feedback has reached the Kiddo team.',
    feedbackTooLong: 'The message is too long. Please keep it within 1000 characters.',
    feedbackTooMany: 'Up to 3 feedback messages an hour. Please write again later.',
    adminFeedback: '📝 Kiddo: new feedback ({lang}, {length} characters).',
    linked:
      'Done! Kiddo notifications are linked to this chat. The weekly report comes on Sunday at 20:00. Menu: /menu',
    linkExpired: 'This link has expired or was already used. Get a new one in Kiddo’s settings.',
    stopped: 'All Kiddo notifications are off. Tap /start to turn them on again.',
    started: 'Kiddo notifications are on again. The weekly report comes on Sunday at 20:00.',
    off: 'Notifications are off. Tap /start to turn them on.',
    tooOften: 'The report can be asked for up to 2 times an hour. Please try a little later.',
    chooseLanguage: 'Choose the language of the messages:',
    languageSet: 'Messages will now come in English.',
    notLinked:
      'This chat is not linked to Kiddo notifications yet. First turn on “Telegram notifications” on the website (Parent area → Settings); then /hisobot, /til and /stop will work.',
    device:
      '🔐 Someone signed in to your Kiddo account from a new device: {device}, {time} (Tashkent time). If it was not you, tap “This was not me” and check your Google account or e-mail.',
    btnNotMe: '🚫 This was not me',
    notMeDone:
      '🔐 Every device has been signed out of your Kiddo account. You will need to sign in again. Check the password of your Google account or e-mail.',
    notMeStale: 'This button no longer works: it was already used or has expired.',
    notAllowed: 'This only works in the account owner’s private chat.',
  },
}

/** The /til buttons: what a parent taps is the text the bot receives. */
export const LANGUAGE_BUTTONS: Record<Lang, string> = {
  uz: 'O‘zbekcha',
  ru: 'Русский',
  en: 'English',
}

export const fill = (text: string, values: Record<string, string | number>) =>
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

const dayMonth = (at: number) => {
  const day = tashkentDay(at)
  return `${day.slice(8, 10)}.${day.slice(5, 7)}`
}

/**
 * The weekly message, one phone screen: the child and the week, a hello from Mini, up to four
 * short facts and one simple idea for today. Names when known; nothing grades or compares.
 */
export function reportText(
  lang: Lang,
  names: { parent: string | null; child: string | null },
  facts: WeekFacts,
  start: number,
): string {
  const t = NOTIFY_TEXT[lang]
  const lines = [
    fill(t.title, {
      child: names.child ?? t.yourChild,
      from: dayMonth(start),
      to: dayMonth(start + 6 * DAY),
    }),
    names.parent ? fill(t.greetNamed, { parent: names.parent }) : t.greet,
  ]
  if (facts.activities === 0 && facts.minutes === 0) return [lines[0], t.empty].join('\n')
  if (facts.activities > 0) lines.push(fill(t.activities, { count: facts.activities }))
  if (facts.minutes > 0) lines.push(fill(t.minutes, { minutes: facts.minutes }))
  if (facts.letters.length > 0) lines.push(fill(t.letters, { list: facts.letters.join(', ') }))
  if (facts.practice.length > 0) lines.push(fill(t.practice, { list: facts.practice.join(', ') }))
  const letter = facts.practice[0] ?? facts.letters[0]
  lines.push(
    facts.practice[0]
      ? fill(t.tipPractice, { letter: facts.practice[0] })
      : letter
        ? fill(t.tipLetters, { letter })
        : t.tipAny,
  )
  return lines.join('\n')
}

/** The menu under reports and help: four actions and the parent area on the website. */
export function menuKeyboard(lang: Lang, origin: string) {
  const t = NOTIFY_TEXT[lang]
  return {
    inline_keyboard: [
      [
        { text: t.btnReport, callback_data: 'm:report' },
        { text: t.btnSettings, callback_data: 'm:settings' },
      ],
      [
        { text: t.btnLanguage, callback_data: 'm:lang' },
        { text: t.btnHelp, callback_data: 'm:help' },
      ],
      [{ text: t.btnSite, url: `${origin}/parent/dashboard` }],
    ],
  }
}

export const helpText = (lang: Lang, origin: string) =>
  fill(NOTIFY_TEXT[lang].help, { site: `${origin}/parent` })

/** Security messages are on unless the parent turned them off (bot_prefs, default 1). */
export async function securityOn(userId: string): Promise<boolean> {
  const found = await db().execute({
    sql: 'SELECT security FROM bot_prefs WHERE user_id = ?',
    args: [userId],
  })
  return found.rows[0] ? Number(found.rows[0].security) === 1 : true
}

export async function setBotPref(
  userId: string,
  column: 'security' | 'feedback_until',
  value: number | null,
  now: number,
): Promise<void> {
  await db().execute({
    sql: `INSERT INTO bot_prefs (user_id, ${column}, updated_at) VALUES (?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET ${column} = excluded.${column}, updated_at = excluded.updated_at`,
    args: [userId, value, now],
  })
}

export async function reportFor(userId: string, lang: Lang, start: number): Promise<string> {
  const [child, user] = await Promise.all([
    childOf(userId),
    db().execute({ sql: 'SELECT name FROM users WHERE id = ?', args: [userId] }),
  ])
  const parent = user.rows[0]?.name
    ? String(user.rows[0].name).trim().split(/\s+/)[0] || null
    : null
  return reportText(lang, { parent, child: child.name }, weekFacts(child.progress, start), start)
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
  extra: Record<string, unknown> = {},
): Promise<Outcome> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await botSend(chatId, text, extra)
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
        await setBotPref(userId, 'security', 0, now)
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
export function assertCron(request: Request): void {
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
  extra: (row: Row) => Record<string, unknown> = () => ({}),
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
      const outcome = await deliver(row.user_id, row.chat_id, message, now, extra(row))
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
    (row) => ({ reply_markup: menuKeyboard(langOf(row.language), new URL(request.url).origin) }),
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
  // a linked chat, security messages on (the default; /stop and the switch turn them off)
  if (!prefs?.chat_id || !(await securityOn(userId))) return
  const t = NOTIFY_TEXT[langOf(prefs.language)]
  // the "this was not me" button: a one-time id of its own, never the session or account id
  const alert = randomId()
  await db().execute({
    sql: 'INSERT INTO device_alerts (id, user_id, chat_id, created_at) VALUES (?, ?, ?, ?)',
    args: [alert, userId, String(prefs.chat_id), now],
  })
  await deliver(
    userId,
    String(prefs.chat_id),
    fill(t.device, { device, time: tashkentTime(now) }),
    now,
    {
      reply_markup: { inline_keyboard: [[{ text: t.btnNotMe, callback_data: `nm:${alert}` }]] },
    },
  )
}

import { langOf, type Lang } from './auth.js'
import { randomId, sha256 } from './crypto.js'
import { db } from './db.js'
import { env } from './env.js'
import { HttpError } from './http.js'
import {
  fill,
  helpText,
  LANGUAGE_BUTTONS,
  menuKeyboard,
  NOTIFY_TEXT,
  reportFor,
  reportWeek,
  securityOn,
  setBotPref,
  type Text,
} from './notify.js'
import { rateLimit } from './rateLimit.js'
import { botApi, botSend } from './telegram.js'

/*
 * The bot's conversation with parents (stage 9.1): /menu, /sozlamalar with switches that edit
 * the message in place, /yordam, /fikr, /hisobot, /til, /stop, /start, and the "this was not me"
 * button under a new-device message. Only a linked parent's own private chat changes anything:
 * a callback's sender (from.id) must be that chat. The sign-in flow is in telegram.ts.
 */

export const FEEDBACK_MAX = 1000
const FEEDBACK_MS = 10 * 60_000
/** A "this was not me" button works once, for a week after its message. */
export const ALERT_MS = 7 * 86_400_000

const LINK_START = /^\/start\s+link_([A-Za-z0-9_-]{16,64})$/
/** Is this /start payload an account-linking one (not a sign-in token)? */
export const isLinkStart = (text: string) => LINK_START.test(text.trim())

const ALIASES: Record<string, string> = {
  '/report': '/hisobot',
  '/lang': '/til',
  '/settings': '/sozlamalar',
  '/help': '/yordam',
  '/feedback': '/fikr',
}
/** Commands that need a linked chat; the others answer anyone with help and the menu. */
const LINKED_ONLY = new Set(['/hisobot', '/til', '/stop', '/sozlamalar', '/fikr'])
const SWITCHES = ['weekly', 'events', 'security'] as const
type Switch = (typeof SWITCHES)[number]

export interface BotChat {
  chatId: string
  fromId: string
  /** Telegram's language of the sender: the answer's language until the parent is known. */
  lang: Lang
  /** The site, for the "open the website" button and links. */
  origin: string
}

interface Parent {
  userId: string
  lang: Lang
  weekly: boolean
  events: boolean
}

/**
 * The parent behind this chat. A Telegram sign-in that turned notifications on before its
 * account had a Telegram id is linked here by its own private chat (chat id = verified sender).
 */
async function parentOf(chatId: string, fromId: string, now: number): Promise<Parent | null> {
  const found = await db().execute({
    sql: 'SELECT user_id, weekly, events, language FROM notification_prefs WHERE chat_id = ? LIMIT 1',
    args: [chatId],
  })
  const row =
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
  if (!row) return null
  return {
    userId: String(row.user_id),
    lang: langOf(row.language),
    weekly: Number(row.weekly) === 1,
    events: Number(row.events) === 1,
  }
}

const say = (chatId: string, lang: Lang, key: keyof Text, extra?: Record<string, unknown>) =>
  botSend(chatId, NOTIFY_TEXT[lang][key], extra)

/** The settings message: each switch's state and a button that sets it (not toggles: idempotent). */
async function settingsView(parent: Parent) {
  const t = NOTIFY_TEXT[parent.lang]
  const prefs = await db().execute({
    sql: 'SELECT weekly, events FROM notification_prefs WHERE user_id = ?',
    args: [parent.userId],
  })
  const state: Record<Switch, boolean> = {
    weekly: Number(prefs.rows[0]?.weekly ?? 0) === 1,
    events: Number(prefs.rows[0]?.events ?? 0) === 1,
    security: await securityOn(parent.userId),
  }
  const name: Record<Switch, string> = {
    weekly: t.weeklyName,
    events: t.eventsName,
    security: t.securityName,
  }
  return {
    text: [
      t.settingsTitle,
      ...SWITCHES.map((key) => `${name[key]}: ${state[key] ? t.stateOn : t.stateOff}`),
    ].join('\n'),
    reply_markup: {
      inline_keyboard: SWITCHES.map((key) => [
        {
          text: fill(state[key] ? t.turnOff : t.turnOn, { name: name[key] }),
          callback_data: `s:${key}:${state[key] ? 0 : 1}`,
        },
      ]),
    },
  }
}

async function setSwitch(userId: string, key: Switch, on: boolean, now: number) {
  if (key === 'security') return setBotPref(userId, 'security', on ? 1 : 0, now)
  // `key` is one of the two fixed column names above, never user text
  await db().execute({
    sql: `UPDATE notification_prefs SET ${key} = ?, updated_at = ? WHERE user_id = ?`,
    args: [on ? 1 : 0, now, userId],
  })
}

/** A linked parent's command (also what the menu buttons run). */
async function parentCommand(chat: BotChat, parent: Parent, command: string, now: number) {
  const { chatId, origin } = chat
  const lang = parent.lang
  if (command === '/stop') {
    await db().execute({
      sql: `UPDATE notification_prefs SET weekly = 0, events = 0, link_hash = NULL, link_expires_at = NULL,
            updated_at = ? WHERE user_id = ?`,
      args: [now, parent.userId],
    })
    await setBotPref(parent.userId, 'security', 0, now)
    await say(chatId, lang, 'stopped')
  } else if (command === '/start') {
    await setSwitch(parent.userId, 'weekly', true, now)
    await setBotPref(parent.userId, 'security', 1, now)
    await say(chatId, lang, 'started')
  } else if (command === '/hisobot') {
    if (!parent.weekly && !parent.events) return say(chatId, lang, 'off')
    try {
      await rateLimit(`notify-report:${chatId}`, 2, 3600, now)
    } catch (error) {
      if (error instanceof HttpError && error.status === 429) return say(chatId, lang, 'tooOften')
      throw error
    }
    await botSend(chatId, await reportFor(parent.userId, lang, reportWeek(now)), {
      reply_markup: menuKeyboard(lang, origin),
    })
  } else if (command === '/til') {
    await say(chatId, lang, 'chooseLanguage', {
      reply_markup: {
        keyboard: [Object.values(LANGUAGE_BUTTONS).map((label) => ({ text: label }))],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    })
  } else if (command === '/sozlamalar') {
    const view = await settingsView(parent)
    await botSend(chatId, view.text, { reply_markup: view.reply_markup })
  } else if (command === '/fikr') {
    await setBotPref(parent.userId, 'feedback_until', now + FEEDBACK_MS, now)
    await say(chatId, lang, 'feedbackAsk')
  } else if (command === '/menu') {
    await say(chatId, lang, 'menu', { reply_markup: menuKeyboard(lang, origin) })
  } else {
    await botSend(chatId, helpText(lang, origin), { reply_markup: menuKeyboard(lang, origin) })
  }
}

/** /fikr's next message: at most 1000 characters, 3 an hour, kept in `feedback`, never logged. */
async function takeFeedback(chat: BotChat, parent: Parent, text: string, now: number) {
  const lang = parent.lang
  const length = [...text].length
  if (length > FEEDBACK_MAX) return say(chat.chatId, lang, 'feedbackTooLong') // still waiting
  await setBotPref(parent.userId, 'feedback_until', null, now)
  try {
    await rateLimit(`feedback:${parent.userId}`, 3, 3600, now)
  } catch (error) {
    if (error instanceof HttpError && error.status === 429)
      return say(chat.chatId, lang, 'feedbackTooMany')
    throw error
  }
  await db().execute({
    sql: 'INSERT INTO feedback (id, user_id, text, language, created_at) VALUES (?, ?, ?, ?, ?)',
    args: [randomId(), parent.userId, text, lang, now],
  })
  await say(chat.chatId, lang, 'feedbackThanks')
  const admin = env('ADMIN_TELEGRAM_CHAT_ID')
  if (admin) {
    // the admin gets a short notice only; the text stays in the database
    await botSend(admin, fill(NOTIFY_TEXT.uz.adminFeedback, { lang, length })).catch(() =>
      console.error('[bot] admin notice failed'),
    )
  }
}

/**
 * The notifications side of a message. Returns false only for a bare /start from a chat that
 * is not linked: the sign-in flow answers that (telegram.ts), as before.
 */
export async function botCommand(
  chat: BotChat & { text: string },
  now = Date.now(),
): Promise<boolean> {
  const text = chat.text.trim()
  const { chatId, fromId } = chat

  const link = text.match(LINK_START)
  if (link) {
    // one use: the hash is cleared in the same statement that links the chat
    const linked = await db().execute({
      sql: `UPDATE notification_prefs SET chat_id = ?, link_hash = NULL, link_expires_at = NULL, updated_at = ?
            WHERE link_hash = ? AND link_expires_at > ? RETURNING language`,
      args: [chatId, now, sha256(link[1]!), now],
    })
    const row = linked.rows[0]
    await say(chatId, row ? langOf(row.language) : chat.lang, row ? 'linked' : 'linkExpired')
    return true
  }

  const first = text.split(/[\s@]/)[0]!.toLowerCase()
  const command = ALIASES[first] ?? first
  const parent = await parentOf(chatId, fromId, now)
  if (!parent) {
    if (command === '/start') return false
    if (LINKED_ONLY.has(command)) await say(chatId, chat.lang, 'notLinked')
    // anything else: short help and the menu, never the sign-in text
    else
      await botSend(chatId, helpText(chat.lang, chat.origin), {
        reply_markup: menuKeyboard(chat.lang, chat.origin),
      })
    return true
  }

  if (text.startsWith('/')) {
    // a command cancels a pending /fikr
    await db().execute({
      sql: 'UPDATE bot_prefs SET feedback_until = NULL WHERE user_id = ? AND feedback_until IS NOT NULL',
      args: [parent.userId],
    })
    await parentCommand(chat, parent, command, now)
    return true
  }

  const chosen = (Object.keys(LANGUAGE_BUTTONS) as Lang[]).find(
    (key) => LANGUAGE_BUTTONS[key] === text,
  )
  if (chosen) {
    await db().execute({
      sql: 'UPDATE notification_prefs SET language = ?, updated_at = ? WHERE user_id = ?',
      args: [chosen, now, parent.userId],
    })
    await say(chatId, chosen, 'languageSet', { reply_markup: { remove_keyboard: true } })
    return true
  }

  const waiting = await db().execute({
    sql: 'SELECT feedback_until FROM bot_prefs WHERE user_id = ?',
    args: [parent.userId],
  })
  if (Number(waiting.rows[0]?.feedback_until ?? 0) > now) {
    await takeFeedback(chat, parent, text, now)
    return true
  }
  await parentCommand(chat, parent, '/yordam', now)
  return true
}

export interface BotPress extends BotChat {
  /** The callback_query id, answered once. */
  id: string
  /** The chat the button's message is in; null when Telegram did not say. */
  chatId: string
  messageId: number | null
  data: string
}

/** "This was not me": signs every device out, once, only from the chat the alert went to. */
async function notMe(press: BotPress, answer: (text?: string) => Promise<void>, now: number) {
  const id = press.data.slice(3)
  const parent = await parentOf(press.chatId, press.fromId, now)
  const lang = parent?.lang ?? press.lang
  const used = /^[0-9a-f]{32}$/.test(id)
    ? await db().execute({
        sql: `UPDATE device_alerts SET used_at = ?
              WHERE id = ? AND chat_id = ? AND used_at IS NULL AND created_at > ?
                AND user_id IN (SELECT user_id FROM notification_prefs WHERE chat_id = ?)
              RETURNING user_id`,
        args: [now, id, press.chatId, now - ALERT_MS, press.chatId],
      })
    : { rows: [] }
  const row = used.rows[0]
  if (!row) return answer(NOTIFY_TEXT[lang].notMeStale)
  await db().execute({ sql: 'DELETE FROM sessions WHERE user_id = ?', args: [String(row.user_id)] })
  await answer()
  if (press.messageId !== null) {
    await botApi('editMessageReplyMarkup', {
      chat_id: press.chatId,
      message_id: press.messageId,
      reply_markup: { inline_keyboard: [] },
    }).catch(() => console.error('[bot] could not remove the button'))
  }
  await say(press.chatId, lang, 'notMeDone')
}

/** A button press. Every press is answered (Telegram's spinner stops); only the owner changes things. */
export async function botCallback(
  press: Omit<BotPress, 'chatId'> & { chatId: string | null },
  now = Date.now(),
): Promise<void> {
  const answer = async (text?: string) => {
    await botApi('answerCallbackQuery', {
      callback_query_id: press.id,
      ...(text ? { text, show_alert: true } : {}),
    }).catch(() => console.error('[bot] could not answer a button'))
  }
  // a private chat's id is its user's id: anyone else (a group, a forwarded message) is refused
  if (press.chatId === null || press.chatId !== press.fromId)
    return answer(NOTIFY_TEXT[press.lang].notAllowed)
  const owned = { ...press, chatId: press.chatId }
  if (press.data.startsWith('nm:')) return notMe(owned, answer, now)

  const parent = await parentOf(owned.chatId, owned.fromId, now)
  if (!parent) return answer(NOTIFY_TEXT[press.lang].notLinked)
  const [kind, key, value] = press.data.split(':')

  if (kind === 's' && SWITCHES.includes(key as Switch) && (value === '0' || value === '1')) {
    await setSwitch(parent.userId, key as Switch, value === '1', now)
    const view = await settingsView(parent)
    if (press.messageId !== null) {
      // pressing the same button twice leaves the same text: Telegram's "not modified" is fine
      await botApi('editMessageText', {
        chat_id: owned.chatId,
        message_id: press.messageId,
        text: view.text,
        reply_markup: view.reply_markup,
      }).catch(() => undefined)
    }
    return answer(NOTIFY_TEXT[parent.lang].saved)
  }

  const menu: Record<string, string> = {
    report: '/hisobot',
    settings: '/sozlamalar',
    lang: '/til',
    help: '/yordam',
  }
  await answer()
  if (kind === 'm' && key && menu[key]) {
    const fresh = await parentOf(owned.chatId, owned.fromId, now)
    if (fresh) await parentCommand(owned, fresh, menu[key]!, now)
  }
}

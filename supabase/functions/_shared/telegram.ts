/*
 * The parents' Telegram bot (Phase 56). Plain TypeScript (no Deno APIs): vitest tests it.
 *
 *   * handleTelegram: the webhook (Edge Function `telegram`). Telegram calls it
 *     with the secret set at setWebhook (header X-Telegram-Bot-Api-Secret-Token);
 *     anything else is refused. It answers in the webhook response itself
 *     (method sendMessage), so it never calls Telegram on its own. Only private
 *     chats are served; a message's text is never logged or stored.
 *   * telegramSendJob: the worker's `telegram_send` job (weekly, daily, reminder).
 *     A chat that blocked the bot or is gone is unlinked, not retried.
 */

import { PermanentJobError, sameSecret, type JobHandler } from './worker.ts'
import type { Env } from './tts.ts'
import {
  botLanguage,
  childrenLine,
  formatPro,
  formatReport,
  TEXTS,
  type BotLanguage,
  type ChildName,
  type Pro,
  type Report,
  type ReportKind,
} from './telegramText.ts'

export type ClaimResult =
  | { status: 'linked'; language: BotLanguage; children: ChildName[] }
  | { status: 'invalid' }
  | { status: 'too_many'; language: BotLanguage }

export interface ChatInfo {
  link_id: number
  language: BotLanguage
  pro: Pro | null
}

export interface TelegramDeps {
  env: Env
  claim(code: string, chatId: number): Promise<ClaimResult>
  unlink(chatId: number): Promise<boolean>
  setLanguage(chatId: number, language: BotLanguage): Promise<boolean>
  chat(chatId: number): Promise<ChatInfo | null>
  report(linkId: number, kind: ReportKind): Promise<Report | null>
  log?(message: string, error?: unknown): void
}

/** Telegram's own limit for a webhook body is far below this. */
export const MAX_UPDATE_BYTES = 64 * 1024
/** A link code: what telegram_link_code makes (the app puts it after ?start=). */
export const CODE_PATTERN = /^[0-9a-f]{32}$/

const ok = () => new Response('ok', { status: 200 })

function reply(chatId: number, text: string): Response {
  return new Response(
    JSON.stringify({
      method: 'sendMessage',
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

interface Message {
  chatId: number
  text: string
  userLanguage: BotLanguage
}

/** The private text message in an update, or null for anything else. */
export function readMessage(update: unknown): Message | null {
  if (typeof update !== 'object' || update === null) return null
  const message = (update as { message?: unknown }).message
  if (typeof message !== 'object' || message === null) return null
  const { chat, text, from } = message as { chat?: unknown; text?: unknown; from?: unknown }
  if (typeof chat !== 'object' || chat === null) return null
  const { id, type } = chat as { id?: unknown; type?: unknown }
  if (type !== 'private' || typeof id !== 'number' || !Number.isSafeInteger(id)) return null
  if (typeof text !== 'string') return null
  const languageCode =
    typeof from === 'object' && from !== null
      ? (from as { language_code?: unknown }).language_code
      : undefined
  return { chatId: id, text: text.slice(0, 4096), userLanguage: botLanguage(languageCode) }
}

/** "/start@KiddoBot abc" → { command: 'start', argument: 'abc' }. */
export function readCommand(text: string): { command: string; argument: string } | null {
  const match = /^\/([a-z]+)(?:@[A-Za-z0-9_]+)?(?:\s+(\S+))?/.exec(text.trim())
  if (!match) return null
  return { command: match[1], argument: match[2] ?? '' }
}

async function answer(message: Message, deps: TelegramDeps): Promise<Response> {
  const { chatId } = message
  const command = readCommand(message.text)
  const linked = await deps.chat(chatId)
  const language = linked?.language ?? message.userLanguage
  const t = TEXTS[language]

  switch (command?.command) {
    case 'start': {
      if (!command.argument) return reply(chatId, linked ? t.help : t.welcome)
      if (!CODE_PATTERN.test(command.argument)) return reply(chatId, t.invalid)
      const result = await deps.claim(command.argument, chatId)
      if (result.status === 'invalid') return reply(chatId, t.invalid)
      const now = TEXTS[result.language]
      if (result.status === 'too_many') return reply(chatId, now.tooMany)
      return reply(
        chatId,
        result.children.length > 0
          ? now.linked(childrenLine(result.children, result.language))
          : now.linkedNoChildren,
      )
    }
    case 'stop':
      return reply(chatId, (await deps.unlink(chatId)) ? t.stopped : t.notLinked)
    case 'report': {
      if (!linked) return reply(chatId, t.notLinked)
      const report = await deps.report(linked.link_id, 'weekly')
      const text = report ? formatReport(report) : null
      return reply(chatId, text ?? t.noChildren)
    }
    case 'pro':
      return reply(chatId, linked ? formatPro(linked.pro, language) : t.notLinked)
    case 'lang': {
      const wanted = command.argument.toLowerCase()
      if (wanted !== 'uz' && wanted !== 'ru' && wanted !== 'en')
        return reply(chatId, t.languagePick)
      if (!linked) return reply(chatId, t.notLinked)
      await deps.setLanguage(chatId, wanted)
      return reply(chatId, TEXTS[wanted].languageSet)
    }
    case 'privacy':
      return reply(chatId, t.privacy)
    default:
      return reply(chatId, linked ? t.help : t.welcome)
  }
}

export async function handleTelegram(request: Request, deps: TelegramDeps): Promise<Response> {
  if (request.method !== 'POST') return new Response('method not allowed', { status: 405 })
  const secret = deps.env('TELEGRAM_WEBHOOK_SECRET') ?? ''
  if (secret.length < 32) {
    deps.log?.('[telegram] TELEGRAM_WEBHOOK_SECRET is missing or shorter than 32 characters')
    return new Response('unavailable', { status: 503 })
  }
  const given = request.headers.get('X-Telegram-Bot-Api-Secret-Token') ?? ''
  if (!sameSecret(given, secret)) return new Response('forbidden', { status: 401 })
  const body = await request.text()
  if (body.length > MAX_UPDATE_BYTES) return ok()
  let update: unknown
  try {
    update = JSON.parse(body)
  } catch {
    return ok()
  }
  const message = readMessage(update)
  if (!message) return ok()
  try {
    return await answer(message, deps)
  } catch (error) {
    // Telegram retries a failed webhook; a server error here should not repeat a reply
    deps.log?.('[telegram] update failed', error)
    return ok()
  }
}

/** A send gives up after this long (below the worker's JOB_TIMEOUT_MS). */
export const SEND_TIMEOUT_MS = 10_000

/** What sending a message ended in: sent, or the chat is gone for good. */
export type SendResult = 'sent' | 'gone'

/** POSTs sendMessage. 403 (blocked) or "chat not found" is `gone`; other failures throw (retried). */
export async function sendTelegramMessage(
  token: string,
  chatId: number,
  text: string,
  fetchFn: typeof fetch = fetch,
): Promise<SendResult> {
  let response: Response
  try {
    response = await fetchFn(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      // given up before the worker's own limit, so a late delivery is not sent again
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    })
  } catch {
    // a network error names the URL, and the URL holds the token: never pass it on
    throw new Error('telegram: network')
  }
  if (response.ok) return 'sent'
  let description = ''
  try {
    description = String(((await response.json()) as { description?: unknown }).description ?? '')
  } catch {
    // no JSON body
  }
  if (response.status === 403 || (response.status === 400 && /chat not found/i.test(description))) {
    return 'gone'
  }
  // the token never appears in the error
  throw new Error(`telegram: ${response.status}`)
}

const KINDS: readonly ReportKind[] = ['weekly', 'daily', 'reminder']

export interface SendJobDeps {
  env: Env
  report(linkId: number, kind: ReportKind): Promise<Report | null>
  unlink(chatId: number): Promise<boolean>
  fetch?: typeof fetch
}

/** The worker's `telegram_send` job: { link_id, kind }. */
export function telegramSendJob(deps: SendJobDeps): JobHandler {
  return async (payload) => {
    const { link_id: linkId, kind } = (payload ?? {}) as { link_id?: unknown; kind?: unknown }
    if (
      typeof linkId !== 'number' ||
      !Number.isSafeInteger(linkId) ||
      !KINDS.includes(kind as ReportKind)
    ) {
      throw new PermanentJobError('telegram_send: bad payload')
    }
    const token = deps.env('TELEGRAM_BOT_TOKEN') ?? ''
    if (!token) throw new Error('telegram_send: TELEGRAM_BOT_TOKEN is not set')
    const report = await deps.report(linkId, kind as ReportKind)
    // unlinked since it was queued: nothing to send
    if (!report) return
    const text = formatReport(report)
    if (!text) return
    if ((await sendTelegramMessage(token, report.chat_id, text, deps.fetch)) === 'gone') {
      await deps.unlink(report.chat_id)
    }
  }
}

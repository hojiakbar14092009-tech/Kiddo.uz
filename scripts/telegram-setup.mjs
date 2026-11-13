/**
 * The Kiddo bot's profile in Telegram: the command menu, the description (shown before Start)
 * and the short description (profile and shares), in Uzbek (also the default), Russian and English.
 *   node scripts/telegram-setup.mjs
 * Reads TELEGRAM_BOT_TOKEN from .env.local (or the environment) and prints only "ok" or an error
 * code per call, never the token or Telegram's reply. Safe to run again: each call replaces the
 * same setting. The commands are the ones server/notify.ts answers (/start, /hisobot, /til, /stop).
 */
import { existsSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export const COMMANDS = {
  uz: {
    start: 'Boshlash va xabarnomalarni qayta yoqish',
    hisobot: 'Oxirgi haftalik hisobot',
    til: 'Xabarlar tili',
    stop: 'Xabarlarni o‘chirish',
  },
  ru: {
    start: 'Начать и снова включить уведомления',
    hisobot: 'Последний недельный отчёт',
    til: 'Язык сообщений',
    stop: 'Отключить сообщения',
  },
  en: {
    start: 'Start and turn notifications on again',
    hisobot: 'The latest weekly report',
    til: 'Message language',
    stop: 'Turn messages off',
  },
}

/** Telegram allows up to 512 characters. */
export const DESCRIPTION = {
  uz: 'Kiddo ota-onalar uchun: kirish kodi va farzandingiz haqida haftalik hisobot (nima mashq qilindi, qancha vaqt, nimani takrorlash foydali). Bolani baholamaymiz va hech kim bilan taqqoslamaymiz. Xabarlarni istalgan vaqtda /stop bilan o‘chirish mumkin.',
  ru: 'Kiddo для родителей: код входа и недельный отчёт о ребёнке (что повторяли, сколько времени, что полезно повторить). Мы не оцениваем ребёнка и ни с кем не сравниваем. Сообщения можно отключить в любой момент командой /stop.',
  en: 'Kiddo for parents: your sign-in code and a weekly report about your child (what was practised, how long, what is worth practising). We never grade your child or compare them with anyone. Turn messages off any time with /stop.',
}

/** Telegram allows up to 120 characters. */
export const SHORT_DESCRIPTION = {
  uz: 'Kiddo: ota-onalar uchun haftalik hisobot. Bolani baholamaydi. O‘chirish: /stop',
  ru: 'Kiddo: недельный отчёт для родителей. Без оценок ребёнка. Отключить: /stop',
  en: 'Kiddo: a weekly report for parents. No grades for your child. Turn off: /stop',
}

/** Every call, Uzbek first without a language code (the default for every other language). */
export function requests() {
  const out = []
  for (const [lang, code] of [
    ['uz', undefined],
    ['uz', 'uz'],
    ['ru', 'ru'],
    ['en', 'en'],
  ]) {
    const language = code ? { language_code: code } : {}
    const commands = Object.entries(COMMANDS[lang]).map(([command, description]) => ({
      command,
      description,
    }))
    out.push(
      { label: code ?? 'default', method: 'setMyCommands', body: { commands, ...language } },
      {
        label: code ?? 'default',
        method: 'setMyDescription',
        body: { description: DESCRIPTION[lang], ...language },
      },
      {
        label: code ?? 'default',
        method: 'setMyShortDescription',
        body: { short_description: SHORT_DESCRIPTION[lang], ...language },
      },
    )
  }
  return out
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Sends every call; a 429 waits Telegram's retry_after once. Returns how many failed. */
export async function setup(token, { fetch: send = fetch, log = console.log, wait = sleep } = {}) {
  let failed = 0
  for (const { label, method, body } of requests()) {
    let result = { ok: false, error_code: 'network' }
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await send(`https://api.telegram.org/bot${token}/${method}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        })
        result = await response.json().catch(() => ({ ok: false, error_code: response.status }))
      } catch {
        result = { ok: false, error_code: 'network' }
      }
      const retryAfter = Number(result.parameters?.retry_after)
      if (result.ok || result.error_code !== 429 || attempt > 0 || !(retryAfter <= 30)) break
      await wait(retryAfter * 1000)
    }
    if (!result.ok) failed += 1
    log(`${method} ${label}: ${result.ok ? 'ok' : `xato ${result.error_code ?? 'unknown'}`}`)
  }
  return failed
}

function tokenFromEnv() {
  if (process.env.TELEGRAM_BOT_TOKEN?.trim()) return process.env.TELEGRAM_BOT_TOKEN.trim()
  if (!existsSync('.env.local')) return ''
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*TELEGRAM_BOT_TOKEN\s*=\s*(.*)$/)
    if (match) return match[1].trim().replace(/^["']|["']$/g, '')
  }
  return ''
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const token = tokenFromEnv()
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN is missing (.env.local or the environment)')
    process.exit(1)
  }
  process.exitCode = (await setup(token)) > 0 ? 1 : 0
}

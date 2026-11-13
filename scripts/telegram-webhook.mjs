/**
 * Points the Kiddo bot at the deployed API (run once after deploying, and after changing
 * TELEGRAM_WEBHOOK_SECRET):
 *   node scripts/telegram-webhook.mjs https://kiddo.uz
 * Reads TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET from .env.local (or the environment);
 * prints no secret. Telegram then sends that secret in X-Telegram-Bot-Api-Secret-Token on every
 * update, and the server refuses an update without it (server/telegram.ts telegramWebhook).
 */
import { existsSync, readFileSync } from 'node:fs'

const base = process.argv[2]
if (!base?.startsWith('https://'))
  throw new Error('usage: node scripts/telegram-webhook.mjs https://<your domain>')
const env = { ...process.env }
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (match && env[match[1]] === undefined)
      env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '')
  }
}
for (const name of ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET'])
  if (!env[name]) throw new Error(`${name} is missing`)
const secret = env.TELEGRAM_WEBHOOK_SECRET
// Telegram accepts 1-256 characters: A-Z, a-z, 0-9, _ and -
if (!/^[A-Za-z0-9_-]{1,256}$/.test(secret))
  throw new Error('TELEGRAM_WEBHOOK_SECRET has characters Telegram does not accept')
const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    url: `${base.replace(/\/$/, '')}/api/telegram/webhook`,
    secret_token: secret,
    // callback_query: the bot's menu, settings and "this was not me" buttons
    allowed_updates: ['message', 'callback_query'],
  }),
})
const body = await response.json()
console.log(body.ok ? 'webhook set' : `failed: ${body.description}`)

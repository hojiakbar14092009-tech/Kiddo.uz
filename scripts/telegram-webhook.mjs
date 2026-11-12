/**
 * Points the Kiddo bot at the deployed API (run once after deploying, and after changing AUTH_SECRET):
 *   node scripts/telegram-webhook.mjs https://kiddo.uz
 * Reads TELEGRAM_BOT_TOKEN and AUTH_SECRET from .env.local (or the environment); prints no secret.
 * The secret header is the same HMAC the server checks (server/telegram.ts webhookSecret).
 */
import { createHmac } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'

const base = process.argv[2]
if (!base?.startsWith('https://')) throw new Error('usage: node scripts/telegram-webhook.mjs https://<your domain>')
const env = { ...process.env }
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (match && env[match[1]] === undefined) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '')
  }
}
for (const name of ['TELEGRAM_BOT_TOKEN', 'AUTH_SECRET']) if (!env[name]) throw new Error(`${name} is missing`)
const secret = createHmac('sha256', env.AUTH_SECRET).update('telegram-webhook').digest('hex').slice(0, 64)
const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ url: `${base.replace(/\/$/, '')}/api/telegram/webhook`, secret_token: secret, allowed_updates: ['message'] }),
})
const body = await response.json()
console.log(body.ok ? 'webhook set' : `failed: ${body.description}`)

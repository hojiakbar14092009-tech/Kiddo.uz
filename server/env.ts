import { HttpError } from './http.js'

/** A server setting (Vercel environment variable), trimmed; empty counts as missing. */
export function env(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value ? value : undefined
}

/** A setting the request cannot work without: a clear 503, never a crash or a leak of which value. */
export function requireEnv(name: string): string {
  const value = env(name)
  if (!value) throw new HttpError(503, 'not_configured', { setting: name })
  return value
}

/** The bot's username without a leading @ or spaces (TELEGRAM_BOT_USERNAME). */
export const botUsername = (): string | undefined => env('TELEGRAM_BOT_USERNAME')?.replace(/^@+/, '').replace(/\s+/g, '') || undefined

import type { Language } from '@/content/languages'
import { getSupabase } from './client'

/*
 * The parents' Telegram bot (Phase 56): a one-time link from the parent area
 * connects a chat to the family account (migration 0022). The app never sees
 * a chat id: only the row id and its settings.
 */

/** The bot's username from the build (without @), or '' when the app has no bot. */
export const TELEGRAM_BOT = (import.meta.env.VITE_TELEGRAM_BOT ?? '').trim().replace(/^@/, '')

/** A Telegram username: 5–32 letters, digits or _, ending in "bot". */
export const isTelegramBotName = (name: string) =>
  /^[A-Za-z][A-Za-z0-9_]{3,30}[Bb][Oo][Tt]$/.test(name)

/** How long a link works (the server decides; this is what the parent is told). */
export const LINK_MINUTES = 10

export interface TelegramLink {
  id: number
  language: Language
  weekly: boolean
  daily: boolean
  reminders: boolean
  sendHour: number
  createdAt: string
}

export type TelegramSettings = Omit<TelegramLink, 'id' | 'createdAt'>

/** t.me/<bot>?start=<code> */
export function telegramStartUrl(bot: string, code: string): string {
  return `https://t.me/${encodeURIComponent(bot)}?start=${encodeURIComponent(code)}`
}

export type CodeResult = { code: string } | { error: 'too_many' | 'failed' }

/** A new one-time code for this parent (the bot's messages come in `language`). */
export async function createTelegramCode(language: Language): Promise<CodeResult> {
  const supabase = getSupabase()
  if (!supabase) return { error: 'failed' }
  const { data, error } = await supabase.rpc('telegram_link_code', { p_language: language })
  if (error) return { error: error.message.includes('too_many_codes') ? 'too_many' : 'failed' }
  return typeof data === 'string' && /^[0-9a-f]{32}$/.test(data)
    ? { code: data }
    : { error: 'failed' }
}

interface LinkRow {
  id: number
  language: string
  weekly: boolean
  daily: boolean
  reminders: boolean
  send_hour: number
  created_at: string
}

const asLanguage = (value: string): Language => (value === 'ru' || value === 'en' ? value : 'uz')

/** This parent's linked chats, oldest first; null when they could not be read. */
export async function listTelegramLinks(): Promise<TelegramLink[] | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase.rpc('telegram_my_links')
  if (error || !Array.isArray(data)) return null
  return (data as LinkRow[]).map((row) => ({
    id: Number(row.id),
    language: asLanguage(row.language),
    weekly: row.weekly,
    daily: row.daily,
    reminders: row.reminders,
    sendHour: Number(row.send_hour),
    createdAt: row.created_at,
  }))
}

export async function updateTelegramLink(id: number, settings: TelegramSettings): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false
  const { data, error } = await supabase.rpc('telegram_update_link', {
    p_id: id,
    p_language: settings.language,
    p_weekly: settings.weekly,
    p_daily: settings.daily,
    p_reminders: settings.reminders,
    p_send_hour: settings.sendHour,
  })
  return !error && data === true
}

export async function unlinkTelegram(id: number): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false
  const { data, error } = await supabase.rpc('telegram_unlink', { p_id: id })
  return !error && data === true
}

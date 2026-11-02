// POST /functions/v1/telegram – the parents' bot webhook (Phase 56). Telegram calls it
// with the secret given to setWebhook. Logic: ../_shared/telegram.ts.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import {
  handleTelegram,
  type ChatInfo,
  type ClaimResult,
  type TelegramDeps,
} from '../_shared/telegram.ts'
import type { Report } from '../_shared/telegramText.ts'

const env = (name: string) => Deno.env.get(name)
const admin = createClient(env('SUPABASE_URL') ?? '', env('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

async function call<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await admin.rpc(name, args)
  if (error) throw new Error(`${name}: ${error.message}`)
  return data as T
}

const deps: TelegramDeps = {
  env,
  claim: (code, chatId) => call<ClaimResult>('telegram_claim', { p_code: code, p_chat_id: chatId }),
  unlink: (chatId) => call<boolean>('telegram_unlink_chat', { p_chat_id: chatId }),
  setLanguage: (chatId, language) =>
    call<boolean>('telegram_set_language', { p_chat_id: chatId, p_language: language }),
  chat: (chatId) => call<ChatInfo | null>('telegram_chat', { p_chat_id: chatId }),
  report: (linkId, kind) =>
    call<Report | null>('telegram_report', { p_link_id: linkId, p_kind: kind }),
  log(message, error) {
    // never the message text: only what failed
    console.error(message, error instanceof Error ? error.message : String(error ?? ''))
  },
}

Deno.serve((request) => handleTelegram(request, deps))

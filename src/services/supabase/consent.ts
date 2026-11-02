import type { SupabaseClient, User } from '@supabase/supabase-js'
import { getSupabase } from './client'

/*
 * The parent's consent (Phase 44): given on this device before a new account can be made
 * (a password sign-up, Google, or an e-mail link may create one), then kept with the account
 * (`account_consents`, migration 0018). A sign-up also carries it in the account's metadata, so
 * a confirmation opened elsewhere still has it. Every cloud sign-in checks the account's row:
 * without one for this version the parent is asked again before going on (ConsentGate).
 */

/** The consent text's version: a new text asks again. */
export const CONSENT_VERSION = '2026-11'
const PENDING_KEY = 'kiddo.consent.pending'
/** A consent given on this device counts for an account made within this time. */
const PENDING_MS = 7 * 24 * 60 * 60 * 1000

/** What a new account carries in its metadata (sign-up, e-mail link). */
export const consentMetadata = () => ({ consent_version: CONSENT_VERSION })

/** Remembers on this device (also across the trip to Google or the mail app) that consent was given. */
export function rememberConsent(now = Date.now()): void {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ version: CONSENT_VERSION, at: now }))
  } catch {
    // storage blocked: the account is asked again after signing in
  }
}

function pendingConsent(now: number): boolean {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return false
    const value = JSON.parse(raw) as { version?: unknown; at?: unknown }
    return (
      value.version === CONSENT_VERSION &&
      typeof value.at === 'number' &&
      now - value.at >= 0 &&
      now - value.at < PENDING_MS
    )
  } catch {
    return false
  }
}

function forgetPending(): void {
  try {
    localStorage.removeItem(PENDING_KEY)
  } catch {
    // nothing to forget
  }
}

export type ConsentState = 'ok' | 'needed' | 'unknown'

async function store(supabase: SupabaseClient): Promise<boolean> {
  const { error } = await supabase
    .from('account_consents')
    .upsert({ version: CONSENT_VERSION, accepted_at: new Date().toISOString() })
  if (error) return false
  forgetPending()
  return true
}

/**
 * The signed-in account's consent: `ok` (on record, or given before signing in and saved now),
 * `needed` (ask the parent before going on), `unknown` (the cloud cannot be read: not blocked).
 */
export async function ensureConsent(
  supabase: SupabaseClient,
  user: Pick<User, 'user_metadata'> | null,
  now = Date.now(),
): Promise<ConsentState> {
  try {
    const { data, error } = await supabase.from('account_consents').select('version').maybeSingle()
    if (error) return 'unknown'
    if ((data as { version?: string } | null)?.version === CONSENT_VERSION) {
      forgetPending()
      return 'ok'
    }
    const given = pendingConsent(now) || user?.user_metadata?.consent_version === CONSENT_VERSION
    if (!given) return 'needed'
    return (await store(supabase)) ? 'ok' : 'unknown'
  } catch {
    return 'unknown'
  }
}

/** The parent agreed now (asked again after signing in). */
export async function acceptConsent(): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false
  try {
    return await store(supabase)
  } catch {
    return false
  }
}

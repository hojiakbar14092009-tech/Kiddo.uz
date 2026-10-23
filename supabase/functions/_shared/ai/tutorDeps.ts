/*
 * The real TutorDeps for the Deno Edge runtime (migration 0008). The
 * service-role key and the provider key come from the Edge Function
 * environment and never leave the server.
 */

import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import type { Env } from '../tts.ts'
import type { TutorDeps, UsageRow } from './handler.ts'
import { KIDDO_TUTOR_PROMPT_VERSION } from './policy.ts'
import type { TutorReply } from './types.ts'

function required(env: Env, name: string): string {
  const value = env(name)
  if (!value) throw new Error(`missing env ${name}`)
  return value
}

export function tutorDeps(env: Env): TutorDeps {
  const url = required(env, 'SUPABASE_URL')
  const anonKey = required(env, 'SUPABASE_ANON_KEY')
  const serviceKey = required(env, 'SUPABASE_SERVICE_ROLE_KEY')
  const options = {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  }
  const admin = createClient(url, serviceKey, options)

  return {
    env,
    async userIdFromToken(token: string) {
      const userClient = createClient(url, anonKey, {
        ...options,
        global: { headers: { Authorization: `Bearer ${token}` } },
      })
      const { data, error } = await userClient.auth.getUser(token)
      if (error || !data.user) return null
      return data.user.id
    },
    async isPro(userId: string) {
      const { data, error } = await admin.rpc('is_pro_active', { p_uid: userId })
      if (error) throw new Error(`is_pro_active: ${error.message}`)
      return data === true
    },
    async rateOk(userId, kind, limit, windowSeconds) {
      const { data, error } = await admin.rpc('audio_rate_ok', {
        p_uid: userId,
        p_kind: kind,
        p_limit: limit,
        p_window_seconds: windowSeconds,
      })
      if (error) throw new Error(`audio_rate_ok: ${error.message}`)
      return data === true
    },
    async dailyCount(kind) {
      const { data, error } = await admin.rpc('audio_daily_count', { p_kind: kind })
      if (error) throw new Error(`audio_daily_count: ${error.message}`)
      if (typeof data !== 'number') throw new Error('audio_daily_count: not a number')
      return data
    },
    async consentOk(userId, childId) {
      const { data, error } = await admin.rpc('ai_consent_ok', {
        p_uid: userId,
        p_child: childId,
        // consent counts for the policy the parent agreed to, not a later one
        p_version: KIDDO_TUTOR_PROMPT_VERSION,
      })
      if (error) throw new Error(`ai_consent_ok: ${error.message}`)
      return data === true
    },
    async cooldownUntil(provider) {
      const { data, error } = await admin
        .from('ai_provider_state')
        .select('cooldown_until')
        .eq('provider', provider)
        .maybeSingle()
      if (error) throw new Error(`ai_provider_state read: ${error.message}`)
      const until = data?.cooldown_until ? new Date(String(data.cooldown_until)).getTime() : NaN
      return Number.isFinite(until) ? until : null
    },
    async setCooldown(provider, untilMs) {
      const { error } = await admin
        .from('ai_provider_state')
        .upsert(
          { provider, cooldown_until: new Date(untilMs).toISOString() },
          { onConflict: 'provider' },
        )
      if (error) throw new Error(`ai_provider_state write: ${error.message}`)
    },
    async cacheGet(key) {
      const { data, error } = await admin
        .from('ai_cache')
        .select('reply, created_at')
        .eq('key_hash', key)
        .maybeSingle()
      if (error) throw new Error(`ai_cache read: ${error.message}`)
      if (!data) return null
      const age = Date.now() - new Date(String(data.created_at)).getTime()
      return age < 30 * 86_400_000 ? (data.reply as TutorReply) : null
    },
    async cachePut(key, language, reply) {
      const { error } = await admin
        .from('ai_cache')
        .upsert(
          { key_hash: key, language, reply, created_at: new Date().toISOString() },
          { onConflict: 'key_hash' },
        )
      if (error) throw new Error(`ai_cache write: ${error.message}`)
    },
    async recordUsage(row: UsageRow) {
      const { error } = await admin.from('ai_usage').insert({
        provider: row.provider,
        model: row.model,
        outcome: row.outcome,
        latency_bucket: row.latencyBucket,
        prompt_tokens: row.promptTokens,
        output_tokens: row.outputTokens,
        policy_version: row.policyVersion,
        problem: row.problem,
      })
      if (error) throw new Error(`ai_usage write: ${error.message}`)
    },
    log(message: string, error?: unknown) {
      // messages only; never tokens, keys, requests or replies
      console.error(message, error instanceof Error ? error.message : String(error))
    },
  }
}

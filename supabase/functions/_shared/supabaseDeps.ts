/*
 * The real AudioDeps for the Deno Edge runtime: Supabase Auth with the anon
 * key + the caller's token (who is calling), and a service-role client (PRO
 * check, rate limit, private bucket, tts_cache). The service-role key comes
 * from the Edge Function environment and never leaves the server.
 */

import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import type { AudioDeps, AudioKind } from './handlers.ts'
import type { Env } from './tts.ts'
import type { Language } from './validate.ts'

const BUCKET = 'voice'

function required(env: Env, name: string): string {
  const value = env(name)
  if (!value) throw new Error(`missing env ${name}`)
  return value
}

export function supabaseDeps(env: Env): AudioDeps {
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
    async rateOk(
      userId: string,
      kind: AudioKind,
      limit: number,
      windowSeconds: number,
      dailyLimit?: number,
    ) {
      const { data, error } = await admin.rpc('audio_rate_ok', {
        p_uid: userId,
        p_kind: kind,
        p_limit: limit,
        p_window_seconds: windowSeconds,
        // the five-argument form (0010) also checks the last 24 hours
        ...(dailyLimit === undefined ? {} : { p_daily_limit: dailyLimit }),
      })
      if (error) throw new Error(`audio_rate_ok: ${error.message}`)
      return data === true
    },
    async dailyCount(kind: AudioKind) {
      const { data, error } = await admin.rpc('audio_daily_count', { p_kind: kind })
      if (error) throw new Error(`audio_daily_count: ${error.message}`)
      if (typeof data !== 'number') throw new Error('audio_daily_count: not a number')
      return data
    },
    async signUrls(paths: string[], expiresIn: number) {
      const out: Record<string, string> = {}
      if (paths.length === 0) return out
      const { data, error } = await admin.storage.from(BUCKET).createSignedUrls(paths, expiresIn)
      if (error) throw new Error(`createSignedUrls: ${error.message}`)
      // A missing object comes back with an error and no signedUrl: left out.
      for (const item of data ?? []) {
        if (item.path && item.signedUrl && !item.error) out[item.path] = item.signedUrl
      }
      return out
    },
    async findTts(language: Language, hash: string) {
      const { data, error } = await admin
        .from('tts_cache')
        .select('path, voice')
        .eq('language', language)
        .eq('text_hash', hash)
        .maybeSingle()
      if (error) throw new Error(`tts_cache read: ${error.message}`)
      return data ? { path: String(data.path), voice: String(data.voice) } : null
    },
    async storeAudio(path: string, bytes: Uint8Array) {
      const { error } = await admin.storage.from(BUCKET).upload(path, bytes, {
        contentType: 'audio/mpeg',
        cacheControl: '31536000',
        upsert: true,
      })
      if (error) throw new Error(`upload: ${error.message}`)
    },
    async rememberTts(language: Language, hash: string, path: string, voice: string) {
      const { error } = await admin
        .from('tts_cache')
        .upsert(
          { language, text_hash: hash, path, voice, created_at: new Date().toISOString() },
          { onConflict: 'language,text_hash' },
        )
      if (error) throw new Error(`tts_cache write: ${error.message}`)
    },
    log(message: string, error?: unknown) {
      // Messages only; never tokens, keys or request bodies.
      console.error(message, error instanceof Error ? error.message : String(error))
    },
  }
}

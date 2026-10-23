#!/usr/bin/env node
/*
 * Removes generated TTS sentences older than the TTL (default 30 days) from
 * the private bucket `voice` and from public.tts_cache (migration 0007).
 * Objects are removed through the Storage API first; only the rows whose
 * objects are gone are deleted, so a failed run is simply run again.
 * Docs: docs/architecture/supabase-verification.md §7.
 *
 *   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=… \
 *     node scripts/voices/cleanup-tts.mjs [--days=30] [--dry-run]
 *
 * The keys come from the environment only (never from a file in the repo).
 */

import { createClient } from '@supabase/supabase-js'

const BUCKET = 'voice'
const BATCH = 500
const TTS_PATH = /^tts\/(uz|ru|en)\/[0-9a-f]{64}\.mp3$/

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const daysArg = args.find((a) => a.startsWith('--days='))
const days = daysArg ? Number(daysArg.split('=')[1]) : 30
const unknown = args.filter((a) => a !== '--dry-run' && !a.startsWith('--days='))
if (unknown.length || !Number.isInteger(days) || days < 1 || days > 3650) {
  console.error('Usage: node scripts/voices/cleanup-tts.mjs [--days=30] [--dry-run]')
  process.exit(2)
}

function looksLikeServiceKey(key) {
  if (key.startsWith('sb_secret_')) return true
  if (key.startsWith('sb_publishable_')) return false
  const payload = key.split('.')[1]
  if (!payload) return false
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).role === 'service_role'
  } catch {
    return false
  }
}

async function main() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || !looksLikeServiceKey(key)) {
    console.error(
      'Set SUPABASE_URL and a service-role SUPABASE_SERVICE_ROLE_KEY in the environment.',
    )
    process.exit(2)
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let removed = 0
  for (;;) {
    const { data, error } = await supabase.rpc('tts_cache_expired', {
      p_days: days,
      p_limit: BATCH,
    })
    if (error) throw new Error(`tts_cache_expired: ${error.message}`)
    // only generated sentences, never a recorded clip
    const paths = (data ?? []).filter((path) => typeof path === 'string' && TTS_PATH.test(path))
    if (paths.length === 0) break
    if (dryRun) {
      console.log(
        `Would remove ${paths.length}${paths.length === BATCH ? '+' : ''} sentence(s) older than ${days} days.`,
      )
      return
    }
    const { error: storageError } = await supabase.storage.from(BUCKET).remove(paths)
    if (storageError) throw new Error(`storage remove: ${storageError.message}`)
    const { error: rowError } = await supabase.from('tts_cache').delete().in('path', paths)
    if (rowError) throw new Error(`tts_cache delete: ${rowError.message}`)
    removed += paths.length
    if (paths.length < BATCH) break
  }
  console.log(`Removed ${removed} generated sentence(s) older than ${days} days.`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})

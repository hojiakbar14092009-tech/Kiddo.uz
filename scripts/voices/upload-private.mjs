#!/usr/bin/env node
/*
 * Uploads the recorded voice clips (public/audio/voice/<lang>/<key>.mp3) to
 * the PRIVATE Supabase Storage bucket `voice` (migration 0007), as
 * `<lang>/<key>.mp3`. Clips already in the bucket are skipped, nothing is
 * deleted or overwritten. Docs: docs/architecture/supabase-verification.md §7.
 *
 *   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=… \
 *     node scripts/voices/upload-private.mjs [--dry-run] [--concurrency=8]
 *
 * The keys come from the environment only (never from a file in the repo).
 * --dry-run lists what would be uploaded; with the env set it also compares
 * with the bucket, without it only counts the local clips.
 */

import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'voice'
const LANGUAGES = ['uz', 'ru', 'en']
const KEY_FILE = /^[0-9a-f]{8}\.mp3$/
const ROOT = fileURLToPath(new URL('../../public/audio/voice/', import.meta.url))

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const concurrencyArg = args.find((a) => a.startsWith('--concurrency='))
const concurrency = Math.min(32, Math.max(1, Number(concurrencyArg?.split('=')[1]) || 8))
const unknown = args.filter((a) => a !== '--dry-run' && !a.startsWith('--concurrency='))
if (unknown.length) {
  console.error(`Unknown argument(s): ${unknown.join(' ')}`)
  process.exit(2)
}

/** Refuses an anon/authenticated JWT given by mistake (new `sb_secret_` keys pass). */
function looksLikeServiceKey(key) {
  if (key.startsWith('sb_secret_')) return true
  if (key.startsWith('sb_publishable_')) return false
  const payload = key.split('.')[1]
  if (!payload) return false
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return claims.role === 'service_role'
  } catch {
    return false
  }
}

async function localClips() {
  const clips = []
  let ignored = 0
  for (const lang of LANGUAGES) {
    let names = []
    try {
      names = await readdir(join(ROOT, lang))
    } catch {
      continue
    }
    for (const name of names.sort()) {
      if (KEY_FILE.test(name)) clips.push({ path: `${lang}/${name}`, file: join(ROOT, lang, name) })
      else ignored += 1
    }
  }
  return { clips, ignored }
}

async function remoteNames(storage, lang) {
  const names = new Set()
  const limit = 1000
  for (let offset = 0; ; offset += limit) {
    const { data, error } = await storage.list(lang, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error) throw new Error(`listing ${lang}/ failed: ${error.message}`)
    for (const item of data ?? []) names.add(`${lang}/${item.name}`)
    if (!data || data.length < limit) break
  }
  return names
}

async function uploadOne(storage, clip) {
  const bytes = await readFile(clip.file)
  for (let attempt = 1; ; attempt += 1) {
    const { error } = await storage.upload(clip.path, bytes, {
      contentType: 'audio/mpeg',
      cacheControl: '31536000',
      upsert: false,
    })
    if (!error) return 'uploaded'
    if (/exists|duplicate/i.test(error.message)) return 'existing'
    if (attempt >= 3) throw new Error(error.message)
    await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
  }
}

async function main() {
  const { clips, ignored } = await localClips()
  console.log(
    `Local clips: ${clips.length} in ${relative(process.cwd(), ROOT) || ROOT} (${ignored} other files ignored)`,
  )

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    if (dryRun) {
      console.log('Dry run without SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY: bucket not compared.')
      return
    }
    console.error(
      'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment (not in a file).',
    )
    process.exit(2)
  }
  if (
    !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url) &&
    !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(url)
  ) {
    console.error('SUPABASE_URL must look like https://<ref>.supabase.co')
    process.exit(2)
  }
  if (!looksLikeServiceKey(key)) {
    console.error(
      'SUPABASE_SERVICE_ROLE_KEY is not a service-role key (anon/publishable keys cannot write the private bucket).',
    )
    process.exit(2)
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: bucket, error: bucketError } = await supabase.storage.getBucket(BUCKET)
  if (bucketError || !bucket) {
    console.error(`Bucket "${BUCKET}" not found – apply supabase/migrations/0007_audio.sql first.`)
    process.exit(1)
  }
  if (bucket.public) {
    console.error(
      `Bucket "${BUCKET}" is PUBLIC – refusing to upload. Re-apply 0007 (it makes the bucket private).`,
    )
    process.exit(1)
  }

  const existing = new Set()
  for (const lang of LANGUAGES)
    for (const name of await remoteNames(supabase.storage.from(BUCKET), lang)) existing.add(name)
  const todo = clips.filter((clip) => !existing.has(clip.path))
  console.log(`Already in the bucket: ${clips.length - todo.length} · to upload: ${todo.length}`)
  if (dryRun) {
    for (const clip of todo.slice(0, 20)) console.log(`  would upload ${clip.path}`)
    if (todo.length > 20) console.log(`  … and ${todo.length - 20} more`)
    console.log('Dry run: nothing uploaded.')
    return
  }

  const storage = supabase.storage.from(BUCKET)
  const counts = { uploaded: 0, existing: 0, failed: 0 }
  const failures = []
  let next = 0
  let done = 0
  async function worker() {
    while (next < todo.length) {
      const clip = todo[next++]
      try {
        counts[await uploadOne(storage, clip)] += 1
      } catch (error) {
        counts.failed += 1
        failures.push(`${clip.path}: ${error instanceof Error ? error.message : String(error)}`)
      }
      done += 1
      if (done % 250 === 0) console.log(`  ${done}/${todo.length}`)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))

  console.log(
    `Done. uploaded ${counts.uploaded} · skipped ${clips.length - todo.length + counts.existing} (already there) · failed ${counts.failed}`,
  )
  for (const line of failures.slice(0, 20)) console.error(`  failed ${line}`)
  if (counts.failed) process.exit(1)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})

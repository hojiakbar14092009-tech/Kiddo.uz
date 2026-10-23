/*
 * Request handling of `voice-url` and `tts`, with every outside effect
 * (Supabase Auth, the database, Storage, the TTS provider) passed in as
 * `AudioDeps`, so the whole flow is tested under Node with fakes. The Deno
 * entry points only build the real deps (`supabaseDeps.ts`) and call these.
 *
 * Order: CORS preflight → method (405) → token present → body valid → token
 * valid (401) → per-user `auth` rate count (429, every signed-in call, so a
 * free account cannot hammer the PRO check) → PRO on the server (403) → [tts:
 * provider has a voice (503) → global daily cap (429)] → per-user rate limit
 * (429) → work. Contract: docs/architecture/audio-security.md.
 */

import {
  bearerToken,
  corsHeaders,
  envInt,
  errorResponse,
  jsonResponse,
  parseAllowedOrigins,
  readJsonBody,
} from './http.ts'
import { type Env, selectTts, ttsHash, ttsPath, type TtsProvider } from './tts.ts'
import { type Language, parseTtsRequest, parseVoiceKeys, voicePath } from './validate.ts'

/** Lifetime of every signed URL (seconds), as in the contract. */
export const SIGNED_URL_SECONDS = 300
/** Defaults when the secrets are unset: 30 generated sentences per user per hour, 2000 a day in all. */
export const DEFAULT_TTS_RATE_LIMIT = 30
export const DEFAULT_TTS_DAILY_CAP = 2000

export type AudioKind = 'voice' | 'tts' | 'auth'

export interface CachedTts {
  path: string
  voice: string
}

export interface AudioDeps {
  env: Env
  /** The user id the access token belongs to, or null when it is not a valid session. */
  userIdFromToken(token: string): Promise<string | null>
  /** public.is_pro_active (service role). */
  isPro(userId: string): Promise<boolean>
  /** public.audio_rate_ok (service role): true = allowed and counted. */
  rateOk(userId: string, kind: AudioKind, limit: number, windowSeconds: number): Promise<boolean>
  /** public.audio_daily_count (service role): every user's requests of a kind since 00:00 UTC. */
  dailyCount(kind: AudioKind): Promise<number>
  /** Signed URLs for objects in bucket `voice`; paths without an object are left out. */
  signUrls(paths: string[], expiresIn: number): Promise<Record<string, string>>
  /** The tts_cache row, or null. */
  findTts(language: Language, hash: string): Promise<CachedTts | null>
  /** Uploads (overwrites) an MP3 into bucket `voice`. */
  storeAudio(path: string, bytes: Uint8Array): Promise<void>
  /** Upserts the tts_cache row. */
  rememberTts(language: Language, hash: string, path: string, voice: string): Promise<void>
  /** Picks the TTS provider (defaults to selectTts on env). */
  chooseTts?(language: Language): { provider: TtsProvider; voice: string } | null
  log?(message: string, error?: unknown): void
}

interface Prepared {
  cors: Record<string, string>
  userId: string
  body: unknown
}

/** Shared front part: preflight, method, auth, body, PRO. Returns a Response to send, or the caller. */
async function prepare(request: Request, deps: AudioDeps): Promise<Response | Prepared> {
  const cors = corsHeaders(
    request.headers.get('Origin'),
    parseAllowedOrigins(deps.env('ALLOWED_ORIGINS')),
  )
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'bad_request' }, { ...cors, Allow: 'POST, OPTIONS' })
  }
  const token = bearerToken(request)
  if (!token) return errorResponse('not_signed_in', cors)
  const body = await readJsonBody(request)
  if (body === undefined) return errorResponse('bad_request', cors)
  const userId = await deps.userIdFromToken(token)
  if (!userId) return errorResponse('not_signed_in', cors)
  // Cheap and generous, but before the PRO lookup: also counts free accounts.
  const authLimit = envInt(deps.env('AUTH_RATE_LIMIT'), 300, 1, 100000)
  const authWindow = envInt(deps.env('AUTH_RATE_WINDOW_S'), 60, 1, 86400)
  if (!(await deps.rateOk(userId, 'auth', authLimit, authWindow))) {
    return errorResponse('rate_limited', cors)
  }
  if (!(await deps.isPro(userId))) return errorResponse('not_pro', cors)
  return { cors, userId, body }
}

function fail(
  deps: AudioDeps,
  where: string,
  error: unknown,
  cors: Record<string, string>,
): Response {
  deps.log?.(`[${where}] failed`, error)
  return errorResponse('server_error', cors)
}

/** POST /functions/v1/voice-url  { keys: ["uz/000cef41", …] } */
export async function handleVoiceUrl(request: Request, deps: AudioDeps): Promise<Response> {
  let cors: Record<string, string> = {}
  try {
    const front = await prepare(request, deps)
    if (front instanceof Response) return front
    cors = front.cors
    const keys = parseVoiceKeys(front.body)
    if (!keys) return errorResponse('bad_request', cors)
    const limit = envInt(deps.env('VOICE_RATE_LIMIT'), 120, 1, 100000)
    const windowSeconds = envInt(deps.env('VOICE_RATE_WINDOW_S'), 60, 1, 86400)
    if (!(await deps.rateOk(front.userId, 'voice', limit, windowSeconds))) {
      return errorResponse('rate_limited', cors)
    }
    const signed = await deps.signUrls(keys.map(voicePath), SIGNED_URL_SECONDS)
    const urls: Record<string, string> = {}
    for (const key of keys) {
      const url = signed[voicePath(key)]
      if (url) urls[key] = url
    }
    return jsonResponse(200, { urls, expiresIn: SIGNED_URL_SECONDS }, cors)
  } catch (error) {
    return fail(deps, 'voice-url', error, cors)
  }
}

/** POST /functions/v1/tts  { language: "uz"|"ru"|"en", text: "…" } */
export async function handleTts(request: Request, deps: AudioDeps): Promise<Response> {
  let cors: Record<string, string> = {}
  try {
    const front = await prepare(request, deps)
    if (front instanceof Response) return front
    cors = front.cors
    const input = parseTtsRequest(front.body)
    if (!input) return errorResponse('bad_request', cors)
    const choice = deps.chooseTts
      ? deps.chooseTts(input.language)
      : selectTts(deps.env, input.language)
    if (!choice) return errorResponse('unavailable', cors)
    // Global cost ceiling: every user's tts requests today (UTC) together.
    const dailyCap = envInt(deps.env('TTS_DAILY_CAP'), DEFAULT_TTS_DAILY_CAP, 1, 1000000)
    if ((await deps.dailyCount('tts')) >= dailyCap) return errorResponse('rate_limited', cors)
    const limit = envInt(deps.env('TTS_RATE_LIMIT'), DEFAULT_TTS_RATE_LIMIT, 1, 100000)
    const windowSeconds = envInt(deps.env('TTS_RATE_WINDOW_S'), 3600, 1, 86400)
    if (!(await deps.rateOk(front.userId, 'tts', limit, windowSeconds))) {
      return errorResponse('rate_limited', cors)
    }

    const hash = await ttsHash(input.language, input.text)
    const path = ttsPath(input.language, hash)
    const voiceTag = `${choice.provider.id}:${choice.voice}`
    const cached = await deps.findTts(input.language, hash)
    if (cached && cached.voice === voiceTag) {
      const url = (await deps.signUrls([cached.path], SIGNED_URL_SECONDS))[cached.path]
      if (url) return jsonResponse(200, { url, expiresIn: SIGNED_URL_SECONDS, cached: true }, cors)
      // the row outlived its object: make it again below
    }

    const bytes = await choice.provider.synthesize(input.text, input.language, choice.voice)
    await deps.storeAudio(path, bytes)
    await deps.rememberTts(input.language, hash, path, voiceTag)
    const url = (await deps.signUrls([path], SIGNED_URL_SECONDS))[path]
    if (!url) return errorResponse('server_error', cors)
    return jsonResponse(200, { url, expiresIn: SIGNED_URL_SECONDS, cached: false }, cors)
  } catch (error) {
    return fail(deps, 'tts', error, cors)
  }
}

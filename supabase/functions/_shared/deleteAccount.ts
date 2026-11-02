/*
 * Request handling of `delete-account` (Phase 44), with every outside effect
 * (Supabase Auth, Storage, the auth admin API) passed in as
 * `DeleteAccountDeps`, so the whole flow is tested under Node with fakes. The
 * Deno entry point (../delete-account/index.ts) only builds the real deps.
 *
 * Order: CORS preflight → method (405) → token present (401) → body is
 * exactly `{ "confirm": "DELETE" }` (400) → token valid (401) → remove every
 * object under `child-photos/<uid>/` and check none is left (502 otherwise,
 * and the user is NOT deleted) → auth.admin.deleteUser(uid): every family
 * row goes with it by `on delete cascade` (0018 lists the tables) → 200
 * `{ ok: true }`. A failed deleteUser answers 500; calling again is safe
 * (the photos are already gone, the user is deleted then).
 *
 * No rate limit: a one-shot destructive call by the owner of the token.
 * Never logs e-mail addresses, tokens, user ids or request bodies.
 */

import {
  bearerToken,
  corsHeaders,
  errorResponse,
  jsonResponse,
  parseAllowedOrigins,
  readJsonBody,
} from './http.ts'
import type { Env } from './tts.ts'

export const PHOTO_BUCKET = 'child-photos'
/** The exact word the parent has to send. */
export const CONFIRM_WORD = 'DELETE'
/** Storage removes at most this many objects per call. */
export const REMOVE_CHUNK = 100
/** The confirm body is tiny; anything bigger is not it. */
const MAX_CONFIRM_BYTES = 256

export interface DeleteAccountDeps {
  env: Env
  /** The user id the access token belongs to, or null when it is not a valid session. */
  userIdFromToken(token: string): Promise<string | null>
  /** Every object path under `child-photos/<userId>/` (full paths, e.g. `<uid>/c1.jpg`). Throws on failure. */
  listPhotos(userId: string): Promise<string[]>
  /** Removes these objects from `child-photos` (service role). Throws on failure. */
  removePhotos(paths: string[]): Promise<void>
  /** auth.admin.deleteUser (service role). Throws on failure. */
  deleteUser(userId: string): Promise<void>
  log?(message: string, error?: unknown): void
}

/** True only for a JSON object whose one key is `confirm` with exactly "DELETE". */
export function isDeleteConfirmation(body: unknown): boolean {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return false
  const keys = Object.keys(body)
  return (
    keys.length === 1 &&
    keys[0] === 'confirm' &&
    (body as { confirm: unknown }).confirm === CONFIRM_WORD
  )
}

/** Paths of this user only: `<uid>/<something>`; anything else is never sent to remove(). */
export function ownPhotoPaths(userId: string, paths: readonly string[]): string[] {
  const prefix = `${userId}/`
  return paths.filter((p) => p.startsWith(prefix) && p.length > prefix.length)
}

function storageFailed(cors: Record<string, string>): Response {
  return jsonResponse(502, { error: 'storage_failed' }, cors)
}

/** POST /functions/v1/delete-account  { "confirm": "DELETE" } */
export async function handleDeleteAccount(
  request: Request,
  deps: DeleteAccountDeps,
): Promise<Response> {
  const cors = corsHeaders(
    request.headers.get('Origin'),
    parseAllowedOrigins(deps.env('ALLOWED_ORIGINS')),
  )
  try {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (request.method !== 'POST') {
      return jsonResponse(405, { error: 'bad_request' }, { ...cors, Allow: 'POST, OPTIONS' })
    }
    const token = bearerToken(request)
    if (!token) return errorResponse('not_signed_in', cors)
    const body = await readJsonBody(request, MAX_CONFIRM_BYTES)
    if (!isDeleteConfirmation(body)) return errorResponse('bad_request', cors)
    const userId = await deps.userIdFromToken(token)
    if (!userId) return errorResponse('not_signed_in', cors)

    // 1. Photos first. If anything goes wrong here the account stays as it
    //    is, so a parent never ends up with a deleted login but photos left.
    try {
      const paths = ownPhotoPaths(userId, await deps.listPhotos(userId))
      for (let i = 0; i < paths.length; i += REMOVE_CHUNK) {
        await deps.removePhotos(paths.slice(i, i + REMOVE_CHUNK))
      }
      if (paths.length > 0 && ownPhotoPaths(userId, await deps.listPhotos(userId)).length > 0) {
        throw new Error('photos left after remove')
      }
    } catch (error) {
      deps.log?.('[delete-account] photo removal failed', error)
      return storageFailed(cors)
    }

    // 2. The login itself; every family row cascades from auth.users.
    try {
      await deps.deleteUser(userId)
    } catch (error) {
      deps.log?.('[delete-account] deleteUser failed', error)
      return errorResponse('server_error', cors)
    }
    return jsonResponse(200, { ok: true }, cors)
  } catch (error) {
    deps.log?.('[delete-account] failed', error)
    return errorResponse('server_error', cors)
  }
}

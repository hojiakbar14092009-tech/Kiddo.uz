/*
 * HTTP helpers shared by the `voice-url` and `tts` Edge Functions.
 * Plain TypeScript (no Deno APIs) so vitest can test it under Node.
 * Error shapes: docs/architecture/audio-security.md.
 */

export type ErrorCode =
  'bad_request' | 'not_signed_in' | 'not_pro' | 'rate_limited' | 'unavailable' | 'server_error'

export const ERROR_STATUS: Record<ErrorCode, number> = {
  bad_request: 400,
  not_signed_in: 401,
  not_pro: 403,
  rate_limited: 429,
  unavailable: 503,
  server_error: 500,
}

/** Largest request body either function accepts (20 keys or 200 characters fit easily). */
export const MAX_BODY_BYTES = 4096

/**
 * `ALLOWED_ORIGINS`: comma-separated exact origins, e.g.
 * `https://kiddo-uz.vercel.app,http://localhost:5173`. Trailing slashes are
 * dropped; `*` and anything that is not an http(s) origin are ignored.
 */
export function parseAllowedOrigins(raw: string | undefined): string[] {
  if (!raw) return []
  const out: string[] = []
  for (const part of raw.split(',')) {
    const origin = part.trim().replace(/\/+$/, '').toLowerCase()
    if (/^https?:\/\/[a-z0-9.-]+(:\d{1,5})?$/.test(origin) && !out.includes(origin)) {
      out.push(origin)
    }
  }
  return out
}

/**
 * CORS headers for a request from `origin`. Only an allowed origin is echoed;
 * any other origin gets no Access-Control-Allow-Origin, so the browser does
 * not hand it the answer. (CORS is not the security boundary – the token and
 * the server-side PRO check are – it only keeps other sites from using a
 * signed-in parent's browser.)
 */
export function corsHeaders(
  origin: string | null,
  allowed: readonly string[],
): Record<string, string> {
  const headers: Record<string, string> = { Vary: 'Origin' }
  if (origin && allowed.includes(origin.toLowerCase())) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    headers['Access-Control-Allow-Headers'] = 'authorization, x-client-info, apikey, content-type'
    headers['Access-Control-Max-Age'] = '600'
  }
  return headers
}

export function jsonResponse(
  status: number,
  body: unknown,
  cors: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      'Content-Type': 'application/json; charset=utf-8',
      // The answer can carry signed URLs: never cache it anywhere.
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export function errorResponse(code: ErrorCode, cors: Record<string, string>): Response {
  return jsonResponse(ERROR_STATUS[code], { error: code }, cors)
}

/** The token from `Authorization: Bearer <token>`, or null. */
export function bearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization') ?? ''
  const match = /^Bearer\s+([A-Za-z0-9._~+/=-]{20,4096})$/.exec(header.trim())
  return match?.[1] ?? null
}

/**
 * The JSON body, or undefined when it is missing, too large or not JSON. The
 * stream is read with a byte cap, so a body without (or with a false)
 * Content-Length is never buffered beyond `maxBytes`.
 */
export async function readJsonBody(request: Request, maxBytes = MAX_BODY_BYTES): Promise<unknown> {
  const declared = Number(request.headers.get('Content-Length') ?? '0')
  if (Number.isFinite(declared) && declared > maxBytes) return undefined
  const text = await readCapped(request, maxBytes)
  if (text === undefined) return undefined
  try {
    return JSON.parse(text) as unknown
  } catch {
    return undefined
  }
}

/** The body as UTF-8 text, or undefined when it exceeds `maxBytes` or cannot be read. */
async function readCapped(request: Request, maxBytes: number): Promise<string | undefined> {
  const stream = request.body
  if (!stream) return ''
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined)
        return undefined
      }
      chunks.push(value)
    }
  } catch {
    return undefined
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return undefined
  }
}

/** A positive integer from an env value, clamped to [min, max]; the fallback when unset or invalid. */
export function envInt(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (raw === undefined || !/^\d+$/.test(raw.trim())) return fallback
  const value = Number(raw.trim())
  return Math.min(max, Math.max(min, value))
}

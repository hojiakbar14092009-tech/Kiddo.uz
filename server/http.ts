/** Small HTTP helpers for the API (Web Request/Response, the same in Vercel and in the Vite dev server). */

export class HttpError extends Error {
  readonly status: number
  readonly code: string
  readonly extra: Record<string, unknown> | undefined
  constructor(status: number, code: string, extra?: Record<string, unknown>) {
    super(code)
    this.status = status
    this.code = code
    this.extra = extra
  }
}

export function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  })
}

export function redirect(location: string, cookies: string[] = []): Response {
  const headers = new Headers({ location, 'cache-control': 'no-store' })
  for (const cookie of cookies) headers.append('set-cookie', cookie)
  return new Response(null, { status: 302, headers })
}

const MAX_BODY = 1024 * 1024

/** The JSON body of a request, at most 1 MB; anything else is a 400/413/415. */
export async function readJson<T = Record<string, unknown>>(request: Request, max = MAX_BODY): Promise<T> {
  if (!(request.headers.get('content-type') ?? '').includes('application/json')) {
    throw new HttpError(415, 'json_required')
  }
  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > max) throw new HttpError(413, 'too_large')
  const text = await request.text()
  if (text.length > max) throw new HttpError(413, 'too_large')
  try {
    const value: unknown = JSON.parse(text)
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('not an object')
    return value as T
  } catch {
    throw new HttpError(400, 'bad_json')
  }
}

export function parseCookies(request: Request): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const at = part.indexOf('=')
    if (at < 1) continue
    const name = part.slice(0, at).trim()
    try {
      out[name] = decodeURIComponent(part.slice(at + 1).trim())
    } catch {
      // a malformed cookie is ignored, never an error
    }
  }
  return out
}

/** https in production (Vercel); plain http only on the developer's machine. */
export const isSecure = (request: Request) => new URL(request.url).protocol === 'https:'

export function cookie(
  request: Request,
  name: string,
  value: string,
  maxAgeSeconds: number,
  sameSite: 'Lax' | 'Strict' = 'Lax',
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', `SameSite=${sameSite}`, `Max-Age=${maxAgeSeconds}`]
  if (isSecure(request)) parts.push('Secure')
  return parts.join('; ')
}

/**
 * CSRF: a request that changes something must come from our own pages. Browsers always send
 * Origin on cross-site POST/PUT/DELETE, and a JSON body cannot be sent cross-site without a
 * CORS preflight we never answer. Webhooks (Telegram, payments) are checked by their secret instead.
 */
export function assertSameOrigin(request: Request): void {
  if (request.method === 'GET' || request.method === 'HEAD') return
  const origin = request.headers.get('origin')
  const own = new URL(request.url).origin
  const extra = (process.env.APP_ORIGIN ?? '').trim()
  if (!origin || (origin !== own && origin !== extra)) throw new HttpError(403, 'bad_origin')
}

/** The caller's IP (Vercel sets x-real-ip / x-forwarded-for); only used for rate limits, never stored in clear. */
export function clientIp(request: Request): string {
  return (
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'local'
  )
}

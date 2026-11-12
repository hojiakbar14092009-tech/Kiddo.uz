/**
 * Calls to Kiddo's own API (/api, Turso behind it). Same-origin, with the session cookie.
 * A request that is safe to repeat (GET, the revision-checked sync PUT, a payment with an
 * idempotency key) is retried after a network error, a 5xx or a 429, with exponential backoff and
 * jitter, so a thousand devices coming back online do not all retry in the same second.
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly body: Record<string, unknown>
  constructor(status: number, body: Record<string, unknown>) {
    super(typeof body.error === 'string' ? body.error : `http_${status}`)
    this.status = status
    this.code = this.message
    this.body = body
  }
}

export const isOffline = (error: unknown) => !(error instanceof ApiError)

/** Delay before retry n (0-based): 0.5 s, 1 s, 2 s … up to 30 s, "full jitter". */
export function backoffMs(attempt: number, random = Math.random): number {
  return Math.round(random() * Math.min(30_000, 500 * 2 ** attempt))
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  /** how many times to retry a repeatable request (default: 3 for GET, 0 otherwise) */
  retries?: number
  headers?: Record<string, string>
  keepalive?: boolean
}

export async function api<T = Record<string, unknown>>(path: string, options: ApiOptions = {}): Promise<T> {
  const method = options.method ?? 'GET'
  const retries = options.retries ?? (method === 'GET' ? 3 : 0)
  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await fetch(`/api/${path}`, {
        method,
        credentials: 'same-origin',
        keepalive: options.keepalive,
        headers: { ...(options.body === undefined ? {} : { 'content-type': 'application/json' }), ...options.headers },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      })
      if (response.status === 304) return { notModified: true } as T
      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>
      if (response.ok) return body as T
      const error = new ApiError(response.status, body)
      if ((response.status >= 500 || response.status === 429) && attempt < retries) {
        const retryAfter = Number(response.headers.get('retry-after'))
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : backoffMs(attempt))
        continue
      }
      throw error
    } catch (error) {
      if (error instanceof ApiError || attempt >= retries) throw error
      await sleep(backoffMs(attempt))
    }
  }
}

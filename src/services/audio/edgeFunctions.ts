import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/services/supabase/config'

/** What an Edge Function answered: its HTTP status and JSON body (null when not JSON). */
export interface EdgeReply {
  status: number
  body: unknown
}

/** The signed-in parent's access token, or null (no Supabase, no session). */
async function accessToken(): Promise<string | null> {
  // Loaded on demand, so families without a cloud account never download Supabase.
  const { getSupabase } = await import('@/services/supabase/client')
  const supabase = getSupabase()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

/**
 * POSTs to `<SUPABASE_URL>/functions/v1/<name>` as the signed-in parent
 * (Authorization + apikey, docs/architecture/audio-security.md). Resolves
 * `null` without a session; rejects on a network failure. The answer is
 * never stored (`no-store`): it may carry short-lived signed URLs.
 */
export async function callEdgeFunction(name: string, payload: unknown): Promise<EdgeReply | null> {
  const token = await accessToken()
  if (!token) return null
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    body = null
  }
  return { status: response.status, body }
}

/** The `error` code of a failed Edge Function reply (`not_pro`, `unavailable`, …). */
export function edgeError(reply: EdgeReply): string | null {
  const body = reply.body as { error?: unknown } | null
  return typeof body?.error === 'string' ? body.error : null
}

/** The server said this account is not PRO: the device's PRO is checked again (at most once a minute). */
let lastRefresh = 0
export function refreshSubscriptionSoon(now: number = Date.now()): void {
  if (now - lastRefresh < 60_000) return
  lastRefresh = now
  void (async () => {
    try {
      const [{ getSupabase }, { pullSubscription }, { useParentStore }] = await Promise.all([
        import('@/services/supabase/client'),
        import('@/services/sync/subscription'),
        import('@/store/parentStore'),
      ])
      const session = useParentStore.getState().session
      const supabase = getSupabase()
      if (supabase && session?.mode === 'cloud') await pullSubscription(supabase, session.userId)
    } catch (error) {
      console.warn('[kiddo audio] subscription refresh failed', error)
    }
  })()
}

/** Tests only. */
export function resetEdgeFunctionsForTests(): void {
  lastRefresh = 0
}

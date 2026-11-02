// POST /functions/v1/analytics – the app's anonymous analytics, limited per IP (Phase 53).
// Contract: docs/architecture/scale-53.md. Logic: ../_shared/analytics.ts.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { handleAnalytics, type AnalyticsDeps } from '../_shared/analytics.ts'

const env = (name: string) => Deno.env.get(name)
const admin = createClient(env('SUPABASE_URL') ?? '', env('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})
// a refusal for the data itself (a check, a bad value, `bad_batch`): sending again will not help
const CONTENT_ERRORS = /^(22|23|P0001$)/

const deps: AnalyticsDeps = {
  env,
  async takeIp(ipHash, events, limit, windowSeconds) {
    const { data, error } = await admin.rpc('analytics_ip_take', {
      p_ip_hash: ipHash,
      p_events: events,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    })
    if (error) throw new Error(`analytics_ip_take: ${error.message}`)
    return data === true
  },
  async addEvents(events) {
    const { data, error } = await admin.rpc('add_analytics_events', { p_events: events })
    if (!error) return { added: typeof data === 'number' ? data : 0 }
    return { error: CONTENT_ERRORS.test(error.code ?? '') ? 'content' : 'server' }
  },
  log(message, error) {
    // Messages only; never addresses, keys or request bodies.
    console.error(message, error instanceof Error ? error.message : String(error ?? ''))
  },
}

Deno.serve((request) => handleAnalytics(request, deps))

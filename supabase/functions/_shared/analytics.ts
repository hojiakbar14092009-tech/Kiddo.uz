/*
 * POST /functions/v1/analytics  { events: [...] }  (Phase 53)
 *
 * The app's anonymous analytics go through here, not straight to the
 * database: each IP may add a limited number of events per hour, so one
 * script cannot use up the day's cap for every family. Only a keyed hash of
 * the IP is stored, and the key's day is part of it, so it cannot be followed
 * from one day to the next. Plain TypeScript (no Deno APIs): vitest tests it.
 * Contract: docs/architecture/scale-53.md.
 */

import {
  corsHeaders,
  envInt,
  errorResponse,
  jsonResponse,
  parseAllowedOrigins,
  readJsonBody,
} from './http.ts'
import type { Env } from './tts.ts'

/** 100 events of ~200 bytes fit with room to spare. */
export const MAX_ANALYTICS_BODY = 32_768
export const MAX_BATCH = 100
/** Events one IP may add per hour. Families behind one carrier address share it. */
export const DEFAULT_IP_EVENTS_PER_HOUR = 3000
export const IP_WINDOW_SECONDS = 3600

export type AddResult = { added: number } | { error: 'content' | 'server' }

export interface AnalyticsDeps {
  env: Env
  /** public.analytics_ip_take: counts the events; false once the window is over the limit. */
  takeIp(ipHash: string, events: number, limit: number, windowSeconds: number): Promise<boolean>
  /** public.add_analytics_events with the service role. */
  addEvents(events: unknown[]): Promise<AddResult>
  now?(): Date
  log?(message: string, error?: unknown): void
}

const ADDRESS = /^[0-9a-fA-F:.]{2,45}$/

/**
 * The caller's address as the platform saw it, or null. Only headers the
 * platform writes count: `cf-connecting-ip` (set by the edge in front of
 * Supabase, a client's own value is replaced), then `x-real-ip`, then the
 * last hop of `x-forwarded-for` (added by the nearest proxy). The first hop
 * of `x-forwarded-for` is whatever the client wrote, so it is never used.
 */
export function clientIp(request: Request): string | null {
  const last = request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()
  for (const candidate of [
    request.headers.get('cf-connecting-ip')?.trim(),
    request.headers.get('x-real-ip')?.trim(),
    last,
  ]) {
    if (candidate && ADDRESS.test(candidate)) return candidate.toLowerCase()
  }
  return null
}

/** HMAC-SHA-256 of `day|ip` as hex: the same IP gives another hash tomorrow. */
export async function ipHash(key: string, ip: string, day: string): Promise<string> {
  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(`${day}|${ip}`))
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  )
}

function parseEvents(body: unknown): unknown[] | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null
  const events = (body as { events?: unknown }).events
  if (!Array.isArray(events) || events.length === 0 || events.length > MAX_BATCH) return null
  return events.every(
    (event) => typeof event === 'object' && event !== null && !Array.isArray(event),
  )
    ? events
    : null
}

export async function handleAnalytics(request: Request, deps: AnalyticsDeps): Promise<Response> {
  const cors = corsHeaders(
    request.headers.get('Origin'),
    parseAllowedOrigins(deps.env('ALLOWED_ORIGINS')),
  )
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'bad_request' }, { ...cors, Allow: 'POST, OPTIONS' })
  }
  try {
    const events = parseEvents(await readJsonBody(request, MAX_ANALYTICS_BODY))
    if (!events) return errorResponse('bad_request', cors)
    const key = deps.env('ANALYTICS_IP_SALT') || deps.env('SUPABASE_SERVICE_ROLE_KEY')
    if (!key) {
      deps.log?.('[analytics] no ANALYTICS_IP_SALT')
      return errorResponse('unavailable', cors)
    }
    const day = (deps.now?.() ?? new Date()).toISOString().slice(0, 10)
    // no address (never expected on Supabase): the device's own window, not one shared by all
    const ip = clientIp(request)
    const install = (events[0] as { install?: unknown }).install
    const who = ip ?? `install:${typeof install === 'string' ? install.slice(0, 64) : ''}`
    const hash = await ipHash(key, who, day)
    const limit = envInt(
      deps.env('ANALYTICS_IP_EVENTS_PER_HOUR'),
      DEFAULT_IP_EVENTS_PER_HOUR,
      100,
      1_000_000,
    )
    if (!(await deps.takeIp(hash, events.length, limit, IP_WINDOW_SECONDS))) {
      return errorResponse('rate_limited', cors)
    }
    const result = await deps.addEvents(events)
    if ('added' in result) return jsonResponse(200, { added: result.added }, cors)
    return errorResponse(result.error === 'content' ? 'bad_request' : 'unavailable', cors)
  } catch (error) {
    deps.log?.('[analytics] failed', error)
    return errorResponse('server_error', cors)
  }
}

/*
 * POST /functions/v1/tutor (docs/architecture/ai-tutor.md §3). Every outside
 * effect is passed in as TutorDeps, so the whole flow is tested under Node.
 *
 * Order: CORS preflight → method (405) → token present → body (≤ 4 KB) →
 * token valid (401) → per-user `auth` count (429) → PRO on the server (403
 * not_pro) → request strictly valid (400) → the parent's consent for this
 * child on the server (403 no_consent) → a free provider configured (503) →
 * provider not cooling down after a used-up quota (503) → global daily cap
 * (429) → per-user `ai` rate (429) → cache (generic replies only) → provider
 * (timeout, one retry for a transient error) → reply checked (one retry) →
 * 200 { reply }.
 *
 * Any non-200 means "use Kiddo's own hint": the client never shows an error
 * text from here, and the learning session goes on.
 */

import {
  bearerToken,
  corsHeaders,
  envInt,
  errorResponse,
  jsonResponse,
  parseAllowedOrigins,
  readJsonBody,
} from '../http.ts'
import type { Env } from '../tts.ts'
import { selectAiProvider } from './gemini.ts'
import { KIDDO_TUTOR_PROMPT_VERSION, tutorPrompt } from './policy.ts'
import { checkReply, type ReplyProblem } from './reply.ts'
import { parseTutorRequest, similarExample } from './request.ts'
import type {
  AIProvider,
  ProviderFailure,
  ProviderResult,
  TutorReply,
  TutorRequest,
} from './types.ts'

export const DEFAULT_AI_RATE_LIMIT = 20
export const DEFAULT_AI_RATE_WINDOW_S = 600
/** Below the free tier's daily requests, so Kiddo stops before Google does. */
export const DEFAULT_AI_DAILY_CAP = 1000
export const DEFAULT_AI_TIMEOUT_MS = 8000
/** After a used-up quota (429) nobody calls the provider for this long. */
export const DEFAULT_AI_COOLDOWN_S = 900

export type TutorRateKind = 'auth' | 'ai'

export type UsageOutcome = 'ok' | 'cached' | 'invalid' | ProviderFailure

/** Operational telemetry only: no user, no child, no prompt, no reply text. */
export interface UsageRow {
  provider: string
  model: string
  outcome: UsageOutcome
  latencyBucket: 'lt1s' | '1to3s' | '3to8s' | 'gt8s'
  promptTokens: number | null
  outputTokens: number | null
  policyVersion: string
  problem: ReplyProblem | null
}

export interface TutorDeps {
  env: Env
  userIdFromToken(token: string): Promise<string | null>
  isPro(userId: string): Promise<boolean>
  rateOk(
    userId: string,
    kind: TutorRateKind,
    limit: number,
    windowSeconds: number,
  ): Promise<boolean>
  dailyCount(kind: 'ai'): Promise<number>
  /** The parent `userId` switched the AI tutor on for this child of theirs, for the current policy version. */
  consentOk(userId: string, childId: string): Promise<boolean>
  /** Epoch ms until which the provider rests, or null. */
  cooldownUntil(provider: string): Promise<number | null>
  setCooldown(provider: string, untilMs: number): Promise<void>
  cacheGet(key: string): Promise<TutorReply | null>
  cachePut(key: string, language: string, reply: TutorReply): Promise<void>
  recordUsage(row: UsageRow): Promise<void>
  fetch?: (input: string, init: RequestInit) => Promise<Response>
  /** Tests: a fake provider instead of the configured one. */
  provider?: AIProvider | null
  now?(): number
  log?(message: string, error?: unknown): void
}

function bucket(ms: number): UsageRow['latencyBucket'] {
  if (ms < 1000) return 'lt1s'
  if (ms < 3000) return '1to3s'
  if (ms < 8000) return '3to8s'
  return 'gt8s'
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * The cache key of a generic reply. A request with learning memory is
 * personal and never cached (null).
 */
export async function cacheKey(
  request: TutorRequest,
  provider: AIProvider,
): Promise<string | null> {
  if (request.memory) return null
  const { item } = request
  return sha256Hex(
    JSON.stringify([
      KIDDO_TUTOR_PROMPT_VERSION,
      provider.id,
      provider.model,
      request.language,
      request.band,
      request.persona,
      request.intent,
      request.hintLevel,
      item.skill,
      item.task,
      item.expression,
      item.answer,
      item.learnerAnswer ?? null,
      item.errorCode ?? null,
    ]),
  )
}

/** The provider method for the intent (all share one policy). */
function callFor(
  provider: AIProvider,
  request: TutorRequest,
): (prompt: ReturnType<typeof tutorPrompt>, signal: AbortSignal) => Promise<ProviderResult> {
  switch (request.intent) {
    case 'hint':
      return provider.generateHint.bind(provider)
    case 'why-wrong':
      return provider.explainMistake.bind(provider)
    case 'example':
      return provider.generatePracticeItem.bind(provider)
    default:
      return provider.generateTutorResponse.bind(provider)
  }
}

async function withTimeout(
  run: (signal: AbortSignal) => Promise<ProviderResult>,
  ms: number,
): Promise<ProviderResult> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<ProviderResult>((resolve) => {
    timer = setTimeout(() => {
      controller.abort()
      resolve({ ok: false, failure: 'transient' })
    }, ms)
  })
  try {
    return await Promise.race([run(controller.signal), timeout])
  } catch {
    return { ok: false, failure: 'transient' }
  } finally {
    clearTimeout(timer)
  }
}

export async function handleTutor(request: Request, deps: TutorDeps): Promise<Response> {
  const cors = corsHeaders(
    request.headers.get('Origin'),
    parseAllowedOrigins(deps.env('ALLOWED_ORIGINS')),
  )
  const now = () => (deps.now ? deps.now() : Date.now())
  try {
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
    const authLimit = envInt(deps.env('AUTH_RATE_LIMIT'), 300, 1, 100000)
    const authWindow = envInt(deps.env('AUTH_RATE_WINDOW_S'), 60, 1, 86400)
    if (!(await deps.rateOk(userId, 'auth', authLimit, authWindow))) {
      return errorResponse('rate_limited', cors)
    }
    if (!(await deps.isPro(userId))) return errorResponse('not_pro', cors)

    let input = parseTutorRequest(body)
    if (!input) return errorResponse('bad_request', cors)
    if (!(await deps.consentOk(userId, input.childId))) return errorResponse('no_consent', cors)
    // an example needs numbers the server can choose; otherwise it is an explanation
    if (input.intent === 'example' && !similarExample(input.item)) {
      input = { ...input, intent: 'explain' }
    }

    const provider =
      deps.provider !== undefined
        ? deps.provider
        : selectAiProvider(deps.env, deps.fetch ?? ((url, init) => fetch(url, init)))
    if (!provider || !provider.healthCheck().ok) return errorResponse('unavailable', cors)
    const rest = await deps.cooldownUntil(provider.id)
    if (rest !== null && rest > now()) {
      return jsonResponse(
        503,
        { error: 'unavailable', retryAfter: Math.ceil((rest - now()) / 1000) },
        cors,
      )
    }
    const dailyCap = envInt(deps.env('AI_DAILY_CAP'), DEFAULT_AI_DAILY_CAP, 1, 1000000)
    if ((await deps.dailyCount('ai')) >= dailyCap) return errorResponse('rate_limited', cors)
    const limit = envInt(deps.env('AI_RATE_LIMIT'), DEFAULT_AI_RATE_LIMIT, 1, 100000)
    const windowSeconds = envInt(deps.env('AI_RATE_WINDOW_S'), DEFAULT_AI_RATE_WINDOW_S, 1, 86400)
    if (!(await deps.rateOk(userId, 'ai', limit, windowSeconds))) {
      return errorResponse('rate_limited', cors)
    }

    const usage = (row: Omit<UsageRow, 'provider' | 'model' | 'policyVersion'>) =>
      deps
        .recordUsage({
          provider: provider.id,
          model: provider.model,
          policyVersion: KIDDO_TUTOR_PROMPT_VERSION,
          ...row,
        })
        .catch((error: unknown) => deps.log?.('[tutor] usage not recorded', error))

    const key = await cacheKey(input, provider)
    if (key) {
      const cached = await deps.cacheGet(key)
      if (cached) {
        const check = checkReply(JSON.stringify(cached), input)
        if (check.ok) {
          await usage({
            outcome: 'cached',
            latencyBucket: 'lt1s',
            promptTokens: null,
            outputTokens: null,
            problem: null,
          })
          return jsonResponse(200, { reply: check.reply, cached: true }, cors)
        }
      }
    }

    const prompt = tutorPrompt(input)
    const call = callFor(provider, input)
    const timeoutMs = envInt(deps.env('AI_TIMEOUT_MS'), DEFAULT_AI_TIMEOUT_MS, 1000, 20000)
    const started = now()
    let problem: ReplyProblem | null = null
    let tokens = { prompt: null as number | null, output: null as number | null }

    // at most two provider calls: a transient error or an unusable reply gets one more try
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const left = timeoutMs - (now() - started)
      if (left < 1000) break
      const result = await withTimeout((signal) => call(prompt, signal), left)
      if (!result.ok) {
        // a used-up quota or broken settings (bad key, unknown model): nobody calls for a while
        if (result.failure === 'quota' || result.failure === 'config') {
          const cooldown = envInt(deps.env('AI_COOLDOWN_S'), DEFAULT_AI_COOLDOWN_S, 60, 86400)
          await deps.setCooldown(provider.id, now() + cooldown * 1000)
        }
        if (result.failure === 'transient' && attempt === 0) continue
        await usage({
          outcome: result.failure,
          latencyBucket: bucket(now() - started),
          promptTokens: null,
          outputTokens: null,
          problem: null,
        })
        return errorResponse('unavailable', cors)
      }
      tokens = { prompt: result.promptTokens ?? null, output: result.outputTokens ?? null }
      const check = checkReply(result.text, input)
      if (check.ok) {
        if (key) await deps.cachePut(key, input.language, check.reply).catch(() => undefined)
        await usage({
          outcome: 'ok',
          latencyBucket: bucket(now() - started),
          promptTokens: tokens.prompt,
          outputTokens: tokens.output,
          problem: null,
        })
        return jsonResponse(200, { reply: check.reply, cached: false }, cors)
      }
      problem = check.problem
    }
    await usage({
      outcome: problem ? 'invalid' : 'transient',
      latencyBucket: bucket(now() - started),
      promptTokens: tokens.prompt,
      outputTokens: tokens.output,
      problem,
    })
    return errorResponse('unavailable', cors)
  } catch (error) {
    deps.log?.('[tutor] failed', error)
    return errorResponse('server_error', cors)
  }
}

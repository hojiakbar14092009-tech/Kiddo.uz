/*
 * POST /functions/v1/worker  (Phase 53)
 *
 * Drains the job queue (public.jobs, migration 0021). pg_cron calls it once a
 * minute when a job is due, with `Authorization: Bearer <WORKER_SECRET>`;
 * nobody else can start it. Jobs are claimed a few at a time with a lease, so
 * two runs never do the same job, and a run that dies gives its jobs back when
 * the lease ends. Plain TypeScript (no Deno APIs): vitest tests it.
 */

import { errorResponse, jsonResponse } from './http.ts'
import type { Env } from './tts.ts'

export interface Job {
  id: number
  kind: string
  payload: unknown
  attempts: number
}

/** A job that can never succeed (bad payload): it ends as dead at once. */
export class PermanentJobError extends Error {}

export type JobHandler = (payload: unknown) => Promise<void>

export interface WorkerDeps {
  env: Env
  claim(limit: number, leaseSeconds: number): Promise<Job[]>
  /** Marks the job done if this run still holds that try (`attempts`). */
  finish(id: number, attempts: number): Promise<void>
  fail(id: number, attempts: number, error: string, final: boolean): Promise<void>
  handlers: Readonly<Record<string, JobHandler>>
  /** Milliseconds now (tests set it). */
  clock?(): number
  log?(message: string, error?: unknown): void
}

/** Few jobs per claim, and a lease longer than all of them at their time limit. */
export const CLAIM_BATCH = 3
/** One job may take this long before it counts as failed. */
export const JOB_TIMEOUT_MS = 15_000
/** A run stops claiming after this long (Edge Functions are stopped later). */
export const RUN_BUDGET_MS = 40_000
/** CLAIM_BATCH jobs at JOB_TIMEOUT_MS each, with room: no job outlives its lease. */
export const LEASE_SECONDS = Math.ceil((CLAIM_BATCH * JOB_TIMEOUT_MS) / 1000) + 30

/** Equal strings, compared in time that does not depend on where they differ. */
export function sameSecret(a: string, b: string): boolean {
  let diff = a.length ^ b.length
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    diff |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0)
  }
  return diff === 0
}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timeout after ${ms} ms`)), ms)
  })
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer))
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export async function runJobs(deps: WorkerDeps): Promise<{ done: number; failed: number }> {
  const clock = deps.clock ?? (() => Date.now())
  const started = clock()
  let done = 0
  let failed = 0
  while (clock() - started < RUN_BUDGET_MS) {
    const jobs = await deps.claim(CLAIM_BATCH, LEASE_SECONDS)
    if (jobs.length === 0) break
    for (const job of jobs) {
      const handler = deps.handlers[job.kind]
      if (!handler) {
        await deps.fail(job.id, job.attempts, `unknown kind ${job.kind}`, true)
        failed += 1
        continue
      }
      try {
        await withTimeout(handler(job.payload), JOB_TIMEOUT_MS)
        await deps.finish(job.id, job.attempts)
        done += 1
      } catch (error) {
        deps.log?.(`[worker] job ${job.id} (${job.kind}) failed`, error)
        await deps.fail(job.id, job.attempts, message(error), error instanceof PermanentJobError)
        failed += 1
      }
    }
    if (jobs.length < CLAIM_BATCH) break
  }
  return { done, failed }
}

export async function handleWorker(request: Request, deps: WorkerDeps): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'bad_request' }, { Allow: 'POST' })
  }
  const secret = deps.env('WORKER_SECRET') ?? ''
  if (secret.length < 32) {
    deps.log?.('[worker] WORKER_SECRET is missing or shorter than 32 characters')
    return errorResponse('unavailable', {})
  }
  const header = request.headers.get('Authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!sameSecret(token, secret)) return errorResponse('not_signed_in', {})
  try {
    return jsonResponse(200, await runJobs(deps), {})
  } catch (error) {
    deps.log?.('[worker] failed', error)
    return errorResponse('server_error', {})
  }
}

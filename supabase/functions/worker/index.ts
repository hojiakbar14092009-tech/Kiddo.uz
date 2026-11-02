// POST /functions/v1/worker – does the queued jobs (Phase 53). Started by pg_cron
// (public.kick_worker) with the WORKER_SECRET. Logic: ../_shared/worker.ts.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { handleWorker, type Job, type WorkerDeps } from '../_shared/worker.ts'
import { telegramSendJob } from '../_shared/telegram.ts'
import type { Report } from '../_shared/telegramText.ts'

const env = (name: string) => Deno.env.get(name)
const admin = createClient(env('SUPABASE_URL') ?? '', env('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

async function call(name: string, args: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await admin.rpc(name, args)
  if (error) throw new Error(`${name}: ${error.message}`)
  return data
}

const deps: WorkerDeps = {
  env,
  async claim(limit, leaseSeconds) {
    return ((await call('claim_jobs', { p_limit: limit, p_lease_seconds: leaseSeconds })) ??
      []) as Job[]
  },
  async finish(id, attempts) {
    await call('finish_job', { p_id: id, p_attempts: attempts })
  },
  async fail(id, attempts, error, final) {
    await call('fail_job', { p_id: id, p_attempts: attempts, p_error: error, p_final: final })
  },
  // Each kind of job and what it does.
  handlers: {
    async refresh_admin_stats() {
      await call('refresh_admin_stats', {})
    },
    // Phase 56: a weekly, daily or reminder message to one linked parent chat
    telegram_send: telegramSendJob({
      env,
      report: async (linkId, kind) =>
        (await call('telegram_report', { p_link_id: linkId, p_kind: kind })) as Report | null,
      unlink: async (chatId) => Boolean(await call('telegram_unlink_chat', { p_chat_id: chatId })),
    }),
  },
  log(message, error) {
    console.error(message, error instanceof Error ? error.message : String(error ?? ''))
  },
}

Deno.serve((request) => handleWorker(request, deps))

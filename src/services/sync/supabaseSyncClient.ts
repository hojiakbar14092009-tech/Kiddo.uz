import type { SupabaseClient } from '@supabase/supabase-js'
import { SyncError, type SyncClient, type SyncErrorKind } from './syncQueue'

interface ResponseError {
  message?: string
  code?: string
}

/**
 * Sorts a PostgREST failure into what the queue should do about it.
 * 401 / JWT problems mean the session is gone (pause, do not count);
 * other 4xx mean the server refuses this row (dead letter); the rest – no
 * network (status 0), timeouts, rate limits, 5xx – are worth retrying.
 */
export function classify(status: number, error: ResponseError): SyncErrorKind {
  const code = error.code ?? ''
  const message = error.message ?? ''
  if (
    status === 401 ||
    code === 'PGRST301' ||
    code === 'PGRST302' ||
    code === '28000' ||
    /\bjwt\b/i.test(message)
  ) {
    return 'auth'
  }
  if (status >= 400 && status < 500 && status !== 408 && status !== 429) return 'rejected'
  return 'transient'
}

function check(result: { error: ResponseError | null; status: number }) {
  const { error, status } = result
  if (error) throw new SyncError(error.message ?? 'sync failed', classify(status, error))
}

/** The queue’s writes on top of Supabase; RLS fills in and checks `parent_id`. */
export function supabaseSyncClient(supabase: SupabaseClient): SyncClient {
  return {
    upsert: async (table, row, conflictColumn) => {
      check(await supabase.from(table).upsert(row, { onConflict: conflictColumn }))
    },
    remove: async (table, column, value) => {
      check(await supabase.from(table).delete().eq(column, value))
    },
    rpc: async (fn, args) => {
      check(await supabase.rpc(fn, args))
    },
  }
}

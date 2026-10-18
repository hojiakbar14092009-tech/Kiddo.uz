import type { SupabaseClient } from '@supabase/supabase-js'
import type { SyncClient } from './syncQueue'

/** The queue’s writes on top of Supabase; RLS fills in and checks `parent_id`. */
export function supabaseSyncClient(supabase: SupabaseClient): SyncClient {
  return {
    upsert: async (table, row, conflictColumn) => {
      const { error } = await supabase.from(table).upsert(row, { onConflict: conflictColumn })
      if (error) throw new Error(error.message)
    },
    remove: async (table, column, value) => {
      const { error } = await supabase.from(table).delete().eq(column, value)
      if (error) throw new Error(error.message)
    },
  }
}

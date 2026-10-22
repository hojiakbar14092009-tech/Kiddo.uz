/** Cloud heartbeats are rarer: each one is a request to the server. */
export const CLOUD_BEAT_MS = 60_000

/** One heartbeat row for `presence_heartbeats` (0005): no name, the server sets the time. */
export async function sendHeartbeat(childId: string, screen: string): Promise<void> {
  const { getSupabase } = await import('@/services/supabase/client')
  const supabase = getSupabase()
  if (!supabase) return
  // A lost heartbeat only means the admin sees the child a minute later.
  await supabase
    .from('presence_heartbeats')
    .upsert({ child_id: childId, screen: screen.slice(0, 120) }, { onConflict: 'child_id' })
}

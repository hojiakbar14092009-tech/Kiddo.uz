import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useActiveChild } from '@/store/familyStore'
import { useParentStore } from '@/store/parentStore'
import { postAdminMessage } from '@/store/paymentStore'

const BEAT_MS = 8000

/**
 * Tells the admin panel who is playing right now: on this device through a
 * browser channel, and – with a cloud account – through Supabase Realtime
 * presence, so the admin sees children online on every device.
 */
export function PresenceBeacon() {
  const child = useActiveChild()
  const { pathname } = useLocation()
  const cloud = useParentStore((state) => state.session?.mode === 'cloud')
  const playing =
    child !== null && !pathname.startsWith('/parent') && !pathname.startsWith('/admin')
  const childId = child?.id
  const name = child?.name ?? ''

  // This device: a heartbeat while the app is visible.
  useEffect(() => {
    if (!playing || !childId) return undefined
    const beat = () => {
      if (document.visibilityState === 'visible') {
        postAdminMessage({ type: 'presence', childId, name, at: Date.now(), screen: pathname })
      } else {
        postAdminMessage({ type: 'leave', childId })
      }
    }
    beat()
    const timer = setInterval(beat, BEAT_MS)
    document.addEventListener('visibilitychange', beat)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', beat)
      postAdminMessage({ type: 'leave', childId })
    }
  }, [childId, name, pathname, playing])

  // Every device: Supabase presence, only for families with a cloud account.
  useEffect(() => {
    if (!playing || !childId || !cloud) return undefined
    let stop = () => undefined as void
    let alive = true
    void import('@/services/supabase/client').then(({ getSupabase }) => {
      const supabase = getSupabase()
      if (!supabase || !alive) return
      const channel = supabase.channel('kiddo-online', { config: { presence: { key: childId } } })
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') void channel.track({ childId, name, screen: pathname })
      })
      stop = () => void supabase.removeChannel(channel)
    })
    return () => {
      alive = false
      stop()
    }
  }, [childId, cloud, name, pathname, playing])

  return null
}

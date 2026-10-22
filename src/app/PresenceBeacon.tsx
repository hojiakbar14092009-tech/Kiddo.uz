import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useActiveChild } from '@/store/familyStore'
import { useParentStore } from '@/store/parentStore'
import { postAdminMessage } from '@/store/paymentStore'
import { CLOUD_BEAT_MS, sendHeartbeat } from './presenceHeartbeat'

const BEAT_MS = 8000

/**
 * Tells the admin panel who is playing right now: on this device through a
 * browser channel, and – with a cloud account – through a private heartbeat
 * row that only this family and admins can read.
 */
export function PresenceBeacon() {
  const child = useActiveChild()
  const { pathname } = useLocation()
  const cloud = useParentStore((state) => state.session?.mode === 'cloud')
  const playing =
    child !== null && !pathname.startsWith('/parent') && !pathname.startsWith('/admin')
  const childId = child?.id
  const name = child?.name ?? ''
  const screen = useRef(pathname)
  useEffect(() => {
    screen.current = pathname
  }, [pathname])

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

  // Every device: one heartbeat a minute while visible, only with a cloud account.
  // The screen is read from a ref, so moving between screens sends nothing extra.
  useEffect(() => {
    if (!playing || !childId || !cloud) return undefined
    const beat = () => {
      if (document.visibilityState !== 'visible') return
      void sendHeartbeat(childId, screen.current).catch(() => undefined)
    }
    beat()
    const timer = setInterval(beat, CLOUD_BEAT_MS)
    document.addEventListener('visibilitychange', beat)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', beat)
    }
  }, [childId, cloud, playing])

  return null
}

import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { isActivityPath, screenOf, track, trackAppOpened } from '@/domain/analytics'
import { subscribeDomainEvents } from '@/domain/universe/progression'
import {
  flushAnalytics,
  sendOnLeave,
  cloudAnalyticsSender,
} from '@/services/analytics/sendAnalytics'
import { isSupabaseConfigured } from '@/services/supabase/config'
import { useFamilyStore } from '@/store/familyStore'

/** How often waiting analytics are sent while the app is open. */
const SEND_EVERY_MS = 60_000

const isAdmin = (path: string) => path.startsWith('/admin')

/**
 * Anonymous analytics (Phase 37): the launch, the first child profile, an
 * activity opened and finished, and the screen the app was left on. The
 * owner's admin panel is never counted. Events are sent only when a cloud
 * backend is configured; otherwise they stay on this device.
 */
export function AnalyticsTracker() {
  const { pathname } = useLocation()
  // the router's path (the screen the child is on), read by the listeners below
  const current = useRef(pathname)
  useEffect(() => {
    current.current = pathname
  }, [pathname])

  // the launch, return days and a family that already has a child
  useEffect(() => {
    if (isAdmin(current.current)) return
    trackAppOpened(new Date(), {
      existingFamily: useFamilyStore.getState().children.length > 0,
    })
    if (useFamilyStore.getState().children.length > 0) track('onboarding_done')
    return useFamilyStore.subscribe((state) => {
      if (state.children.length > 0) track('onboarding_done')
    })
  }, [])

  // an activity opened (once a day is enough for the funnel)
  useEffect(() => {
    if (!isAdmin(pathname) && isActivityPath(pathname)) {
      track('activity_opened', { screen: screenOf(pathname) })
    }
  }, [pathname])

  // an activity finished: the central progression's own event
  useEffect(
    () =>
      subscribeDomainEvents((event) => {
        if (event.type === 'activity.completed') track('activity_finished')
      }),
    [],
  )

  // leaving: the screen the child was on, sent right away (it may be the last visit);
  // coming back to the front on a new day counts as that day's open
  useEffect(() => {
    const onVisibility = () => {
      const path = current.current
      if (isAdmin(path)) return
      if (document.visibilityState === 'hidden') {
        track('app_closed', { screen: screenOf(path) })
        if (isSupabaseConfigured) sendOnLeave()
      } else {
        trackAppOpened()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // sending (cloud only; a plain request to the `analytics` Edge Function)
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    let alive = true
    const send = async () => {
      const sender = cloudAnalyticsSender()
      if (alive && sender) await flushAnalytics(sender)
    }
    const first = setTimeout(() => void send(), 5_000)
    const timer = setInterval(() => void send(), SEND_EVERY_MS)
    return () => {
      alive = false
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [])

  return null
}

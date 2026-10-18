import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useProgressStore } from '@/store/progressStore'
import { mayFinishHere, TICK_MS } from './screenTime'
import { useScreenTime } from './useScreenTime'

/**
 * Counts the time a child spends in the child area (only while the screen is
 * visible) and sends them to the rest screen once the parent’s daily limit is
 * reached. A game already in progress may finish first – stopping mid-task
 * would feel like a punishment.
 */
export function ScreenTimeGuard() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { over, warn, remaining, childKey } = useScreenTime()
  const addMinutes = useProgressStore((state) => state.addMinutes)

  useEffect(() => {
    const tick = setInterval(() => {
      if (document.visibilityState === 'visible') addMinutes(childKey, TICK_MS / 60_000)
    }, TICK_MS)
    return () => clearInterval(tick)
  }, [addMinutes, childKey])

  if (over && pathname !== '/rest' && !mayFinishHere(pathname)) {
    return <Navigate to="/rest" replace />
  }

  return (
    <>
      <Outlet />
      {warn && pathname !== '/rest' && (
        <p
          role="status"
          className="pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2 rounded-full bg-lilac-soft px-5 py-2 font-display text-lg font-bold whitespace-nowrap shadow-[0_4px_0_var(--color-line)]"
        >
          🌙 {t('rest.soon', { count: Math.max(1, Math.ceil(remaining)) })}
        </p>
      )}
    </>
  )
}

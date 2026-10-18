import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useProgressStore } from '@/store/progressStore'
import { mayFinishHere, TICK_MS } from './screenTime'
import { useScreenTime } from './useScreenTime'

/** The one game (and then its reward screen) that may finish after time ran out. */
interface Grace {
  pathname: string
  stage: 'game' | 'reward'
}

/**
 * Counts the time a child spends in the child area (only while the screen is
 * visible, never on the rest screen) and sends them to the rest screen once
 * the parent’s daily limit is reached. The game that was being played when
 * time ran out may finish and show its reward – stopping mid-task would feel
 * like a punishment – but nothing new can be started.
 */
export function ScreenTimeGuard() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { over, warn, remaining, childKey } = useScreenTime()
  const addMinutes = useProgressStore((state) => state.addMinutes)
  const [wasOver, setWasOver] = useState(over)
  const [grace, setGrace] = useState<Grace | null>(null)

  // Adjust state while rendering (React’s pattern for reacting to a change),
  // so the redirect decision below already sees the grace for this render.
  if (over !== wasOver) {
    setWasOver(over)
    setGrace(over && mayFinishHere(pathname) ? { pathname, stage: 'game' } : null)
  }
  // The finished game opens its reward: from now on only that screen is allowed.
  if (grace?.stage === 'game' && pathname === '/reward') {
    setGrace({ pathname, stage: 'reward' })
  }

  useEffect(() => {
    if (pathname === '/rest') return undefined
    const tick = setInterval(() => {
      if (document.visibilityState === 'visible') addMinutes(childKey, TICK_MS / 60_000)
    }, TICK_MS)
    return () => clearInterval(tick)
  }, [addMinutes, childKey, pathname])

  const allowed =
    pathname === '/rest' ||
    grace?.pathname === pathname ||
    (pathname === '/reward' && grace !== null)
  if (over && !allowed) return <Navigate to="/rest" replace />

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

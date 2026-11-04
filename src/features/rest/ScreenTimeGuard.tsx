import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useProgressStore } from '@/store/progressStore'
import { TICK_MS } from './screenTime'
import { useScreenTime } from './useScreenTime'

/**
 * Counts the time a child spends in the child area (only while the screen is
 * visible), for the parent's report. Since Phase 75 there is no daily limit:
 * the parents decided Kiddo never stops a child with a rest screen.
 */
export function ScreenTimeGuard() {
  const { childKey } = useScreenTime()
  const addMinutes = useProgressStore((state) => state.addMinutes)

  useEffect(() => {
    const tick = setInterval(() => {
      if (document.visibilityState === 'visible') addMinutes(childKey, TICK_MS / 60_000)
    }, TICK_MS)
    return () => clearInterval(tick)
  }, [addMinutes, childKey])

  return <Outlet />
}

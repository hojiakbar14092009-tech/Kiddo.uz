import { useEffect, useState } from 'react'
import { dayKey } from '@/features/tasks/rules'

/**
 * Today's local day (YYYY-MM-DD), kept current: checked every minute and
 * whenever the app comes back to the screen, so a card left open overnight
 * shows the new day's quest.
 */
export function useLocalDay(): string {
  const [day, setDay] = useState(() => dayKey())
  useEffect(() => {
    const check = () => setDay(dayKey())
    const timer = setInterval(check, 60_000)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
    }
  }, [])
  return day
}

/** Noon of a local day, a safe moment inside it whatever the time zone rules. */
export function noonOf(day: string): Date {
  const [year, month, date] = day.split('-').map(Number)
  return new Date(year ?? 1970, (month ?? 1) - 1, date ?? 1, 12)
}

import { dayKey } from '@/features/tasks/rules'
import { DEFAULT_DAILY_LIMIT_MINUTES, useActiveChild } from '@/store/familyStore'
import { useChildKey, useProgress } from '@/store/progressStore'
import { extraMinutesFor, useScreenTimeStore } from '@/store/screenTimeStore'
import { screenTimeStatus, type ScreenTimeStatus } from './screenTime'

/** Today’s screen time of the child who is playing (a guest gets the default limit). */
export function useScreenTime(): ScreenTimeStatus & { childKey: string; day: string } {
  const childKey = useChildKey()
  const child = useActiveChild()
  const { minutesByDay } = useProgress()
  const extra = useScreenTimeStore((state) => state.extraMinutes)
  const day = dayKey()
  const status = screenTimeStatus(
    minutesByDay[day] ?? 0,
    child?.dailyLimitMinutes ?? DEFAULT_DAILY_LIMIT_MINUTES,
    extraMinutesFor(extra, childKey, day),
  )
  return { ...status, childKey, day }
}

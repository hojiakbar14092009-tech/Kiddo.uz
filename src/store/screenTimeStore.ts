import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { dayKey } from '@/features/tasks/rules'

interface ScreenTimeState {
  /** Extra minutes a parent allowed after the limit, per child and day: `${childKey}|${day}`. */
  extraMinutes: Record<string, number>
  grantExtra: (childKey: string, day: string, minutes: number) => void
  /** A child was removed: its extra minutes go too. */
  forgetChild: (childKey: string) => void
}

const KEEP_DAYS = 14

function key(childKey: string, day: string) {
  return `${childKey}|${day}`
}

export const useScreenTimeStore = create<ScreenTimeState>()(
  persist(
    (set) => ({
      extraMinutes: {},
      grantExtra: (childKey, day, minutes) =>
        set((state) => {
          const entries = Object.entries(state.extraMinutes).filter(
            ([entryKey]) => entryKey.split('|')[1]! >= oldestDayToKeep(day),
          )
          const extraMinutes = Object.fromEntries(entries)
          extraMinutes[key(childKey, day)] = (extraMinutes[key(childKey, day)] ?? 0) + minutes
          return { extraMinutes }
        }),
      forgetChild: (childKey) =>
        set((state) => ({
          extraMinutes: Object.fromEntries(
            Object.entries(state.extraMinutes).filter(
              ([entryKey]) => entryKey.split('|')[0] !== childKey,
            ),
          ),
        })),
    }),
    { name: 'kiddo.screen-time', version: 1 },
  ),
)

/** Old extensions are dropped so the store never grows without end. */
function oldestDayToKeep(day: string): string {
  const date = new Date(`${day}T12:00:00`)
  date.setDate(date.getDate() - KEEP_DAYS)
  return dayKey(date)
}

export function extraMinutesFor(
  extra: Record<string, number>,
  childKey: string,
  day: string,
): number {
  return extra[key(childKey, day)] ?? 0
}

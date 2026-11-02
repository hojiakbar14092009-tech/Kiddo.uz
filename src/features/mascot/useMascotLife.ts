import { useCallback, useEffect, useRef, useState } from 'react'
import { clampRestHours, isRestHour, useAppSettingsStore } from '@/store/appSettingsStore'
import { TapTracker } from './characters/director'
import type { MascotMood } from './types'

/**
 * Rest hours (Phase 43; the hours are the admin's since Phase 45, 22:00–05:00 by default): the
 * robot is sleepy when nothing else happens. A touch, an answer or speech wakes it for the
 * moment; then it dozes again.
 */
export function useRestHours(): boolean {
  const rest = useAppSettingsStore((state) => state.restHours)
  const [hour, setHour] = useState(() => new Date().getHours())
  useEffect(() => {
    // the evening can turn into night while the page is open
    const timer = window.setInterval(() => setHour(new Date().getHours()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  return isRestHour(hour, clampRestHours(rest))
}

/**
 * What a touch on the 2D robot shows: a wave, then a smile (never the same twice in a row). No
 * cheer and no sound: those belong to real progress.
 */
const TAP_MOODS: readonly MascotMood[] = ['wave', 'happy']

/**
 * A touch on the robot (Phase 43): a different friendly move each time, rate-limited like the 3D
 * characters (TapTracker); it never earns anything. While the robot is busy (speaking, or
 * answering an answer) a touch is not taken at all (`enabled` false).
 */
export function useTapMood(enabled: boolean): { tapMood: MascotMood | null; onTap: () => void } {
  const allowed = useRef(enabled)
  useEffect(() => {
    allowed.current = enabled
  }, [enabled])
  const [tracker] = useState(() => new TapTracker())
  const [tapMood, setTapMood] = useState<MascotMood | null>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const onTap = useCallback(() => {
    if (!allowed.current) return
    const tap = tracker.press(performance.now())
    if (!tap) return
    setTapMood(TAP_MOODS[tap.count % TAP_MOODS.length]!)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setTapMood(null), 1200)
  }, [tracker])
  return { tapMood, onTap }
}

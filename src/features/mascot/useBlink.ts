import { useEffect, useState } from 'react'
import { randomBetween } from '@/lib/random'

const BLINK_CLOSED_MS = 110
const DOUBLE_BLINK_CHANCE = 0.2

/**
 * Human-like blinking: irregular gaps of 2–5.5 s and an occasional double blink,
 * instead of a mechanical, evenly timed loop.
 */
export function useBlink(enabled: boolean): boolean {
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    if (!enabled) return undefined

    let timer: ReturnType<typeof setTimeout>
    const schedule = (delay: number) => {
      timer = setTimeout(blink, delay)
    }
    const blink = () => {
      setClosed(true)
      timer = setTimeout(() => {
        setClosed(false)
        const blinkAgain = Math.random() < DOUBLE_BLINK_CHANCE
        schedule(blinkAgain ? 180 : randomBetween(2000, 5500))
      }, BLINK_CLOSED_MS)
    }

    schedule(randomBetween(1200, 3500))
    return () => clearTimeout(timer)
  }, [enabled])

  return enabled && closed
}

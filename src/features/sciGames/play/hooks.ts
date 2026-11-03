import { useCallback, useEffect, useRef, useState } from 'react'
import { useSpeaker } from '@/services/audio/useSpeaker'

/** A finished game reports how many of how many it had, and how many on the first try. */
export type Finish = (total: number, firstTry: number) => void

/** The line under a game, read aloud on PRO and announced to screen readers. */
export function useLine() {
  const { sayText } = useSpeaker()
  const [line, setLine] = useState('')
  const say = useCallback(
    (text: string) => {
      setLine(text)
      void sayText(text)
    },
    [sayText],
  )
  return { line, say }
}

/** Timers that end with the game (leaving mid-game never fires a late step). */
export function useLater() {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => {
    const list = timers.current
    return () => list.forEach(clearTimeout)
  }, [])
  return useCallback((run: () => void, ms: number) => {
    timers.current.push(setTimeout(run, ms))
  }, [])
}

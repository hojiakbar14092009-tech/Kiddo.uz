import { useCallback, useEffect, useRef, useState } from 'react'
import { useSpeaker } from '@/services/audio/useSpeaker'
import { whenVoiceDone } from '@/services/audio/afterVoice'

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

/**
 * The next round (or the end): after at least `ms`, and only once the line just said
 * (praise, a kind hint) has been heard to the end – then a short quiet moment.
 */
export function useAfterSaid() {
  const cancels = useRef<(() => void)[]>([])
  useEffect(() => {
    const list = cancels.current
    return () => list.forEach((cancel) => cancel())
  }, [])
  return useCallback((run: () => void, ms: number) => {
    cancels.current.push(whenVoiceDone(run, ms))
  }, [])
}

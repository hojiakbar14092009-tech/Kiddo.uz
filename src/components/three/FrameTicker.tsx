import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

/**
 * For a canvas with `frameloop="demand"`: asks for a new frame `fps` times a
 * second while `active`. Driven by requestAnimationFrame, so it stops by itself
 * in a hidden tab, and it stops for good on unmount.
 */
export function FrameTicker({ fps, active }: { fps: number; active: boolean }) {
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    if (!active || fps <= 0) return undefined
    const interval = 1000 / fps
    let last = -Infinity
    let frame = 0
    const step = (time: number) => {
      // a millisecond of slack, so 60 Hz screens give an even 30
      if (time - last >= interval - 1) {
        last = time
        invalidate()
      }
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [active, fps, invalidate])

  return null
}
